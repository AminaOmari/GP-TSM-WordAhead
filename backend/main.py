import sys
import os
import traceback
import gc
import re
from typing import List, Dict, Any

# Add GP-TSM to path
# We use absolute path to be sure
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # .../backend
PROJECT_ROOT = os.path.dirname(BASE_DIR)              # .../gp_tsm_project
GP_TSM_DIR = os.path.join(PROJECT_ROOT, 'GP-TSM')

if GP_TSM_DIR not in sys.path:
    sys.path.append(GP_TSM_DIR)

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

import cefr
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

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

def is_equal(w1, w2):
    punc = ['.', ',', ':', '?', '!', ';', '"', '(', ')']
    tmp1 = w1
    tmp2 = w2
    if len(w1) > 0 and w1[-1] in punc:
        tmp1 = w1[:-1]
    if len(w2) > 0 and w2[-1] in punc:
        tmp2 = w2[:-1]
    return (tmp1.lower() == tmp2.lower())

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
                importance = 4
            elif p3 < len(l3_lst) and is_equal(w, l3_lst[p3]):
                p3 += 1
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
                for t in tokens:
                    word = t['text']
                    clean_word = word
                    if len(clean_word) > 1 and clean_word[-1] in clean_punc:
                        clean_word = clean_word[:-1]
                    if len(clean_word) > 1 and clean_word[0] in clean_punc:
                        clean_word = clean_word[1:]
                        
                    t['cefr'] = cefr.get_cefr_level(clean_word)
                    t['isDifficult'] = cefr.is_difficult(t['cefr'], req.user_level)
                
                all_tokens.extend(tokens)
                all_tokens.append({"text": "\n", "importance": -1, "cefr": ""})

        print("Analysis complete successfully")
        # Trigger garbage collection to clear RAM on tight Render instances
        gc.collect()
        
        return {"tokens": all_tokens}

    except Exception as e:
        traceback.print_exc()
        # Return the actual error to frontend
        raise HTTPException(status_code=500, detail=str(e))

import httpx

async def lookup_root_wiktionary(hebrew_word: str) -> str | None:
    """
    Query English Wiktionary for the Hebrew root of a word.
    Uses the MediaWiki API to fetch the raw wikitext, then extracts
    the he-rootbox template which contains the official root.
    Returns the root as 'X-Y-Z' string, or None if not found.
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
        raise HTTPException(status_code=500, detail="Server API Key not configured")
        
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
       - Identify the triliteral (3-letter) Hebrew root of your translation.
       - RULE: Strip all prefixes (מ, ת, נ, י, ל, ב, ה, ו, כ, ש) and suffixes (ים, ות, ה, תי, נו) before deciding the root.
       - CONFIRM by asking: do other Hebrew words with related meaning share these 3 letters?
         Example check: if root is ת-ר-מ → does תרומה, תרמתי also share this root? ✓
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
        "root": "X-Y-Z (with dashes) or 'N/A — loanword' or 'Uncertain — [reason]'",
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
        traceback.print_exc()
        return {"min_error": str(e)}

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
        
    index_file = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
        
    return {
        "error": "index.html not found in build folder",
        "path_checked": index_file,
        "folder_contents": os.listdir(frontend_path) if os.path.exists(frontend_path) else "Folder missing"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
