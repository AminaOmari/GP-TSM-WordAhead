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

EXPERIMENT_TEXTS = {

    # ---------------- B1 — pair_1  (BC LearnEnglish; MCQs READY) ----------------
    "textA1": {  # Digital habits across generations
        # https://learnenglish.britishcouncil.org/free-resources/reading/b1/digital-habits-across-generations
        "title": "Digital habits across generations",
        "TF": """Today’s grandparents are joining their grandchildren on social media, but the different generations’ online habits couldn't be more different. In the UK the over-55s are joining Facebook in increasing numbers, meaning that they will soon be the site's second biggest user group, with 3.5 million users aged 55–64 and 2.9 million over-65s.

Sheila, aged 59, says, 'I joined to see what my grandchildren are doing, as my daughter posts videos and photos of them. It's a much better way to see what they're doing than waiting for letters and photos in the post. That's how we did it when I was a child, but I think I'm lucky I get to see so much more of their lives than my grandparents did.'

Ironically, Sheila's grandchildren are less likely to use Facebook themselves. Children under 17 in the UK are leaving the site – only 2.2 million users are under 17 – but they're not going far from their smartphones. Chloe, aged 15, even sleeps with her phone. 'It's my alarm clock so I have to,' she says. 'I look at it before I go to sleep and as soon as I wake up.'

Unlike her grandmother's generation, Chloe's age group is spending so much time on their phones at home that they are missing out on spending time with their friends in real life. Sheila, on the other hand, has made contact with old friends from school she hasn't heard from in forty years. 'We use Facebook to arrange to meet all over the country,' she says. 'It's changed my social life completely.'

Teenagers might have their parents to thank for their smartphone and social media addiction as their parents were the early adopters of the smartphone. Peter, 38 and father of two teenagers, reports that he used to be on his phone or laptop constantly. 'I was always connected and I felt like I was always working,' he says. 'How could I tell my kids to get off their phones if I was always front of a screen myself?' So, in the evenings and at weekends, he takes his SIM card out of his smartphone and puts it into an old-style mobile phone that can only make calls and send text messages. 'I'm not completely cut off from the world in case of emergencies, but the important thing is I'm setting a better example to my kids and spending more quality time with them.'

Is it only a matter of time until the generation above and below Peter catches up with the new trend for a less digital life?""",
        "TS": """Today’s grandparents are joining their grandchildren on social media, but the different generations’ online habits couldn't be more different. In the UK the over-55s are joining Facebook they will soon be the site's second biggest user group, with 3.5 million users aged 55–64 and 2.9 million over-65s.

Sheila, says, 'I joined to see what my grandchildren are doing, as my daughter posts videos and photos of
Sheila's grandchildren are less likely to use Facebook Children under 17 in the UK are leaving the site
Chloe, sleeps with her phone. 'It's my alarm clock so I have to,' she says. 'I look at it before I go to sleep and as soon as I wake up.'

Chloe's age group is spending time on their phones at home that they are missing out on spending time with friends in real life. Sheila, has made contact with friends 'We use Facebook to arrange to meet all over the country,' she says. 'It's changed my social life completely.'

Teenagers might have their parents to thank for their smartphone addiction Peter, reports he used to be on his phone or laptop constantly. 'I was always connected and I felt like I was always working,' he says. he takes card and puts it into phone 'I'm not completely cut off from the world but the important thing is I'm setting a better example to my kids and spending more quality time with them.'

Is it only a matter of time until the generation above and below Peter catches up with the new trend for a less digital life?""",
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
    },
}
