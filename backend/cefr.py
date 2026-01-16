from wordfreq import zipf_frequency

def get_cefr_level(word):
    # Get Zipf frequency (log10 scale, roughly 0-8)
    freq = zipf_frequency(word, 'en')
    
    # Rough mapping based on literature/heuristics for Zipf
    # 7+ ~ very common
    # 6-7 ~ A1
    # 5-6 ~ A2
    # 4-5 ~ B1
    # 3.5-4 ~ B2
    # 3-3.5 ~ C1
    # <3 ~ C2
    
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
