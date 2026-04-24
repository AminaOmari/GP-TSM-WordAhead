"""
WordAhead — EFLLex Validation Script
Compares WordAhead's wordfreq-based CEFR classifier against EFLLex gold standard.

Requirements:
    pip install pandas wordfreq scikit-learn

EFLLex Download:
    https://cental.uclouvain.be/cefrlex/efllex/
    → Download → efllex_v2.0.csv (tab-separated)
"""

import pandas as pd
from wordfreq import word_frequency
from sklearn.metrics import cohen_kappa_score, confusion_matrix, classification_report
import warnings
warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────
# 1. Load EFLLex
# ─────────────────────────────────────────────
def load_efllex(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, sep="\t")
    
    # Keep only the frequency columns for each CEFR level
    level_cols = ["level_freq@a1", "level_freq@a2", "level_freq@b1", "level_freq@b2", "level_freq@c1"]
    
    # Assign gold-standard CEFR level = level with highest normalized frequency
    # idxmax will return something like 'level_freq@a1', so we split and uppercase to get 'A1'
    df["efllex_level"] = df[level_cols].idxmax(axis=1).apply(lambda x: x.split('@')[1].upper())
    
    # Only keep rows where at least one level has a non-zero frequency
    df = df[df[level_cols].sum(axis=1) > 0].copy()
    
    print(f"✓ Loaded EFLLex: {len(df):,} words")
    print(f"  Level distribution:\n{df['efllex_level'].value_counts().sort_index()}\n")
    return df[["word", "tag", "efllex_level"]]


# ─────────────────────────────────────────────
# 2. WordAhead CEFR Classifier (wordfreq-based)
# ─────────────────────────────────────────────
CEFR_THRESHOLDS = {
    "A1": 1e-3,
    "A2": 1e-4,
    "B1": 1e-5,
    "B2": 1e-6,
    "C1": 0,      # fallback
}

def wordahead_classify(word: str) -> str:
    freq = word_frequency(word, "en")
    if freq >= 1e-3:
        return "A1"
    elif freq >= 1e-4:
        return "A2"
    elif freq >= 1e-5:
        return "B1"
    elif freq >= 1e-6:
        return "B2"
    else:
        return "C1"


# ─────────────────────────────────────────────
# 3. Run Validation
# ─────────────────────────────────────────────
def run_validation(efllex_path: str):
    df = load_efllex(efllex_path)
    
    print("Running WordAhead classifier on all EFLLex words...")
    df["wordahead_level"] = df["word"].apply(wordahead_classify)
    print("✓ Done classifying\n")
    
    # Numeric mapping for distance calculations
    level_order = {"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5}
    df["gold_num"] = df["efllex_level"].map(level_order)
    df["pred_num"] = df["wordahead_level"].map(level_order)
    
    # ── Metrics ──
    exact_match    = (df["gold_num"] == df["pred_num"]).mean()
    adjacent_match = (abs(df["gold_num"] - df["pred_num"]) <= 1).mean()
    kappa          = cohen_kappa_score(df["efllex_level"], df["wordahead_level"],
                                       labels=["A1","A2","B1","B2","C1"])
    
    print("=" * 50)
    print("  VALIDATION RESULTS")
    print("=" * 50)
    print(f"  Total words compared : {len(df):,}")
    print(f"  Exact Match          : {exact_match:.1%}")
    print(f"  Adjacent Match (±1)  : {adjacent_match:.1%}")
    print(f"  Cohen's Kappa        : {kappa:.3f}")
    print()
    
    # ── Per-level breakdown ──
    print("Per-level Classification Report:")
    print(classification_report(df["efllex_level"], df["wordahead_level"],
                                 labels=["A1","A2","B1","B2","C1"]))
    
    # ── Confusion Matrix ──
    print("Confusion Matrix (rows=EFLLex gold, cols=WordAhead):")
    cm = confusion_matrix(df["efllex_level"], df["wordahead_level"],
                           labels=["A1","A2","B1","B2","C1"])
    cm_df = pd.DataFrame(cm,
                         index=["A1","A2","B1","B2","C1"],
                         columns=["A1","A2","B1","B2","C1"])
    print(cm_df)
    print()
    
    # ── Worst disagreements ──
    errors = df[df["gold_num"] != df["pred_num"]].copy()
    errors["gap"] = abs(errors["gold_num"] - errors["pred_num"])
    big_errors = errors[errors["gap"] >= 2].sort_values("gap", ascending=False)
    
    print(f"Words with gap ≥ 2 levels ({len(big_errors)} words):")
    print(big_errors[["word","tag","efllex_level","wordahead_level","gap"]].head(20).to_string(index=False))
    print()
    
    # ── Save results ──
    df.to_csv("validation_results.csv", index=False)
    print("✓ Full results saved to: validation_results.csv")
    
    return df, exact_match, adjacent_match, kappa


# ─────────────────────────────────────────────
# 4. Unit Tests — spot check known words
# ─────────────────────────────────────────────
def run_unit_tests():
    """
    Hardcoded expected CEFR levels for well-known words.
    These serve as a sanity check independent of EFLLex.
    """
    test_cases = [
        # (word, expected_level, notes)
        ("cat",        "A1", "very basic noun"),
        ("house",      "A1", "very basic noun"),
        ("walk",       "A1", "very basic verb"),
        ("difficult",  "B1", "intermediate adjective"),
        ("government", "B1", "intermediate noun"),
        ("analyze",    "B2", "upper-intermediate verb"),
        ("ambiguous",  "C1", "advanced adjective"),
        ("ubiquitous", "C1", "advanced adjective"),
        ("exacerbate", "C1", "advanced verb"),
    ]
    
    print("=" * 50)
    print("  UNIT TESTS")
    print("=" * 50)
    
    level_order = {"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5}
    passed = 0
    for word, expected, notes in test_cases:
        predicted = wordahead_classify(word)
        gap = abs(level_order[predicted] - level_order[expected])
        
        if predicted == expected:
            status = "✅ PASS"
            passed += 1
        elif gap == 1:
            status = "⚠️  ±1"
            passed += 0.5
        else:
            status = "❌ FAIL"
        
        print(f"  {status} | {word:<15} | expected={expected} | got={predicted} | {notes}")
    
    print(f"\n  Score: {passed}/{len(test_cases)}")
    print()


# ─────────────────────────────────────────────
# 5. Entry point
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    
    # Run unit tests first (no file needed)
    run_unit_tests()
    
    # Run full validation against EFLLex (requires downloaded CSV)
    efllex_path = sys.argv[1] if len(sys.argv) > 1 else "efllex_v2.0.csv"
    
    try:
        run_validation(efllex_path)
    except FileNotFoundError:
        print(f"⚠️  EFLLex file not found at: {efllex_path}")
        print("   Download from: https://cental.uclouvain.be/cefrlex/efllex/")
        print("   Then run: python validate_efllex.py efllex_v2.0.csv")
