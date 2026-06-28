import sys
import os
import traceback
import gc
import re
from typing import List, Dict, Any, Optional
import cefr
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn

# Add GP-TSM and Qualtrics Sync to path
# We use absolute path to be sure
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # .../backend
PROJECT_ROOT = os.path.dirname(BASE_DIR)              # .../gp_tsm_project
GP_TSM_DIR = os.path.join(PROJECT_ROOT, 'GP-TSM')
QUALTRICS_SYNC_DIR = os.path.join(PROJECT_ROOT, 'qualtrics-sync-analysis-main')

if GP_TSM_DIR not in sys.path:
    sys.path.append(GP_TSM_DIR)
if QUALTRICS_SYNC_DIR not in sys.path:
    sys.path.append(QUALTRICS_SYNC_DIR)

# Switch CWD to GP-TSM directory to satisfy its local file writing (shortened_responses.json)
# This is a bit of a hack but safer for that codebase.
# Or we can just ensure we have write permissions in backend's CWD.
# GP-TSM writes to "shortened_responses.json" in CWD.
# Let's run from PROJECT_ROOT (as configured in start.sh).

print(f"DEBUG: sys.path is {sys.path}")
print(f"DEBUG: CWD is {os.getcwd()}")

# Import GP-TSM modules after setting path
try:
    import llm
    print("DEBUG: Successfully imported llm")
except Exception as e:
    print(f"CRITICAL ERROR: Failed to import llm: {e}")
    traceback.print_exc()

# Initialize SQLite database
from database import init_db, get_db_connection, DB_PATH
try:
    init_db()
except Exception as e:
    print(f"⚠️ Failed to initialize database: {e}")

# Import decoupled experiment texts and pairings
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
from EXPERIMENT_TEXTS_block import EXPERIMENT_TEXTS, PAIRS

# Configure pilot Prolific PIDs
PILOT_PIDS_RAW = os.getenv("PILOT_PIDS", "00")
PILOT_PIDS = [pid.strip() for pid in PILOT_PIDS_RAW.split(",") if pid.strip()]

app = FastAPI()

def clean_rtf(text: str) -> str:
    """Basic RTF stripping if text starts with {\\rtf1."""
    if not text.strip().startswith("{\\rtf1"):
        return text
    
    # Remove control words and their parameters
    pattern = re.compile(r"\\([a-z]{1,32})(-?\d{1,10})?[ ]?|\\'([0-9a-f]{2})|\\([^a-z])|[{}]", re.IGNORECASE)
    
    def replace(match):
        if match.group(3):
            return chr(int(match.group(3), 16))
        return ""

    out = pattern.sub(replace, text)
    # Clean up whitespace
    out = " ".join(out.split())
    return out.strip()

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load API Key from environment variable
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()
if OPENAI_API_KEY:
    print(f"DEBUG: API Key loaded (Length: {len(OPENAI_API_KEY)}, Starts with: {OPENAI_API_KEY[:12]}...)")
else:
    print("WARNING: OPENAI_API_KEY is missing from environment variables!")

class AnalyzeRequest(BaseModel):
    text: str
    user_level: str

class TranslateRequest(BaseModel):
    word: str
    context: str = ""

class TrackClickRequest(BaseModel):
    user_id: str = "default"
    user_level: str
    word_level: str

