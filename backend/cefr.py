import os
import csv
from wordfreq import zipf_frequency

# Global cache to store the EFLLex dictionary in memory so it only loads once
_efllex_dict = None

def load_efllex_dictionary():
    global _efllex_dict
    if _efllex_dict is not None:
        return _efllex_dict
        
    _efllex_dict = {}
    csv_path = os.path.join(os.path.dirname(__file__), 'EFLLex.tsv')
    
    if os.path.exists(csv_path):
        try:
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.reader(f, delimiter='\t')
                headers = next(reader)
                
                # מציאת העמודות הרלוונטיות
                try:
                    a1_idx = headers.index("level_freq@a1")
                    a2_idx = headers.index("level_freq@a2")
                    b1_idx = headers.index("level_freq@b1")
                    b2_idx = headers.index("level_freq@b2")
                    c1_idx = headers.index("level_freq@c1")
                except ValueError:
                    return _efllex_dict
                    
                word_idx = headers.index("word") if "word" in headers else 0
                
                levels = ["A1", "A2", "B1", "B2", "C1"]
                indices = [a1_idx, a2_idx, b1_idx, b2_idx, c1_idx]
                
                for row in reader:
                    if len(row) <= max(indices):
                        continue
                        
                    freqs = []
                    for idx in indices:
                        try:
                            freqs.append(float(row[idx]))
                        except ValueError:
                            freqs.append(0.0)
                            
                    # בחירת הרמה עם התדירות הגבוהה ביותר
                    if sum(freqs) > 0:
                        max_idx = freqs.index(max(freqs))
                        best_level = levels[max_idx]
                        word = str(row[word_idx]).strip().lower()
                        _efllex_dict[word] = best_level
                        
            print(f"✅ Loaded EFLLex dictionary ({len(_efllex_dict)} words) into memory.")
        except Exception as e:
            print(f"⚠️ Warning: Failed to load EFLLex dictionary: {e}")
            
    return _efllex_dict

def get_cefr_level(word):
    word_lower = word.lower()
    
    # 1. First, check the empirical EFLLex dictionary!
    efllex_dict = load_efllex_dictionary()
    if word_lower in efllex_dict:
        return efllex_dict[word_lower]
        
    # 2. Fallback to zipf frequency if the word is not in EFLLex
    freq = zipf_frequency(word_lower, 'en')
    
    if freq > 6.0: return "A1"
    if freq > 5.0: return "A2"
    if freq > 4.5: return "B1"
    if freq > 4.0: return "B2"
    if freq > 3.5: return "C1"
    return "C2"

def is_difficult(word_cefr, user_cefr):
    levels = ["A1", "A2", "B1", "B2", "C1", "C2"]
    try:
        w_idx = levels.index(word_cefr)
        u_idx = levels.index(user_cefr)
        return w_idx > u_idx
    except ValueError:
        return False # Default to not difficult if unknown
