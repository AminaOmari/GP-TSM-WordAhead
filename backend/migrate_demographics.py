import sqlite3
import os
import sys

# Ensure backend directory is in the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database import DB_PATH

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at: {DB_PATH}")
        return
        
    print(f"Connecting to database at: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Fetch current columns
    cursor.execute("PRAGMA table_info(participant_meta)")
    columns = [row[1] for row in cursor.fetchall()]
    print(f"Current columns: {columns}")
    
    # 2. Rename course_level to education if course_level exists and education doesn't
    if "course_level" in columns and "education" not in columns:
        print("Renaming 'course_level' to 'education'...")
        cursor.execute("ALTER TABLE participant_meta RENAME COLUMN course_level TO education")
        conn.commit()
        
    # 3. Add translation_tools_used if it doesn't exist
    if "translation_tools_used" not in columns:
        print("Adding 'translation_tools_used' column...")
        cursor.execute("ALTER TABLE participant_meta ADD COLUMN translation_tools_used TEXT")
        conn.commit()
        
    # 4. Drop removed columns if they exist
    for col in ["other_languages", "academic_year", "field_of_study"]:
        if col in columns:
            print(f"Dropping '{col}' column...")
            cursor.execute(f"ALTER TABLE participant_meta DROP COLUMN {col}")
            conn.commit()
            
    print("Migration complete!")
    conn.close()

if __name__ == "__main__":
    migrate()
