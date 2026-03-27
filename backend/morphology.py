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
    """Format root with dashes: כ-ת-ב or כ-ת-ב-ם for quadriliterals."""
    if not root_letters or len(root_letters) < 2:
        return "N/A"
    if len(root_letters) > 4:
        # Truncate to 4 — anything longer is likely a parsing error
        root_letters = root_letters[:4]
    return "-".join(list(root_letters))

def verify_root(ai_root: str, hebrew_word: str) -> str:
    """
    Verify the AI-provided root against the Hebrew word.
    Checks letter order (not just presence) for better accuracy.
    """
    clean_ai = ai_root.replace("-", "").strip()
    clean_word = clean_nikkud(hebrew_word)

    if not clean_ai or len(clean_ai) < 2:
        return ai_root

    # Check letters appear in ORDER in the word (not just anywhere)
    idx = 0
    ordered_matches = 0
    for char in clean_ai:
        found = clean_word.find(char, idx)
        if found != -1:
            ordered_matches += 1
            idx = found + 1

    # If fewer than 2 root letters appear in order → likely hallucination
    if ordered_matches < 2 and len(clean_ai) >= 3:
        # Try stripping prefixes+suffixes for a fallback root
        stripped = strip_suffixes(strip_prefixes(clean_word))
        if len(stripped) in (3, 4):
            return format_root(stripped)
        elif len(stripped) > 4:
            # Try 3-letter core first, then 4-letter
            mid = len(stripped) // 2
            core = stripped[max(0, mid-1):mid+2]
            return format_root(core) + " (estimated)"

    return ai_root

def is_loanword_root(root: str) -> bool:
    """Returns True if the root string signals a loanword or uncertain case."""
    if not root:
        return True
    lower = root.lower()
    return any(x in lower for x in ["n/a", "loanword", "uncertain", "unknown"])
