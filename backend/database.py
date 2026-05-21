import os
import sqlite3

# Check if we are running on Render with a persistent disk volume mounted at /data
if os.path.exists("/data") and os.path.isdir("/data"):
    DB_PATH = "/data/wordahead.db"
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
