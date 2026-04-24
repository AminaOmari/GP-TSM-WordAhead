import csv
import requests
import argparse
import time
import sys

def normalize_text(text):
    if not text:
        return ""
    # Remove dashes, spaces, and make everything lowercase (for N/A etc)
    return text.replace("-", "").replace(" ", "").lower()

def is_translation_match(expected, actual):
    if not expected or not actual:
        return False
    exp = expected.strip().lower()
    act = actual.strip().lower()
    return exp in act or act in exp

def is_root_match(expected, actual):
    if not expected or not actual:
        return False
    
    # Handle N/A / Loanword
    exp_norm = normalize_text(expected)
    act_norm = normalize_text(actual)
    
    if "n/a" in exp_norm or "loanword" in exp_norm:
        return "n/a" in act_norm or "loanword" in act_norm
        
    return exp_norm == act_norm

def run_validation(csv_path, base_url):
    print(f"=== Starting Translation & Morphology Validation ===")
    print(f"Target API: {base_url}/api/translate")
    print(f"Dataset: {csv_path}\n")
    
    total = 0
    translation_correct = 0
    root_correct = 0
    wiktionary_confirmed = 0
    gpt_only = 0
    
    failures = []

    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                word = row['word'].strip()
                context = row['context'].strip()
                exp_trans = row['expected_translation'].strip()
                exp_root = row['expected_root'].strip()
                
                total += 1
                
                payload = {
                    "word": word,
                    "context": context
                }
                
                try:
                    # Send request to API
                    start_time = time.time()
                    resp = requests.post(f"{base_url}/api/translate", json=payload, timeout=15)
                    resp.raise_for_status()
                    data = resp.json()
                    
                    act_trans = data.get('translation', '')
                    act_root = data.get('root', '')
                    root_source = data.get('root_source', 'AI')
                    
                    # Evaluate
                    t_match = is_translation_match(exp_trans, act_trans)
                    r_match = is_root_match(exp_root, act_root)
                    
                    if t_match:
                        translation_correct += 1
                    if r_match:
                        root_correct += 1
                        
                    if root_source == "Wiktionary":
                        wiktionary_confirmed += 1
                    else:
                        gpt_only += 1
                        
                    # Log failures
                    if not t_match or not r_match:
                        failures.append({
                            "word": word,
                            "context": context,
                            "expected_trans": exp_trans,
                            "actual_trans": act_trans,
                            "expected_root": exp_root,
                            "actual_root": act_root,
                            "t_match": t_match,
                            "r_match": r_match,
                            "source": root_source
                        })
                        print(f"❌ FAIL: '{word}' -> Trans: {act_trans} (Exp: {exp_trans}) | Root: {act_root} (Exp: {exp_root})")
                    else:
                        print(f"✅ PASS: '{word}' -> {act_trans} [{act_root}]")
                        
                except Exception as e:
                    print(f"⚠️ ERROR on word '{word}': {e}")
                    failures.append({"word": word, "error": str(e)})
                    
                # Small delay to avoid rate limiting
                time.sleep(0.5)
                
    except FileNotFoundError:
        print(f"Error: {csv_path} not found.")
        sys.exit(1)
        
    print("\n" + "="*50)
    print("  EMPIRICAL VALIDATION RESULTS")
    print("="*50)
    print(f"Total Words Tested: {total}")
    
    if total > 0:
        t_pct = (translation_correct / total) * 100
        r_pct = (root_correct / total) * 100
        print(f"Translation Accuracy: {t_pct:.1f}% ({translation_correct}/{total})")
        print(f"Root Extraction Accuracy: {r_pct:.1f}% ({root_correct}/{total})")
        
        print(f"\nRoot Sources:")
        print(f"  - Confirmed by Wiktionary: {wiktionary_confirmed}")
        print(f"  - GPT Fallback only: {gpt_only}")
        
    print("\nDetailed Failures:")
    for f in failures:
        if "error" in f:
            continue
        issues = []
        if not f['t_match']: issues.append("TRANSLATION")
        if not f['r_match']: issues.append("ROOT")
        
        print(f"- '{f['word']}' in context: '{f['context']}'")
        print(f"  Issue: {' & '.join(issues)}")
        print(f"  Expected: {f['expected_trans']} [{f['expected_root']}]")
        print(f"  Actual:   {f['actual_trans']} [{f['actual_root']}] (Source: {f['source']})\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate WordAhead Translation and Morphology")
    parser.add_argument("--url", default="http://localhost:5000", help="Base URL of the API")
    parser.add_argument("--csv", default="translation_test_set.csv", help="Path to test CSV")
    
    args = parser.parse_args()
    
    # Clean trailing slash if present
    base_url = args.url.rstrip('/')
    
    run_validation(args.csv, base_url)
