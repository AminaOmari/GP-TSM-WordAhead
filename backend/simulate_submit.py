import json
import sqlite3
import os

DB_PATH = 'wordahead.db'

# 1. Initialize DB
from database import init_db
init_db()

# 2. Check participant_meta table
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(participant_meta)")
meta_schema = cursor.fetchall()
print("Participant Meta Schema:")
for col in meta_schema:
    print(f" - {col[1]} ({col[2]})")

conn.close()

# 3. Simulate a submit payload
import asyncio
from main import experiment_submit, SubmitRequest

payload = {
    "prolific_pid": "test_user_123",
    "lextale_score": 60,
    "cefr_level": "B2",
    "text_format": "TF",
    "sequence": "A",
    "text_pair": "1_2",
    "readings": [
        {
            "text_id": "text1",
            "condition": "plain",
            "reading_time_ms": 120000,
            "hover_events": [{"word": "test", "translation_shown": True}],
            "click_events": [{"word": "click_test"}],
            "click_count": 1,
            "unique_words_translated": 2,
            "comprehension": []
        },
        {
            "text_id": "text2",
            "condition": "wordahead",
            "reading_time_ms": 150000,
            "hover_events": [],
            "click_events": [],
            "click_count": 0,
            "unique_words_translated": 0,
            "comprehension": []
        }
    ],
    "surveys": {
        "per_task_1": {"ac_mid": 7},
        "per_task_2": {"ac_late": 1},
        "post_study": {},
        "demographics": {
            "age": "25-34",
            "gender": "male",
            "native_language": "עברית",
            "ac_early": "1"
        }
    }
}

req = SubmitRequest(**payload)

async def test():
    try:
        # We catch any qualtrics import errors, but the local csv and DB logic will run
        await experiment_submit(req)
        print("Submit executed!")
    except Exception as e:
        print(f"Error during submit: {e}")

asyncio.run(test())

# Read back from participant_meta
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("SELECT * FROM participant_meta WHERE prolific_pid='test_user_123'")
meta_row = cursor.fetchone()
print(f"Participant Meta inserted row: {meta_row}")

cursor.execute("SELECT * FROM experiment_events WHERE prolific_pid='test_user_123'")
event_row = cursor.fetchone()
print(f"Experiment Event row found: {'Yes' if event_row else 'No'}")
conn.close()
