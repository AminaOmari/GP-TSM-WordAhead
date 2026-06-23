import requests
import time
import json

base_url = "http://localhost:8000"

# wait for server to start
time.sleep(5)

payload = {
    "prolific_pid": "test_pid",
    "survey_type": "per_task",
    "condition": "TF",
    "text_id": "b1p1_underground",
    "sequence_position": 1,
    "responses": {"pt_a1": 5},
    "open_text_responses": {},
    "ranking": {}
}

resp = requests.post(f"{base_url}/api/survey", json=payload)
print("Survey API:", resp.status_code, resp.text)

submit_payload = {
    "prolific_pid": "test_pid",
    "lextale_score": 50,
    "cefr_level": "B2",
    "text_format": "TF",
    "sequence": "A",
    "text_pair": "b1_pair1",
    "readings": [],
    "surveys": {
        "per_task_1": {"pt_a1": 5},
        "per_task_2": {"pt_a1": 4},
        "post_study": {"responses": {"ps_use_plain": 4, "ps_use_wordahead": 5, "ps_adoption_intent": 5}, "open_text_responses": {}, "ranking": {"helpful": "plain"}},
        "demographics": {
            "age": "18-24",
            "gender": "Male",
            "native_language": "Spanish",
            "years_studying_english": "5",
            "education": "bachelors",
            "self_rated_english": "4",
            "frequency_academic_english": "3",
            "use_translation_tools": "3",
            "translation_tools_used": "Google Translate, DeepL",
            "consent_timestamp": "2026-06-23T18:00:00.000Z"
        }
    }
}
resp2 = requests.post(f"{base_url}/api/experiment/submit", json=submit_payload)
print("Submit API:", resp2.status_code, resp2.text)

