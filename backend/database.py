import os
import sqlite3

# Check if we are running on Render with a persistent disk volume mounted at /data
if os.path.exists("/data") and os.path.isdir("/data"):
    # Ensure it is actually writable to avoid root-owned read-only directory issues in some containers
    try:
        test_file = "/data/.write_test"
        with open(test_file, "w") as f:
            f.write("test")
        os.remove(test_file)
        DB_PATH = "/data/wordahead.db"
    except Exception as e:
        print(f"⚠️ /data directory is not writable ({e}). Falling back to local directory.")
        # Fall back to local folder (within backend folder)
        DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "wordahead.db")
else:
    # Local development path (within backend folder)
    DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "wordahead.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS text_analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text_preview TEXT NOT NULL,
            raw_text TEXT NOT NULL,
            user_level TEXT NOT NULL,
            total_words INTEGER NOT NULL,
            difficult_words INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()
    print(f"✅ SQLite Database initialized at: {DB_PATH}")
