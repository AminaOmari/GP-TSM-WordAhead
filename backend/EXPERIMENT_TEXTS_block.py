# =============================================================================
# EXPERIMENT_TEXTS  —  recommended text selection (real EFLLex / GP-TSM pairing)
# =============================================================================
# Pair map (unchanged from your assign logic): pair_n = {textA{n}, textB{n}}
#   pair_1, pair_2  -> B1     pair_3, pair_4  -> B2
#
# FILL-IN RULES (read before pasting):
#   * TF / TS:  paste the EXACT text from your source — do NOT retype from memory
#     or from any chat transcript. TF = full detailed passage; TS = the GP-TSM
#     skimmed output for that SAME passage. The stimulus must be the validated
#     text verbatim, or the experimental manipulation is silently altered.
#   * mcqs:  exactly 5 comprehension MCQs per text. The alertness/instructed-
#     response item is SYSTEM-INJECTED at quiz position 3 — do NOT author it here.
#   * "correct" is 0-INDEXED.  "correct": 0 = FIRST option, "correct": 1 = SECOND.
#     Getting this wrong corrupts every comprehension score and nothing will error.
#   * Each MCQ must be answerable from BOTH the TF and the TS version (Task-2
#     constraint) — verify by hand once the real text + skim are in.
#
# QUESTION-AVAILABILITY (where the 5 MCQs come from):
#   READY  (British Council LearnEnglish, MCQs already written — paste + set correct):
#     textA1 Digital habits, textB1 Innovation, textB3 Buy nothing
#   AUTHOR (Trinity ISE — no published MCQs; you must write + validate 5 each):
#     textA2 Tour guide, textB2 Madeline, textA3 Plastic bags,
#     textB4 Celebrity, textB4 Wildlife
#
# FLAGS for Ossi / before lock:
#   * pair_3 is CROSS-SOURCE within the pair (Trinity Plastic bags + BC Buy nothing).
#     Needs Ossi sign-off — Trinity×BC pairing isn't yet confirmed (BC×BC-Teens is).
#   * textB4 (Celebrity) skim word count (297) was inferred from a partly-legible
#     screenshot — reconfirm against a clean WordAhead run before locking pair_4.
# =============================================================================

