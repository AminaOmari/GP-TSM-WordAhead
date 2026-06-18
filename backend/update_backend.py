import re

with open('main.py', 'r') as f:
    content = f.read()

# 1. Update CSV construction and participant_meta insert
# Replace experiment_submit body

new_submit_logic = """
    import json
    import csv
    import codecs
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    payload_data = req.dict()
    
    # Extract Demographics
    demo = payload_data.get("surveys", {}).get("demographics", {})
    ac_early = demo.get("ac_early", "")
    
    # Calculate pass for attention checks
    pt1 = payload_data.get("surveys", {}).get("per_task_1", {})
    pt2 = payload_data.get("surveys", {}).get("per_task_2", {})
    ac_mid_pass = str(pt1.get("ac_mid", "")) == "7"
    ac_late_pass = str(pt2.get("ac_late", "")) == "1"
    
    # Insert participant_meta
    cursor.execute(\"\"\"
        INSERT OR REPLACE INTO participant_meta (
            prolific_pid, age, gender, native_language, other_languages,
            years_studying_english, course_level, self_rated_english, academic_year,
            field_of_study, frequency_academic_english, use_translation_tools,
            ac_early, ac_mid_pass, ac_late_pass
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    \"\"\", (
        req.prolific_pid.strip(), demo.get("age"), demo.get("gender"), demo.get("native_language"),
        demo.get("other_languages"), demo.get("years_studying_english"), demo.get("course_level"),
        demo.get("self_rated_english"), demo.get("academic_year"), demo.get("field_of_study"),
        demo.get("frequency_academic_english"), demo.get("use_translation_tools"),
        ac_early, ac_mid_pass, ac_late_pass
    ))

    # Log final submission
    cursor.execute(\"\"\"
        INSERT INTO experiment_events (prolific_pid, event_type, payload)
        VALUES (?, ?, ?)
    \"\"\", (req.prolific_pid.strip(), "final_submission", json.dumps(payload_data)))
    
    conn.commit()
    conn.close()
    
    # Construct CSV payload
    headers = [
        "prolific_pid", "lextale_score", "cefr_level", "text_format", "sequence", "text_pair",
        "reading_1_text_id", "reading_1_condition", "reading_1_time_ms", "reading_1_hovers",
        "reading_1_clicks", "reading_1_click_count", "reading_1_unique_words_translated", "reading_1_comprehension",
        "reading_2_text_id", "reading_2_condition", "reading_2_time_ms", "reading_2_hovers",
        "reading_2_clicks", "reading_2_click_count", "reading_2_unique_words_translated", "reading_2_comprehension",
        "survey_per_task_1", "survey_per_task_2", "survey_post_study", "survey_demographics"
    ]
    
    reading1 = payload_data["readings"][0] if len(payload_data["readings"]) > 0 else {}
    reading2 = payload_data["readings"][1] if len(payload_data["readings"]) > 1 else {}
    
    row = [
        payload_data["prolific_pid"],
        payload_data["lextale_score"],
        payload_data["cefr_level"],
        payload_data["text_format"],
        payload_data["sequence"],
        payload_data["text_pair"],
        reading1.get("text_id", ""),
        reading1.get("condition", ""),
        reading1.get("reading_time_ms", 0),
        json.dumps(reading1.get("hover_events", [])),
        json.dumps(reading1.get("click_events", [])),
        reading1.get("click_count", 0),
        reading1.get("unique_words_translated", 0),
        json.dumps(reading1.get("comprehension", [])),
        reading2.get("text_id", ""),
        reading2.get("condition", ""),
        reading2.get("reading_time_ms", 0),
        json.dumps(reading2.get("hover_events", [])),
        json.dumps(reading2.get("click_events", [])),
        reading2.get("click_count", 0),
        reading2.get("unique_words_translated", 0),
        json.dumps(reading2.get("comprehension", [])),
        json.dumps(payload_data["surveys"]["per_task_1"]),
        json.dumps(payload_data["surveys"]["per_task_2"]),
        json.dumps(payload_data["surveys"]["post_study"]),
        json.dumps(payload_data["surveys"]["demographics"])
    ]
    
    # Write to a temp CSV file in the backend folder (with BOM for Hebrew)
    temp_csv_path = os.path.join(BASE_DIR, f"temp_{req.prolific_pid}.csv")
    with open(temp_csv_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerow(row)
"""

# Apply replacement using regex from # 1. Log final submission to DB up to # 3. Trigger Qualtrics
pattern = re.compile(r'    # 1\. Log final submission to DB.*?    # 3\. Trigger Qualtrics API Sync', re.DOTALL)
content = pattern.sub(new_submit_logic + "    # 3. Trigger Qualtrics API Sync", content)

with open('main.py', 'w') as f:
    f.write(content)
