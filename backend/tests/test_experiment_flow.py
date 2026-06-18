import os
import sys
import json
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

# Ensure backend directory is in the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database import get_db_connection

client = TestClient(app)

# Test helper to clean up test database entries
@pytest.fixture(autouse=True)
def clean_db():
    # Execute delete queries before and after each test
    queries = [
        "DELETE FROM experiment_participants WHERE prolific_pid LIKE 'test_pid_%'",
        "DELETE FROM experiment_events WHERE prolific_pid LIKE 'test_pid_%'",
        "DELETE FROM survey_responses WHERE prolific_pid LIKE 'test_pid_%'",
        "DELETE FROM participant_meta WHERE prolific_pid LIKE 'test_pid_%'"
    ]
    conn = get_db_connection()
    cursor = conn.cursor()
    for q in queries:
        cursor.execute(q)
    conn.commit()
    conn.close()
    
    yield
    
    conn = get_db_connection()
    cursor = conn.cursor()
    for q in queries:
        cursor.execute(q)
    conn.commit()
    conn.close()

# ---------------------------------------------------------
# 1. LexTALE Threshold Boundary Tests
# ---------------------------------------------------------
def test_lextale_thresholds_exclude():
    # score > 80 -> exclude
    pid = "test_pid_exclude"
    response = client.post("/api/experiment/assign", json={
        "prolific_pid": pid,
        "lextale_score": 85.0
    })
    assert response.status_code == 200
    data = response.json()
    assert data["cefr_level"] == "exclude"
    assert data["text_format"] == ""
    assert data["sequence"] == ""
    assert data["text_pair"] == ""
    assert data["text_order"] == []

    # Verify database state
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM experiment_participants WHERE prolific_pid = ?", (pid,))
    row = cursor.fetchone()
    conn.close()
    assert row is not None
    assert row["cefr_level"] == "exclude"

def test_lextale_thresholds_b2():
    # 59 < score <= 80 -> B2
    pid = "test_pid_b2"
    response = client.post("/api/experiment/assign", json={
        "prolific_pid": pid,
        "lextale_score": 75.0
    })
    assert response.status_code == 200
    data = response.json()
    assert data["cefr_level"] == "B2"
    assert data["text_format"] in ["TF", "TS"]
    assert data["sequence"] in ["A", "B"]

def test_lextale_thresholds_b1():
    # score <= 59 -> B1
    pid = "test_pid_b1"
    response = client.post("/api/experiment/assign", json={
        "prolific_pid": pid,
        "lextale_score": 50.0
    })
    assert response.status_code == 200
    data = response.json()
    assert data["cefr_level"] == "B1"
    assert data["text_format"] in ["TF", "TS"]
    assert data["sequence"] in ["A", "B"]

# ---------------------------------------------------------
# 2. Counterbalancing & Permutation Verification (8 Permutations)
# ---------------------------------------------------------
@pytest.mark.parametrize("cefr_score,expected_cefr,text_format,sequence,text_pair,reverse_order", [
    (50.0, "B1", "TF", "A", "pair_1", False),
    (50.0, "B1", "TF", "B", "pair_2", True),
    (50.0, "B1", "TS", "A", "pair_2", False),
    (50.0, "B1", "TS", "B", "pair_1", True),
    (75.0, "B2", "TF", "A", "pair_3", False),
    (75.0, "B2", "TF", "B", "pair_4", True),
    (75.0, "B2", "TS", "A", "pair_4", False),
    (75.0, "B2", "TS", "B", "pair_3", True),
])
def test_all_permutations(cefr_score, expected_cefr, text_format, sequence, text_pair, reverse_order):
    pid = f"test_pid_{expected_cefr}_{text_format}_{sequence}_{text_pair}_{'rev' if reverse_order else 'fwd'}"
    
    # We patch random.choice to make the assignment deterministic
    # assign has 4 random choices:
    # 1. text_format (TF/TS)
    # 2. sequence (A/B)
    # 3. text_pair (pair_1/pair_2 or pair_3/pair_4)
    # 4. reverse_order (True/False for text_order shuffle)
    choices = [text_format, sequence, text_pair, not reverse_order]
    
    with patch("random.choice") as mock_choice:
        mock_choice.side_effect = choices
        response = client.post("/api/experiment/assign", json={
            "prolific_pid": pid,
            "lextale_score": cefr_score
        })
        
    assert response.status_code == 200
    data = response.json()
    assert data["prolific_pid"] == pid
    assert data["cefr_level"] == expected_cefr
    assert data["text_format"] == text_format
    assert data["sequence"] == sequence
    assert data["text_pair"] == text_pair
    
    suffix = "1" if text_pair == "pair_1" else "2" if text_pair == "pair_2" else "3" if text_pair == "pair_3" else "4"
    expected_order = [f"textB{suffix}", f"textA{suffix}"] if reverse_order else [f"textA{suffix}", f"textB{suffix}"]
    assert data["text_order"] == expected_order