CEFR_MAPPING = {"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 6}
REVERSE_CEFR_MAPPING = {1: "A1", 2: "A2", 3: "B1", 4: "B2", 5: "C1", 6: "C2"}

class LevelManager:
    """
    Manages dynamic user reading levels using a Weighted Penalty Formula based on Guttman Scaling.
    Aligns with Laufer (2010) regarding lexical thresholds.
    """
    def __init__(self, base_penalty: float = 0.1, threshold: float = 1.0):
        self.base_penalty = base_penalty
        self.threshold = threshold
        self.user_penalties = {}

    def get_accumulated_penalty(self, user_id: str) -> float:
        return self.user_penalties.get(user_id, 0.0)

    def process_click(self, user_id: str, user_level: int, word_level: int) -> dict:
        distance = max(0, user_level - word_level)
        adjustment = self.base_penalty * ((1 + distance) ** 2)
        
        current_penalty = self.get_accumulated_penalty(user_id)
        new_penalty = current_penalty + adjustment
        
        level_changed = False
        new_level = user_level
        
        if new_penalty >= self.threshold:
            if new_level > 1:
                new_level -= 1
                level_changed = True
            new_penalty = 0.0
            
        self.user_penalties[user_id] = new_penalty
        
        return {
            "accumulated_penalty": round(new_penalty, 3),
            "user_level": new_level,
            "level_changed": level_changed
        }

level_manager = LevelManager()

def is_equal(w1, w2):
    punc = ['.', ',', ':', '?', '!', ';', '"', '(', ')']
    tmp1 = w1
    tmp2 = w2
    if len(w1) > 0 and w1[-1] in punc:
        tmp1 = w1[:-1]
    if len(w2) > 0 and w2[-1] in punc:
        tmp2 = w2[:-1]
    return (tmp1.lower() == tmp2.lower())

def analyze_importance(l0, l1, l2, l3, l4):
    l0_lst = l0.split()
    l1_lst = l1.split() if l1 else []
    l2_lst = l2.split() if l2 else []
    l3_lst = l3.split() if l3 else []
    l4_lst = l4.split() if l4 else []
    
    tokens = []
    p1, p2, p3, p4 = 0, 0, 0, 0
    
    for w in l0_lst:
        importance = 0
        matched_l1 = p1 < len(l1_lst) and is_equal(w, l1_lst[p1])
        
        if not matched_l1:
            importance = 0
        else:
            p1 += 1
            if p4 < len(l4_lst) and is_equal(w, l4_lst[p4]):
                p4 += 1
                p3 += 1
                p2 += 1
                importance = 4
            elif p3 < len(l3_lst) and is_equal(w, l3_lst[p3]):
                p3 += 1
                p2 += 1
                importance = 3
            elif p2 < len(l2_lst) and is_equal(w, l2_lst[p2]):
                p2 += 1
                importance = 2
            else:
                importance = 1
        
        tokens.append({"text": w, "importance": importance})
        
    return tokens

@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    print(f"Received analyze request. Text length: {len(req.text)}")
    if not OPENAI_API_KEY:
        print("Error: OpenAI API Key not configured in environment")
        raise HTTPException(status_code=500, detail="Server API Key not configured")

    try:
        # Validate logic first
        # llm.get_shortened_paragraph needs system_message?
        # llm.py line 164: def get_shortened_paragraph(..., system_message: str = None)
        # We should provide the system message from llm if needed, or None creates default.
        # But wait, llm.py has `UK_LAW_SYSTEM_MESSAGE`.
        # The prompt uses string formatting `${paragraph}`.
        raw_text = req.text
        text = clean_rtf(raw_text)
    
        if not text.strip():
            raise HTTPException(status_code=400, detail="Text is empty after cleaning")
            
        set_user_level = req.user_level
        
        set_loading = True
        # Clean up empty lines
        paragraphs = [p.strip() for p in text.split('\n') if p.strip()]
        
        all_tokens = []
        
        for p in paragraphs:
            print(f"Processing paragraph: {p[:30]}...")
            
            # Using the original GP-TSM layered output
            gp_res = llm.get_shortened_paragraph(p, k=OPENAI_API_KEY)
            
            if not gp_res:
                print("Warning: GP-TSM returned empty result")
                continue

            for item in gp_res:
                l0 = item.get('0', '')
                l1 = item.get('1', '')
                l2 = item.get('2', '')
                l3 = item.get('3', '')
                l4 = item.get('4', '')
                
                tokens = analyze_importance(l0, l1, l2, l3, l4)
                
                clean_punc = ['.', ',', ':', '?', '!', ';', '"', '(', ')']
                filtered_tokens = []
                for t in tokens:
                    word = t['text']
                    
                    # Remove purely symbolic/gibberish tokens if they are not important
                    if not re.search(r'\w', word) and t['importance'] <= 1:
                        continue
                        
                    clean_word = word
                    if len(clean_word) > 1 and clean_word[-1] in clean_punc:
                        clean_word = clean_word[:-1]
                    if len(clean_word) > 1 and clean_word[0] in clean_punc:
                        clean_word = clean_word[1:]
                        
                    t['cefr'] = cefr.get_cefr_level(clean_word)
                    t['isDifficult'] = cefr.is_difficult(t['cefr'], req.user_level)
                    filtered_tokens.append(t)
                
                all_tokens.extend(filtered_tokens)
                all_tokens.append({"text": "\n", "importance": -1, "cefr": ""})

        print("Analysis complete successfully")
        
        # Save to SQLite Database History (Deduplicated on raw_text)
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            preview = text[:100] + "..." if len(text) > 100 else text
            total_words = len([t for t in all_tokens if t.get('text') != '\n'])
            difficult_words = len([t for t in all_tokens if t.get('isDifficult')])
            skimmed_words = len([t for t in all_tokens if t.get('text') != '\n' and t.get('importance', 0) >= 3])
            skimmed_difficult_words = len([t for t in all_tokens if t.get('text') != '\n' and t.get('importance', 0) >= 3 and t.get('isDifficult')])

            import json
            analysis_results_json = json.dumps(all_tokens)

            # Check if this exact text already exists in history
            cursor.execute("SELECT id FROM text_analyses WHERE raw_text = ?", (text,))
            existing = cursor.fetchone()

            if existing:
                # Update existing record and bump its timestamp to move it to the top
                cursor.execute("""
                    UPDATE text_analyses 
                    SET text_preview = ?, user_level = ?, total_words = ?, difficult_words = ?, skimmed_words = ?, skimmed_difficult_words = ?, analysis_results = ?, created_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (preview, req.user_level, total_words, difficult_words, skimmed_words, skimmed_difficult_words, analysis_results_json, existing[0]))
                print(f"🔄 Existing record updated and bumped in history (ID: {existing[0]})")
            else:
                # Insert a new record
                cursor.execute("""
                    INSERT INTO text_analyses (text_preview, raw_text, user_level, total_words, difficult_words, skimmed_words, skimmed_difficult_words, analysis_results)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (preview, text, req.user_level, total_words, difficult_words, skimmed_words, skimmed_difficult_words, analysis_results_json))
                print("✅ New analysis saved to SQLite history.")

            conn.commit()
            conn.close()
        except Exception as db_err:
            print(f"⚠️ Error saving to database: {db_err}")

        # Trigger garbage collection to clear RAM on tight Render instances
        gc.collect()
        
        return {"tokens": all_tokens}

    except Exception as e:
        traceback.print_exc()
        # Return the actual error to frontend
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
async def get_history():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, text_preview, raw_text, user_level, total_words, difficult_words, skimmed_words, skimmed_difficult_words, analysis_results, created_at FROM text_analyses ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/db-status")
async def get_db_status():
    status = {
        "db_path": DB_PATH,
        "exists": os.path.exists(DB_PATH),
        "data_dir_exists": os.path.exists("/data"),
        "data_dir_writable": os.access("/data", os.W_OK) if os.path.exists("/data") else False,
    }
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        status["tables"] = tables
        status["connection"] = "success"
        conn.close()
    except Exception as e:
        status["connection"] = "failed"
        status["error"] = str(e)
    return status

@app.delete("/api/history/{entry_id}")
async def delete_history(entry_id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM text_analyses WHERE id = ?", (entry_id,))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

import httpx

async def lookup_root_wiktionary(hebrew_word: str) -> str | None:
    """
    Query English Wiktionary for the Hebrew root of a word.
    Uses the MediaWiki API to fetch the raw wikitext, then extracts
    the he-rootbox template which contains the official root.
    Returns the root as 'X-Y-Z' or 'X-Y-Z-W' string, or None if not found.
    """
    # Clean the word — remove nikkud and whitespace
    clean = re.sub(r'[\u0591-\u05C7\s]', '', hebrew_word).strip()
    if not clean:
        return None

    url = "https://en.wiktionary.org/w/api.php"
    params = {
        "action": "query",
        "titles": clean,
        "prop": "revisions",
        "rvprop": "content",
        "rvslots": "main",
        "format": "json",
        "formatversion": "2"
    }

    try:
        headers = {"User-Agent": "WordAhead/1.0 (https://github.com/AminaOmari/GP-TSM-WordAhead)"}
        async with httpx.AsyncClient(timeout=5.0, headers=headers) as client:
            resp = await client.get(url, params=params)
            data = resp.json()

        pages = data.get("query", {}).get("pages", [])
        if not pages or pages[0].get("missing"):
            return None

        content = pages[0].get("revisions", [{}])[0].get("slots", {}).get("main", {}).get("content", "")

        # Look for Hebrew section
        if "==Hebrew==" not in content:
            return None

        # Extract he-rootbox template: {{he-rootbox|א־ב־ג}} or {{he-rootbox|א|ב|ג}}
        rootbox_match = re.search(r'\{\{he-rootbox\|([^}]+)\}\}', content)
        if not rootbox_match:
            return None

        raw = rootbox_match.group(1)

        # Format can be "א־ב־ג" (already with dashes) or "א|ב|ג" (pipe-separated)
        if '|' in raw:
            letters = [l.strip() for l in raw.split('|') if l.strip()]
        else:
            # Remove the Hebrew maqaf separator ־ and split into chars
            letters = [c for c in raw if c.strip() and c != '־']

        if len(letters) >= 2:
            return '-'.join(letters)

        return None

    except Exception as e:
        print(f"Wiktionary lookup failed for '{clean}': {e}")
        return None

def extract_best_context(word: str, context: str) -> str:
    """Extract the sentence from context that contains the word."""
    sentences = re.split(r'(?<=[.!?])\s+', context)
    for sentence in sentences:
        if word.lower() in sentence.lower():
            return sentence.strip()
    # Fallback: return first 200 chars
    return context[:200]

@app.post("/api/translate")
async def translate(req: TranslateRequest):
    if not OPENAI_API_KEY:
        # Provide a mock translation for local testing/verification when API key is missing
        return {
            "analysis": f"Simulated translation analysis for '{req.word}' in context '{req.context}'",
            "translation": f"[תרגום: {req.word}]",
            "transliteration": f"translit-{req.word}",
            "part_of_speech": "noun",
            "root": "מ-ו-ק",
            "root_meaning": "mock translation",
            "example": f"The word {req.word} is used here. [המילה {req.word} משמשת כאן.]",
            "confidence": "High",
            "root_source": "Mock"
        }
        
    client = OpenAI(api_key=OPENAI_API_KEY)
    
    best_context = extract_best_context(req.word, req.context)
    
    # Professional prompt with Self-Correction / Reflection step
    prompt = f"""
    You are a world-class Hebrew Lexicographer, Morphologist, and English Language Teacher.

    TASK:
    Analyze the English word "{req.word}" as it is used in this exact context:
    "{best_context}"

    STEP-BY-STEP REASONING (MANDATORY — do this before writing any output):

    1. CONTEXTUAL TRANSLATION
       - What is the precise meaning of "{req.word}" in this specific sentence?
       - Translate it to Hebrew accordingly. Do NOT translate the word in isolation.
       - If the word has multiple meanings, pick the one that fits this context.

    2. PART OF SPEECH
       - Identify: noun / verb / adjective / adverb / other.
       - Note the tense or form if it is a verb (e.g., past tense, present participle).

    3. SHORESH (ROOT) DETECTION
       - Identify the Hebrew root of your translation. Most roots are triliteral (3 letters), but some are quadriliteral (4 letters, e.g. ע-ר-ע-ר for ערעור, ת-ר-ג-ם for תרגום).
       - RULE: Strip all prefixes (מ, ת, נ, י, ל, ב, ה, ו, כ, ש) and suffixes (ים, ות, ה, תי, נו) before deciding the root.
       - RULE: If the same letter appears twice in a pattern like X-Y-X-Y or X-X-Y, this is likely a quadriliteral root — do NOT reduce it to 3 letters.
       - EXAMPLES of quadriliteral roots: ע-ר-ע-ר (ערעור), ת-ר-ג-ם (תרגם), צ-ל-צ-ל (צלצל), ג-מ-ג-מ (גמגם).
       - If the word is a loanword or has no Semitic root (e.g., "television" → טלוויזיה), write "N/A — loanword".
       - If the root is uncertain, say so and explain why.

    4. EXAMPLE SENTENCE
       - Write ONE clear, natural English example sentence using "{req.word}" in a similar context to the one provided.
       - The sentence should help a language learner remember the word's meaning.
       - Then provide its Hebrew translation in brackets.

    5. SELF-VERIFICATION
       - Re-read your translation. Does it sound natural in Hebrew for this context?
       - Re-check the root. Are you confident no prefix was mistaken for a root letter?
       - Assign confidence: High (certain), Medium (likely correct), Low (uncertain or loanword).

    OUTPUT FORMAT:
    Respond ONLY with a valid JSON object, no markdown, no explanation outside the JSON:
    {{
        "analysis": "Your full step-by-step morphological reasoning including self-verification.",
        "translation": "The Hebrew word or phrase",
        "transliteration": "Pronunciation in English letters (e.g., 'shalom')",
        "part_of_speech": "noun / verb / adjective / adverb / other",
        "root": "X-Y-Z or X-Y-Z-W for quadriliteral roots (with dashes) or 'N/A — loanword' or 'Uncertain — [reason]'",
        "root_meaning": "The core meaning conveyed by this root in Hebrew (e.g., 'giving/contributing')",
        "example": "English sentence using the word. [Hebrew translation of the sentence]",
        "confidence": "High / Medium / Low"
    }}
    """
    
    try:
        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a professional Hebrew Morphologist. You strictly follow the rules of the Academy of the Hebrew Language. You always double-check your own work for 'prefix-root' confusion."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2
        )
        content = completion.choices[0].message.content
        import json
        from morphology import verify_root, is_loanword_root
        
        result = json.loads(content)

        # Add fallbacks for existing caches or missing fields
        result["transliteration"] = result.get("transliteration", "")
        result["root_meaning"] = result.get("root_meaning", "")
        result["part_of_speech"] = result.get("part_of_speech", "")
        result["confidence"] = result.get("confidence", "Medium")
        result["root_source"] = result.get("root_source", "AI")
        
        # Guard rails: Verify the root if it's not N/A
        if result.get("root") and not is_loanword_root(result["root"]):
            # First: try to get the authoritative root from Wiktionary
            wiki_root = await lookup_root_wiktionary(result["translation"])
            if wiki_root:
                print(f"✅ Wiktionary confirmed root: {wiki_root} (GPT had: {result['root']})")
                result["root"] = wiki_root
                result["root_source"] = "Wiktionary"
            else:
                # Wiktionary doesn't have it — fall back to GPT + local verification
                result["root"] = verify_root(result["root"], result["translation"])
                result["root_source"] = "AI"
                print(f"⚠️ Wiktionary miss — using GPT root: {result['root']}")
            
        print(f"Translation logic complete: {result.get('root')} (Confidence: {result.get('confidence')})")
        return result
    except Exception as e:
        return {"min_error": str(e)}

@app.post("/api/track_click")
async def track_click(req: TrackClickRequest):
    u_level = CEFR_MAPPING.get(req.user_level.upper())
    w_level = CEFR_MAPPING.get(req.word_level.upper())
    
    if not u_level or not w_level:
        return {"error": "Invalid CEFR level"}
        
    res = level_manager.process_click(req.user_id, u_level, w_level)
    res["user_level_str"] = REVERSE_CEFR_MAPPING.get(res["user_level"], req.user_level)
    return res

# --- Experiment Models & Data ---

class AssignRequest(BaseModel):
    prolific_pid: str
    lextale_score: float

class LogEventRequest(BaseModel):
    session_id: str
    event_type: str
    payload: Dict[str, Any]

class SurveySubmissionRequest(BaseModel):
    prolific_pid: str
    survey_type: str
    condition: Optional[str] = None
    text_id: Optional[str] = None
    sequence_position: Optional[int] = None
    responses: Dict[str, int]
    open_text_responses: Dict[str, str] = {}
    ranking: Dict[str, str] = {}

class SurveyPayload(BaseModel):
    per_task_1: Dict[str, Any]
    per_task_2: Dict[str, Any]
    post_study: Dict[str, Any]
    demographics: Dict[str, Any]

class ReadingPayload(BaseModel):
    text_id: str
    condition: str
    reading_time_ms: int
    hover_events: List[Dict[str, Any]]
    click_events: List[Dict[str, Any]]
    click_count: int
    unique_words_translated: int
    comprehension: List[Dict[str, Any]]

class SubmitRequest(BaseModel):
    prolific_pid: str
    lextale_score: float
    cefr_level: str
    text_format: str
    sequence: str
    text_pair: str
    readings: List[ReadingPayload]
    surveys: SurveyPayload

# =====================================================================
# EXPERIMENT TEXTS CONFIGURATION
# Decoupled experiment texts and pairs are imported from EXPERIMENT_TEXTS_block.py
# =====================================================================

# --- Experiment Endpoints ---

@app.post("/api/experiment/assign")
async def experiment_assign(req: AssignRequest):
    import random
    import json
    prolific_pid = req.prolific_pid.strip()
    if not prolific_pid:
        raise HTTPException(status_code=400, detail="Prolific PID cannot be empty")
        
    is_pilot = prolific_pid in PILOT_PIDS
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Check if participant already assigned (skip for reusable pilot PIDs)
    if not is_pilot:
        cursor.execute("SELECT * FROM experiment_participants WHERE prolific_pid = ?", (prolific_pid,))
        existing = cursor.fetchone()
        if existing:
            conn.close()
            return {
                "prolific_pid": existing["prolific_pid"],
                "lextale_score": existing["lextale_score"],
                "cefr_level": existing["cefr_level"],
                "text_format": existing["text_format"],
                "sequence": existing["sequence"],
                "text_pair": existing["text_pair"],
                "text_order": json.loads(existing["text_order"]),
                "is_pilot": bool(existing.get("is_pilot", False))
            }
    else:
        # Reusable pilot ID: clear database records for this pilot PID to run fresh
        cursor.execute("DELETE FROM experiment_participants WHERE prolific_pid = ?", (prolific_pid,))
        cursor.execute("DELETE FROM participant_meta WHERE prolific_pid = ?", (prolific_pid,))
        cursor.execute("DELETE FROM survey_responses WHERE prolific_pid = ?", (prolific_pid,))
        cursor.execute("DELETE FROM experiment_events WHERE prolific_pid = ?", (prolific_pid,))
        conn.commit()
    
    # 2. Determine CEFR level based on approved thresholds
    # Aligned to Lemhöfer & Broersma (2012) Table 9:
    # - score < 60        -> B1
    # - 60 <= score <= 80 -> B2
    # - score > 80        -> exclude (C1/C2)
    # Note: exactly-80 is treated as B2 (the table lists 80 at the B2/C1-C2 boundary;
    # this keeps the participant eligible) pending final confirmation from the supervisor.
    score = req.lextale_score
    if score > 80.0:
        if is_pilot:
            cefr_level = "B2"
        else:
            cefr_level = "exclude"
    elif score < 60.0:
        cefr_level = "B1"
    else:
        cefr_level = "B2"
        
    # If excluded, save to DB and return early (unless it's a pilot session)
    if cefr_level == "exclude" and not is_pilot:
        cursor.execute("""
            INSERT INTO experiment_participants (prolific_pid, lextale_score, cefr_level, text_format, sequence, text_pair, text_order, is_pilot)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (prolific_pid, score, cefr_level, "", "", "", json.dumps([]), int(is_pilot)))
        conn.commit()
        conn.close()
        return {
            "prolific_pid": prolific_pid,
            "lextale_score": score,
            "cefr_level": cefr_level,
            "text_format": "",
            "sequence": "",
            "text_pair": "",
            "text_order": [],
            "is_pilot": is_pilot
        }
        
    # 3. Random counterbalanced assignment using new decoupled schema
    text_format = random.choice(["TF", "TS"])
    sequence = random.choice(["A", "B"])
    
    if cefr_level == "B1":
        available_pairs = [k for k, v in PAIRS.items() if v.get("level") == "B1"]
        text_pair = random.choice(available_pairs) if available_pairs else "b1_pair1"
    else:
        available_pairs = [k for k, v in PAIRS.items() if v.get("level") == "B2"]
        text_pair = random.choice(available_pairs) if available_pairs else "b2_pair1"
        
    pair_data = PAIRS.get(text_pair)
    format_key = "detailed" if text_format == "TF" else "skimmed"
    selected_pair = pair_data.get(format_key)
    
    # Counterbalance text presentation order
    if random.choice([True, False]):
        text_order = [selected_pair[0], selected_pair[1]]
    else:
        text_order = [selected_pair[1], selected_pair[0]]
        
    cursor.execute("""
        INSERT INTO experiment_participants (prolific_pid, lextale_score, cefr_level, text_format, sequence, text_pair, text_order, is_pilot)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (prolific_pid, score, cefr_level, text_format, sequence, text_pair, json.dumps(text_order), int(is_pilot)))
    conn.commit()
    conn.close()
    
    return {
        "prolific_pid": prolific_pid,
        "lextale_score": score,
        "cefr_level": cefr_level,
        "text_format": text_format,
        "sequence": sequence,
        "text_pair": text_pair,
        "text_order": text_order,
        "is_pilot": is_pilot
    }

@app.get("/api/experiment/session/{prolific_pid}")
async def get_experiment_session(prolific_pid: str):
    import json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM experiment_participants WHERE prolific_pid = ?", (prolific_pid.strip(),))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Participant session not found")
        
    cefr_level = row["cefr_level"]
    is_pilot = bool(row["is_pilot"])
    
    # Excluded participants (who are not pilots) do not get texts
    if cefr_level == "exclude" and not is_pilot:
        return {
            "assignment": {
                "prolific_pid": row["prolific_pid"],
                "lextale_score": row["lextale_score"],
                "cefr_level": cefr_level,
                "text_format": "",
                "sequence": "",
                "text_pair": "",
                "text_order": [],
                "is_pilot": is_pilot
            },
            "texts": {}
        }
        
    text_order = json.loads(row["text_order"])
    text_format = row["text_format"]
    
    # If a pilot got excluded but falls through, we need to assign default format if empty
    if not text_format:
        text_format = "TF"
    if not text_order:
        text_order = ["b2p1_plasticbags", "b2p1_santiago_detailed"] # Default backup for pilot exclusion
    
    texts = {}
    for text_id in text_order:
        if text_id in EXPERIMENT_TEXTS:
            t_data = EXPERIMENT_TEXTS[text_id]
            texts[text_id] = {
                "title": t_data["title"],
                "text": t_data["body"],
                "mcqs": t_data["mcqs"]
            }
            
    return {
        "assignment": {
            "prolific_pid": row["prolific_pid"],
            "lextale_score": row["lextale_score"],
            "cefr_level": row["cefr_level"],
            "text_format": text_format,
            "sequence": row["sequence"] if row["sequence"] else "A",
            "text_pair": row["text_pair"] if row["text_pair"] else "pair_3",
            "text_order": text_order,
            "is_pilot": is_pilot
        },
        "texts": texts
    }

