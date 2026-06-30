import pytest
import sys
import os

# Ensure backend directory is in the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cefr import get_cefr_level

def test_proper_nouns_and_common_words():
    # Proper nouns / capitalized words that miss EFLLex should return "A1"
    assert get_cefr_level("Mozambique") == "A1"   # proper noun, was C2
    assert get_cefr_level("Kazakhstan") == "A1"   # proper noun, was C2
    assert get_cefr_level("Madeline")   == "A1"   # person name
    assert get_cefr_level("NASA")       == "A1"   # acronym
    
    # Real difficult word in zipf lookup should stay flagged
    assert get_cefr_level("ubiquitous") != "A1"   
    
    # Common word via EFLLex should remain unaffected (returns its actual EFLLex value, e.g. "A2" for "the")
    assert get_cefr_level("the") == "A2"