# ---------------------------------------------------------
# 3. Survey Submission with i18n/Hebrew UTF-8 Round-Trip
# ---------------------------------------------------------
def test_survey_submission():
    pid = "test_pid_survey_utf8"
    survey_payload = {
        "prolific_pid": pid,
        "survey_type": "post_study",
        "condition": "wordahead",
        "text_id": "textA1",
        "sequence_position": 1,
        "responses": {
            "mental_demand": 4,
            "success": 6
        },
        "open_text_responses": {
            "hebrew_feedback": "היה קל מאוד לקרוא את הטקסט בעזרת כלי התרגום וההדגשה.",
            "english_feedback": "Perfect tool!"
        },
        "ranking": {
            "helpful": "The first passage you read"
        }
    }
    
    response = client.post("/api/survey", json=survey_payload)
    assert response.status_code == 200
    assert response.json() == {"success": True}
    
    # Verify database stores and retrieves Hebrew UTF-8 correctly
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM survey_responses WHERE prolific_pid = ?", (pid,))
    row = cursor.fetchone()
    conn.close()
    
    assert row is not None
    assert row["survey_type"] == "post_study"
    assert row["condition"] == "wordahead"
    
    open_text = json.loads(row["open_text_responses"])
    assert open_text["hebrew_feedback"] == "היה קל מאוד לקרוא את הטקסט בעזרת כלי התרגום וההדגשה."
    assert open_text["english_feedback"] == "Perfect tool!"
    
    ranking = json.loads(row["ranking"])
    assert ranking["helpful"] == "The first passage you read"