TEXTS = {

    # ---------------- B1 — pair_1  (BC LearnEnglish; MCQs READY) ----------------
    "textA1": {  # Digital habits across generations
        # https://learnenglish.britishcouncil.org/free-resources/reading/b1/digital-habits-across-generations
        "title": "Digital habits across generations",
        "TF": "<<< PASTE EXACT DETAILED TEXT — Digital habits (B1_Texts_British_Council.pdf) >>>",
        "TS": "<<< PASTE EXACT SKIMMED TEXT — Digital habits >>>",
        "mcqs": [  # READY: paste the 5 MCQs from the PDF; set each correct (0-indexed)
            {"question": "<<<Q1>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<Q2>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<Q3>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<Q4>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<Q5>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
        ],
    },
    "textB1": {  # Innovation in business
        # https://learnenglish.britishcouncil.org/free-resources/reading/b1/innovation-business
        "title": "Innovation in business",
        "TF": "<<< PASTE EXACT DETAILED TEXT — Innovation in business >>>",
        "TS": "<<< PASTE EXACT SKIMMED TEXT — Innovation in business >>>",
        "mcqs": [  # READY: paste the 5 MCQs from the PDF; set each correct (0-indexed)
            {"question": "<<<Q1>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<Q2>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<Q3>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<Q4>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<Q5>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
        ],
    },

    # ---------------- B1 — pair_2  (Trinity ISE; AUTHOR MCQs) -------------------
    "textA2": {  # Tour guide / step-on guides
        "title": "Tour guide",
        "TF": "<<< PASTE EXACT DETAILED TEXT — Tour guide (Trinity_College_London_texts.pdf, B1 A3) >>>",
        "TS": "<<< PASTE EXACT SKIMMED TEXT — Tour guide >>>",
        "mcqs": [  # AUTHOR 5 MCQs; each answerable from BOTH TF and TS; correct 0-indexed
            {"question": "<<<AUTHOR Q1>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<AUTHOR Q2>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<AUTHOR Q3>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<AUTHOR Q4>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<AUTHOR Q5>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
        ],
    },
    "textB2": {  # Madeline Island ice road
        "title": "Madeline Island",
        "TF": "<<< PASTE EXACT DETAILED TEXT — Madeline Island (Trinity, B1 A6) >>>",
        "TS": "<<< PASTE EXACT SKIMMED TEXT — Madeline Island >>>",
        "mcqs": [  # AUTHOR 5 MCQs; each answerable from BOTH TF and TS; correct 0-indexed
            {"question": "<<<AUTHOR Q1>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<AUTHOR Q2>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<AUTHOR Q3>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<AUTHOR Q4>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<AUTHOR Q5>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
        ],
    },

    # ---------------- B2 — pair_3  (CROSS-SOURCE — needs Ossi sign-off) ---------
    "textA3": {  # Plastic bags  (Trinity ISE; AUTHOR MCQs)
        "title": "Plastic bags",
        "TF": "<<< PASTE EXACT DETAILED TEXT — Plastic bags (Trinity, B2 A1) >>>",
        "TS": "<<< PASTE EXACT SKIMMED TEXT — Plastic bags >>>",
        "mcqs": [  # AUTHOR 5 MCQs; each answerable from BOTH TF and TS; correct 0-indexed
            {"question": "<<<AUTHOR Q1>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<AUTHOR Q2>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<AUTHOR Q3>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<AUTHOR Q4>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<AUTHOR Q5>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
        ],
    },
    "textB3": {  # Buy nothing movement  (BC LearnEnglish; MCQs READY)
        # https://learnenglish.britishcouncil.org/free-resources/reading/b2/buy-nothing-movement
        "title": "The Buy Nothing movement",
        "TF": "<<< PASTE EXACT DETAILED TEXT — Buy nothing (B2_Texts_British_Council.pdf) >>>",
        "TS": "<<< PASTE EXACT SKIMMED TEXT — Buy nothing >>>",
        "mcqs": [  # READY: paste the 5 MCQs from the PDF; set each correct (0-indexed)
            {"question": "<<<Q1>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<Q2>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<Q3>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<Q4>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<Q5>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
        ],
    },

    # ---------------- B2 — pair_4  (Trinity ISE; AUTHOR MCQs) -------------------
    "textA4": {  # Celebrity privacy   (RECONFIRM skim metrics before lock)
        "title": "Celebrity privacy",
        "TF": "<<< PASTE EXACT DETAILED TEXT — Celebrity (Trinity, B2 A3) >>>",
        "TS": "<<< PASTE EXACT SKIMMED TEXT — Celebrity >>>",
        "mcqs": [  # AUTHOR 5 MCQs; each answerable from BOTH TF and TS; correct 0-indexed
            {"question": "<<<AUTHOR Q1>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<AUTHOR Q2>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<AUTHOR Q3>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<AUTHOR Q4>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<AUTHOR Q5>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
        ],
    },
    "textB4": {  # Wildlife photographer
        "title": "Wildlife photographer",
        "TF": "<<< PASTE EXACT DETAILED TEXT — Wildlife photographer (Trinity, B2 A7) >>>",
        "TS": "<<< PASTE EXACT SKIMMED TEXT — Wildlife photographer >>>",
        "mcqs": [  # AUTHOR 5 MCQs; each answerable from BOTH TF and TS; correct 0-indexed
            {"question": "<<<AUTHOR Q1>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<AUTHOR Q2>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<AUTHOR Q3>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<AUTHOR Q4>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
            {"question": "<<<AUTHOR Q5>>>", "options": ["<<<A>>>", "<<<B>>>", "<<<C>>>", "<<<D>>>"], "correct": None},
        ],
    }
}

# TODO: These lists are pending the final matched sets from the supervisor.
# Currently seeded with the placeholders representing the original pairings:
TF_PAIRS = [
    ("textA1", "textB1"),  # pair_1
    ("textA2", "textB2"),  # pair_2
    ("textA3", "textB3"),  # pair_3
    ("textA4", "textB4"),  # pair_4
]

TS_PAIRS = [
    ("textA1", "textB1"),  # pair_1
    ("textA2", "textB2"),  # pair_2
    ("textA3", "textB3"),  # pair_3
    ("textA4", "textB4"),  # pair_4
]

