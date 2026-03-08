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

@app.post("/api/translate")
async def translate(req: TranslateRequest):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="Server API Key not configured")
        
    client = OpenAI(api_key=OPENAI_API_KEY)
    
    # We use a dual-stage prompt to force the AI to reason about morphology
    prompt = f"""
    You are an expert in Hebrew linguistics and morphology. Analyze the English word "{req.word}" in the following context: "{req.context}".
    
    TASK:
    1. Translate the word to its most natural Hebrew equivalent given the context.
    2. Extract the Triliteral Root (שורש) based on the standards of the Academy of the Hebrew Language.
    
    LINGUISTIC GUIDELINES:
    - Distinguish between a root and its pattern (Binyan/Mishkal).
    - Handle weak roots (Gezarot) correctly (e.g., if a 'נ', 'י', or 'ה' drops out or changes).
    - For loanwords with no Semitic root (e.g., 'אוניברסיטה', 'טלפון'), return "N/A".
    - Provide a morphological reasoning step.
    
    EXAMPLES:
    - Word: "guard", Context: "I guarded the door", Output Root: "ש-מ-ר", Translation: "שמרתי"
    - Word: "dress", Context: "She dressed quickly", Output Root: "ל-ב-ש", Translation: "התלבשה"
    - Word: "revolution", Context: "The Industrial Revolution", Output Root: "ה-פ-ך", Translation: "מהפכה" (Note: 'מ' is a prefix of the Mishkal pattern, not a root letter)
    - Word: "fall", Context: "I will fall tomorrow", Output Root: "נ-פ-ל", Translation: "אפול" (Note: the 'נ' is hidden in this form)
    - Word: "give", Context: "He gives a gift", Output Root: "נ-ת-ן", Translation: "נותן"
    
    Provide your response as a JSON object:
    {{
        "analysis": "Brief step-by-step morphological reasoning (explain the Binyan and how you found the root letters)",
        "translation": "The Hebrew word/phrase",
        "root": "X-Y-Z (formatted with dashes)",
        "example": "English sentence. [Hebrew translation]"
    }}
    """
    
    try:
        completion = client.chat.completions.create(
            model="gpt-4o", # Upgraded to full GPT-4o for better linguistic precision
            messages=[
                {"role": "system", "content": "You are a professional Hebrew Morphologist. You follow the strict rules of the Academy of the Hebrew Language (האקדמיה ללשון העברית)."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        content = completion.choices[0].message.content
        import json
        from morphology import verify_root
        
        result = json.loads(content)
        
        # Guard rails: Verify the root if it's not N/A
        if result.get("root") and result["root"] != "N/A":
            result["root"] = verify_root(result["root"], result["translation"])
            
        print(f"Translation logic complete: {result.get('root')}")
        return result
    except Exception as e:
        traceback.print_exc()
        return {"min_error": str(e)}

# --- Frontend Serving Logic ---
# Try to find the frontend dist folder in a few likely locations
possible_paths = [
    os.path.join(PROJECT_ROOT, "frontend", "dist"),
    os.path.join(PROJECT_ROOT, "dist"),
    "/opt/render/project/src/frontend/dist" # Common Render path
]

frontend_path = None
for p in possible_paths:
    if os.path.exists(p):
        frontend_path = p
        print(f"DEBUG: Found frontend build at {p}")
        break

if frontend_path:
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="static_assets")
else:
    print("WARNING: Frontend build folder 'dist' not found. SPA routes will fail.")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # If it looks like an API call but wasn't caught, return 404
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
        
    if not frontend_path:
        return {
            "error": "Frontend build not found",
            "cwd": os.getcwd(),
            "project_root": PROJECT_ROOT,
            "tried_paths": possible_paths,
            "suggestion": "Check Render build logs to see if 'npm run build' succeeded."
        }
        
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
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
