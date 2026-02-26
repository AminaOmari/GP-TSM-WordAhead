import re

# Standard Hebrew prefixes
PREFIXES = ['ו', 'ה', 'ב', 'ל', 'כ', 'מ', 'ש']
# Standard Hebrew suffixes
SUFFIXES = ['ים', 'ות', 'נו', 'כם', 'תן', 'תי', 'תם', 'ת', 'י', 'ה', 'ו']

def clean_nikkud(word: str) -> str:
    """Remove Hebrew vowels/nikkud signs."""
    return re.sub(r'[\u0591-\u05C7]', '', word)

def strip_prefixes(word: str) -> str:
    """Strip standard conjugation/prepositional prefixes (one at a time)."""
    if len(word) <= 3:
        return word
    for p in PREFIXES:
        if word.startswith(p):
            # Check if stripping still leaves a valid-ish core
            if len(word[1:]) >= 3:
                return word[1:]
    return word

def strip_suffixes(word: str) -> str:
    """Strip common conjugation suffixes."""
    if len(word) <= 3:
        return word
    for s in SUFFIXES:
        if word.endswith(s):
            if len(word[:-len(s)]) >= 3:
                return word[:-len(s)]
    return word

def format_root(root_letters: str) -> str:
    """Format root with dashes: כ-ת-ב."""
    if not root_letters or len(root_letters) < 2:
        return "N/A"
    return "-".join(list(root_letters))

def verify_root(ai_root: str, hebrew_word: str) -> str:
    """
    Heuristic to verify if the AI-provided root makes sense for the word.
    Checks if at least 2 letters of the root appear in the clean word.
    """
    clean_ai = ai_root.replace("-", "").strip()
    clean_word = clean_nikkud(hebrew_word)
    
    if not clean_ai:
        return ai_root
        
    matches = 0
    for char in clean_ai:
        if char in clean_word:
            matches += 1
            
    # If the root has NO letters in common with the word, it's likely a hallucination
    if matches < 2 and len(clean_ai) >= 3:
         # Fallback: Try a basic strip
         stripped = strip_suffixes(strip_prefixes(clean_word))
         if len(stripped) == 3:
             return format_root(stripped)
             
    return ai_root