# ---------------------------------------------------------
# 4. Full Experiment Submission and Aggregates Check
# ---------------------------------------------------------
def test_full_experiment_submission():
    pid = "test_pid_full_submit"
    
    # 1. Assign participant (B2, TF, A, pair_3, forward order)
    with patch("random.choice") as mock_choice:
        mock_choice.side_effect = ["TF", "A", "pair_3", True]
        client.post("/api/experiment/assign", json={
            "prolific_pid": pid,
            "lextale_score": 70.0
        })
        
    # 2. Submit payload
    submit_payload = {
        "prolific_pid": pid,
        "lextale_score": 70.0,
        "cefr_level": "B2",
        "text_format": "TF",
        "sequence": "A",
        "text_pair": "pair_3",
        "readings": [
            {
                "text_id": "textA3",
                "condition": "plain",
                "reading_time_ms": 120000,
                "hover_events": [
                    {"word": "academic", "dwell_ms": 400, "timestamp": 12345},
                    {"word": "structure", "dwell_ms": 250, "timestamp": 12380}
                ],
                "click_events": [
                    {"word": "academic", "timestamp": 12347}
                ],
                "click_count": 1,
                "unique_words_translated": 2,
                "comprehension": [{"qid": 1, "answer": "A", "correct": True}]
            },
            {
                "text_id": "textB3",
                "condition": "wordahead",
                "reading_time_ms": 95000,
                "hover_events": [
                    {"word": "language", "dwell_ms": 300, "timestamp": 13345},
                    {"word": "acquisition", "dwell_ms": 500, "timestamp": 13390},
                    {"word": "reading", "dwell_ms": 200, "timestamp": 13450}
                ],
                "click_events": [],
                "click_count": 0,
                "unique_words_translated": 3,
                "comprehension": [{"qid": 1, "answer": "B", "correct": False}]
            }
        ],
        "surveys": {
            "per_task_1": {
                "mental_demand": 4,
                "ac_mid": 7  # Attention check 2 passed
            },
            "per_task_2": {
                "mental_demand": 3,
                "ac_late": 1  # Attention check 3 passed
            },
            "post_study": {
                "sus_1": 5,
                "dependent": 3  # Reverse-valenced item 18 "too dependent", stored raw (no reverse scoring)
            },
            "demographics": {
                "age": "18_24",
                "gender": "female",
                "native_language": "Hebrew",
                "other_languages": "English",
                "years_studying_english": "10",
                "course_level": "undergrad",
                "self_rated_english": "7",
                "academic_year": "2nd",
                "field_of_study": "Psychology",
                "frequency_academic_english": "4",
                "use_translation_tools": "5",
                "ac_early": "3"  # Attention check 1 response
            }
        }
    }
    
    # We intercept the CSV import call to inspect the generated CSV file content
    imported_csv_data = {}
    
    def mock_import_responses(self_obj, csv_file_path):
        import csv
        with open(csv_file_path, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            headers = next(reader)
            row = next(reader)
            imported_csv_data["headers"] = headers
            imported_csv_data["row"] = row
        return {"success": True}
    
    with patch("src.qualtrics_client.QualtricsClient.import_responses", mock_import_responses):
        response = client.post("/api/experiment/submit", json=submit_payload)
        
    assert response.status_code == 200
    assert response.json()["success"] is True
    
    # 3. Assert CSV Columns and values
    headers = imported_csv_data["headers"]
    row = imported_csv_data["row"]
    
    # Assert column headers carry trial1_ / trial2_ prefix and hover metrics exist
    assert "trial1_click_count" in headers
    assert "trial1_unique_words_translated" in headers
    assert "trial1_hover_count" in headers
    assert "trial1_dwell_ms" in headers
    assert "trial2_click_count" in headers
    assert "trial2_unique_words_translated" in headers
    assert "trial2_hover_count" in headers
    assert "trial2_dwell_ms" in headers
    
    # Map headers to indices
    h_idx = {h: idx for idx, h in enumerate(headers)}
    
    # Assert correct calculations
    assert row[h_idx["trial1_click_count"]] == "1"
    assert row[h_idx["trial1_unique_words_translated"]] == "2"
    assert row[h_idx["trial1_hover_count"]] == "2"
    assert row[h_idx["trial1_dwell_ms"]] == "650"
    
    assert row[h_idx["trial2_click_count"]] == "0"
    assert row[h_idx["trial2_unique_words_translated"]] == "3"
    assert row[h_idx["trial2_hover_count"]] == "3"
    assert row[h_idx["trial2_dwell_ms"]] == "1000"
    
    # Confirm no column collisions between trial1_ and trial2_
    assert len(headers) == len(set(headers))

    # 4. Verify SQLite DB state
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify participant_meta
    cursor.execute("SELECT * FROM participant_meta WHERE prolific_pid = ?", (pid,))
    meta = cursor.fetchone()
    assert meta is not None
    assert meta["age"] == "18_24"
    assert meta["native_language"] == "Hebrew"
    assert meta["field_of_study"] == "Psychology"
    assert meta["ac_early"] == "3"
    assert bool(meta["ac_mid_pass"]) is True
    assert bool(meta["ac_late_pass"]) is True
    
    # Verify experiment event logged
    cursor.execute("SELECT * FROM experiment_events WHERE prolific_pid = ? AND event_type = 'final_submission'", (pid,))
    event = cursor.fetchone()
    assert event is not None
    
    conn.close()

# ---------------------------------------------------------
# 5. Negative and Boundary Tests
# ---------------------------------------------------------
def test_assign_missing_pid():
    response = client.post("/api/experiment/assign", json={
        "prolific_pid": "   ",
        "lextale_score": 60.0
    })
    assert response.status_code == 400
    assert "cannot be empty" in response.json()["detail"]

def test_submit_missing_fields():
    # Missing required payload structure
    response = client.post("/api/experiment/submit", json={
        "prolific_pid": "test_pid_missing_fields"
    })
    assert response.status_code == 422 # FastAPI validation error

def test_failed_attention_checks():
    pid = "test_pid_failed_ac"
    
    # Assign participant
    with patch("random.choice") as mock_choice:
        mock_choice.side_effect = ["TS", "B", "pair_4", False]
        client.post("/api/experiment/assign", json={
            "prolific_pid": pid,
            "lextale_score": 72.0
        })
        
    # Submit payload with failed attention checks
    submit_payload = {
        "prolific_pid": pid,
        "lextale_score": 72.0,
        "cefr_level": "B2",
        "text_format": "TS",
        "sequence": "B",
        "text_pair": "pair_4",
        "readings": [
            {
                "text_id": "textB4",
                "condition": "plain",
                "reading_time_ms": 110000,
                "hover_events": [],
                "click_events": [],
                "click_count": 0,
                "unique_words_translated": 0,
                "comprehension": []
            },
            {
                "text_id": "textA4",
                "condition": "wordahead",
                "reading_time_ms": 105000,
                "hover_events": [],
                "click_events": [],
                "click_count": 0,
                "unique_words_translated": 0,
                "comprehension": []
            }
        ],
        "surveys": {
            "per_task_1": {
                "mental_demand": 4,
                "ac_mid": 3  # Attention check 2 FAILED (expected 7)
            },
            "per_task_2": {
                "mental_demand": 3,
                "ac_late": 4  # Attention check 3 FAILED (expected 1)
            },
            "post_study": {
                "sus_1": 5,
                "dependent": 3
            },
            "demographics": {
                "age": "18_24",
                "gender": "female",
                "native_language": "Hebrew",
                "other_languages": "English",
                "years_studying_english": "10",
                "course_level": "undergrad",
                "self_rated_english": "7",
                "academic_year": "2nd",
                "field_of_study": "Psychology",
                "frequency_academic_english": "4",
                "use_translation_tools": "5",
                "ac_early": "3"
            }
        }
    }
    
    with patch("os.path.exists", return_value=True):
        response = client.post("/api/experiment/submit", json=submit_payload)
        
    assert response.status_code == 200
    assert response.json()["success"] is True
    
    # Verify that failed attention checks are saved correctly as False
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM participant_meta WHERE prolific_pid = ?", (pid,))
    meta = cursor.fetchone()
    conn.close()
    
    assert meta is not None
    assert bool(meta["ac_mid_pass"]) is False
    assert bool(meta["ac_late_pass"]) is False