@app.post("/api/experiment/log_event")
async def log_event(req: LogEventRequest):
    import json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO experiment_events (prolific_pid, event_type, payload)
        VALUES (?, ?, ?)
    """, (req.session_id.strip(), req.event_type, json.dumps(req.payload)))
    conn.commit()
    conn.close()
    return {"success": True}
@app.post("/api/survey")
async def submit_survey(req: SurveySubmissionRequest):
    import json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO survey_responses (prolific_pid, survey_type, condition, text_id, sequence_position, responses, open_text_responses, ranking)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (req.prolific_pid.strip(), req.survey_type, req.condition, req.text_id, req.sequence_position, json.dumps(req.responses), json.dumps(req.open_text_responses), json.dumps(req.ranking)))
    conn.commit()
    conn.close()
    return {"success": True}

@app.post("/api/experiment/submit")
async def experiment_submit(req: SubmitRequest):
    import json
    import csv
    

    import json
    import csv
    import codecs
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    payload_data = req.dict()
    
    # Extract Demographics
    demo = payload_data.get("surveys", {}).get("demographics", {})
    ac_early = demo.get("ac_early", "")
    
    # Construct readings
    reading1 = payload_data["readings"][0] if len(payload_data["readings"]) > 0 else {}
    reading2 = payload_data["readings"][1] if len(payload_data["readings"]) > 1 else {}

    # Extract alertness items from quizzes
    r1_comp = reading1.get("comprehension", [])
    q1_alert = next((item for item in r1_comp if item.get("is_alertness") or item.get("question_id") == "alertness_1"), None)
    quiz1_attention_raw = str(q1_alert.get("selected", "")) if q1_alert else ""
    quiz1_attention_pass = bool(q1_alert.get("correct", False)) if q1_alert else False

    r2_comp = reading2.get("comprehension", [])
    q2_alert = next((item for item in r2_comp if item.get("is_alertness") or item.get("question_id") == "alertness_2"), None)
    quiz2_attention_raw = str(q2_alert.get("selected", "")) if q2_alert else ""
    quiz2_attention_pass = bool(q2_alert.get("correct", False)) if q2_alert else False

    # Exclude alertness check from comprehension scores
    r1_real_mcqs = [item for item in r1_comp if not item.get("is_alertness") and item.get("question_id") not in ["alertness_1", "alertness_2"]]
    r1_correct = sum(1 for item in r1_real_mcqs if item.get("correct") is True)
    trial1_comprehension_score = r1_correct / 5.0

    r2_real_mcqs = [item for item in r2_comp if not item.get("is_alertness") and item.get("question_id") not in ["alertness_1", "alertness_2"]]
    r2_correct = sum(1 for item in r2_real_mcqs if item.get("correct") is True)
    trial2_comprehension_score = r2_correct / 5.0

    is_pilot = req.prolific_pid.strip() in PILOT_PIDS
    
    # Insert participant_meta
    cursor.execute("""
        INSERT OR REPLACE INTO participant_meta (
            prolific_pid, age, gender, native_language,
            years_studying_english, education, self_rated_english,
            frequency_academic_english, use_translation_tools, translation_tools_used,
            ac_early, quiz1_attention_raw, quiz1_attention_pass, quiz2_attention_raw, quiz2_attention_pass, is_pilot, consent_timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        req.prolific_pid.strip(), demo.get("age"), demo.get("gender"), demo.get("native_language"),
        demo.get("years_studying_english"), demo.get("education"), demo.get("self_rated_english"),
        demo.get("frequency_academic_english"), demo.get("use_translation_tools"), demo.get("translation_tools_used"),
        ac_early, quiz1_attention_raw, int(quiz1_attention_pass), quiz2_attention_raw, int(quiz2_attention_pass), int(is_pilot),
        demo.get("consent_timestamp", "")
    ))

    # Log final submission
    cursor.execute("""
        INSERT INTO experiment_events (prolific_pid, event_type, payload)
        VALUES (?, ?, ?)
    """, (req.prolific_pid.strip(), "final_submission", json.dumps(payload_data)))
    
    conn.commit()
    conn.close()
    
    # Construct CSV payload
    r1_hover_events = reading1.get("hover_events", [])
    r1_hover_count = len(r1_hover_events)
    r1_dwell_ms = sum(int(e.get("dwell_ms", 0)) for e in r1_hover_events if isinstance(e, dict))

    r2_hover_events = reading2.get("hover_events", [])
    r2_hover_count = len(r2_hover_events)
    r2_dwell_ms = sum(int(e.get("dwell_ms", 0)) for e in r2_hover_events if isinstance(e, dict))

    headers = [
        "prolific_pid", "lextale_score", "cefr_level", "text_format", "sequence", "text_pair",
        "trial1_text_id", "trial1_condition", "trial1_time_ms", "trial1_hovers", "trial1_clicks",
        "trial1_click_count", "trial1_unique_words_translated", "trial1_hover_count", "trial1_dwell_ms", "trial1_comprehension",
        "trial2_text_id", "trial2_condition", "trial2_time_ms", "trial2_hovers", "trial2_clicks",
        "trial2_click_count", "trial2_unique_words_translated", "trial2_hover_count", "trial2_dwell_ms", "trial2_comprehension",
        "survey_per_task_1", "survey_per_task_2", "survey_post_study", "survey_demographics",
        "is_pilot", "ac_early", "quiz1_attention_raw", "quiz1_attention_pass", "quiz2_attention_raw", "quiz2_attention_pass",
        "trial1_comprehension_score", "trial2_comprehension_score"
    ]
    
    row = [
        payload_data["prolific_pid"],
        payload_data["lextale_score"],
        payload_data["cefr_level"],
        payload_data["text_format"],
        payload_data["sequence"],
        payload_data["text_pair"],
        reading1.get("text_id", ""),
        reading1.get("condition", ""),
        reading1.get("reading_time_ms", 0),
        json.dumps(reading1.get("hover_events", [])),
        json.dumps(reading1.get("click_events", [])),
        reading1.get("click_count", 0),
        reading1.get("unique_words_translated", 0),
        r1_hover_count,
        r1_dwell_ms,
        json.dumps(reading1.get("comprehension", [])),
        reading2.get("text_id", ""),
        reading2.get("condition", ""),
        reading2.get("reading_time_ms", 0),
        json.dumps(reading2.get("hover_events", [])),
        json.dumps(reading2.get("click_events", [])),
        reading2.get("click_count", 0),
        reading2.get("unique_words_translated", 0),
        r2_hover_count,
        r2_dwell_ms,
        json.dumps(reading2.get("comprehension", [])),
        json.dumps(payload_data["surveys"]["per_task_1"]),
        json.dumps(payload_data["surveys"]["per_task_2"]),
        json.dumps(payload_data["surveys"]["post_study"]),
        json.dumps(payload_data["surveys"]["demographics"]),
        int(is_pilot),
        ac_early,
        quiz1_attention_raw,
        int(quiz1_attention_pass),
        quiz2_attention_raw,
        int(quiz2_attention_pass),
        trial1_comprehension_score,
        trial2_comprehension_score
    ]
    
    # Write to a temp CSV file in the backend folder (with BOM for Hebrew)
    temp_csv_path = os.path.join(BASE_DIR, f"temp_{req.prolific_pid}.csv")
    with open(temp_csv_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerow(row)

    # Save a permanent copy to the local qualtrics_responses.csv file
    try:
        exports_dir = os.path.join(PROJECT_ROOT, "data_exports")
        os.makedirs(exports_dir, exist_ok=True)
        qualtrics_csv_path = os.path.join(exports_dir, "qualtrics_responses.csv")
        file_exists = os.path.exists(qualtrics_csv_path) and os.path.getsize(qualtrics_csv_path) > 0
        
        with open(qualtrics_csv_path, "a" if file_exists else "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow(headers)
            writer.writerow(row)
        print(f"DEBUG: Saved copy of synced response locally to {qualtrics_csv_path}")
    except Exception as e:
        print(f"ERROR: Failed to save response to local CSV file: {e}")
    # 3. Trigger Qualtrics API Sync
    qualtrics_success = False
    error_message = None
    import_result = {}
    
    try:
        from src.config import Config
        from src.qualtrics_client import QualtricsClient
        
        sim_mode = not Config.is_live_configured()
        client = QualtricsClient(simulation_mode=sim_mode)
        import_result = client.import_responses(temp_csv_path)
        
        if import_result.get("success"):
            qualtrics_success = True
        else:
            error_message = import_result.get("error_text", "Qualtrics import failed")
    except Exception as e:
        error_message = str(e)
        print(f"Exception during Qualtrics sync: {e}")
    finally:
        # Delete the temp file
        if os.path.exists(temp_csv_path):
            os.remove(temp_csv_path)
            
    return {
        "success": True,
        "qualtrics_sync": {
            "success": qualtrics_success,
            "result": import_result,
            "error": error_message
        }
    }

# --- Frontend Serving Logic ---
def find_frontend_path():
    # 1. Try common locations
    possible_paths = [
        os.path.join(PROJECT_ROOT, "frontend", "dist"),
        os.path.join(PROJECT_ROOT, "dist"),
        os.path.join(os.getcwd(), "frontend", "dist"),
        os.path.join(os.getcwd(), "dist"),
    ]
    
    for p in possible_paths:
        if os.path.exists(p) and os.path.isdir(p):
            # Check if index.html exists in this folder
            if os.path.exists(os.path.join(p, "index.html")):
                print(f"DEBUG: Found valid frontend build at {p}")
                return p
    
    # 2. Fallback: Search for any 'dist' folder that contains index.html
    print("DEBUG: Standard paths failed. Searching for 'dist/index.html'...")
    for root, dirs, files in os.walk(PROJECT_ROOT):
        if "dist" in dirs:
            p = os.path.join(root, "dist")
            if os.path.exists(os.path.join(p, "index.html")):
                print(f"DEBUG: Discovered frontend build via search at {p}")
                return p
    return None

frontend_path = find_frontend_path()

if frontend_path:
    assets_path = os.path.join(frontend_path, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="static_assets")
        print(f"DEBUG: Mounted /assets from {assets_path}")
    else:
        print(f"WARNING: Assets folder not found at {assets_path}")
else:
    # Diagnostic: Print tree of /app to help fix paths
    print(f"CRITICAL: Frontend not found. CWD: {os.getcwd()}, PROJECT_ROOT: {PROJECT_ROOT}")
    try:
        # Use a simple listdir on root to see what's there
        print(f"Root contents: {os.listdir(PROJECT_ROOT)}")
        if os.path.exists(os.path.join(PROJECT_ROOT, "frontend")):
            print(f"Frontend folder contents: {os.listdir(os.path.join(PROJECT_ROOT, 'frontend'))}")
    except:
        pass

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # If it looks like an API call but wasn't caught, return 404
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
        
    if not frontend_path:
        # Try finding it again (maybe it was built after start? unlikely but safe)
        current_path = find_frontend_path()
        if not current_path:
            # Final diagnostic response
            debug_info = {
                "error": "Frontend build not found",
                "cwd": os.getcwd(),
                "project_root": PROJECT_ROOT,
                "suggestion": "Check build logs. Ensure 'npm run build' is creating 'frontend/dist'."
            }
            # List shallow directories for debugging
            try:
                debug_info["root_ls"] = os.listdir(PROJECT_ROOT)
                if "frontend" in debug_info["root_ls"]:
                    debug_info["frontend_ls"] = os.listdir(os.path.join(PROJECT_ROOT, "frontend"))
            except: pass
            return debug_info
        else:
            # Found it on second try! (Can happen in some dev setups)
            index_file = os.path.join(current_path, "index.html")
            return FileResponse(index_file)
        
    # Serve the requested file if it exists (e.g., favicon)
    if full_path and full_path != "/":
        requested_file = os.path.join(frontend_path, full_path)
        if os.path.exists(requested_file) and os.path.isfile(requested_file):
            return FileResponse(requested_file)
            
    index_file = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
        
    return {
        "error": "index.html not found in build folder",
        "path_checked": index_file,
        "folder_contents": os.listdir(frontend_path) if os.path.exists(frontend_path) else "Folder missing"
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
