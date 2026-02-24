import sys
import os
import traceback
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

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load API Key from environment variable
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

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

def analyze_importance(l0, l1, l2, l3, l4):
    l0_lst = l0.split()
    l1_lst = l1.split() if l1 else []
    l2_lst = l2.split() if l2 else []
    l3_lst = l3.split() if l3 else []
    l4_lst = l4.split() if l4 else []
    
    p1 = 0; p2 = 0; p3 = 0; p4 = 0
    tokens = []
    
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
        # Clean up empty lines
        paragraphs = [p for p in raw_text.split('\n') if len(p.strip()) > 0]
        
        all_tokens = []
        
        for p in paragraphs:
            print(f"Processing paragraph: {p[:30]}...")
            
            # The algorithm is expensive, so it might timeout?
            # Also it uses OpenAI.
            
            # Use default system message or None
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
    
    prompt = f"""
    Translate the English word "{req.word}" to Hebrew (Ivrit).
    Also provide:
    1. The Hebrew Root (Shoresh/שורש) of the HEBREW translation.
    2. An example sentence in English with Hebrew translation.
    
    Output JSON format:
    {{
        "translation": "...",
        "root": "...",
        "example": "..."
    }}
    Context: {req.context}
    """
    
    try:
        completion = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            response_format={ "type": "json_object" }
        )
        content = completion.choices[0].message.content
        import json
        return json.loads(content)
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
