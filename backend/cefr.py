import os
import pandas as pd
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
            df = pd.read_csv(csv_path, sep='\t', on_bad_lines='skip')
            # Extract the actual level columns based on EFLLex format
            level_cols = ["level_freq@a1", "level_freq@a2", "level_freq@b1", "level_freq@b2", "level_freq@c1"]
            df["efllex_level"] = df[level_cols].idxmax(axis=1).apply(lambda x: x.split('@')[1].upper())
            df = df[df[level_cols].sum(axis=1) > 0]
            
            # Map word to its CEFR level
            for _, row in df.iterrows():
                word = str(row['word']).strip().lower()
                _efllex_dict[word] = row['efllex_level']
                
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
