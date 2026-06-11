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
            skimmed_words INTEGER DEFAULT 0,
            skimmed_difficult_words INTEGER DEFAULT 0,
            analysis_results TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS experiment_participants (
            prolific_pid TEXT PRIMARY KEY,
            lextale_score REAL NOT NULL,
            cefr_level TEXT NOT NULL,
            text_format TEXT NOT NULL,
            sequence TEXT NOT NULL,
            text_pair TEXT NOT NULL,
            text_order TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS experiment_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prolific_pid TEXT NOT NULL,
            event_type TEXT NOT NULL,
            payload TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()

    # Try adding the skimmed_words column if it doesn't exist (for existing DBs)
    try:
        cursor.execute("SELECT skimmed_words FROM text_analyses LIMIT 1")
    except sqlite3.OperationalError:
        print("Adding skimmed_words column to text_analyses table...")
        try:
            cursor.execute("ALTER TABLE text_analyses ADD COLUMN skimmed_words INTEGER DEFAULT 0")
            conn.commit()
            print("Successfully added skimmed_words column!")
        except Exception as alter_err:
            print(f"Error altering table text_analyses: {alter_err}")

    # Try adding the skimmed_difficult_words column if it doesn't exist (for existing DBs)
    try:
        cursor.execute("SELECT skimmed_difficult_words FROM text_analyses LIMIT 1")
    except sqlite3.OperationalError:
        print("Adding skimmed_difficult_words column to text_analyses table...")
        try:
            cursor.execute("ALTER TABLE text_analyses ADD COLUMN skimmed_difficult_words INTEGER DEFAULT 0")
            conn.commit()
            print("Successfully added skimmed_difficult_words column!")
        except Exception as alter_err:
            print(f"Error altering table text_analyses: {alter_err}")

    # Try adding the analysis_results column if it doesn't exist (for existing DBs)
    try:
        cursor.execute("SELECT analysis_results FROM text_analyses LIMIT 1")
    except sqlite3.OperationalError:
        print("Adding analysis_results column to text_analyses table...")
        try:
            cursor.execute("ALTER TABLE text_analyses ADD COLUMN analysis_results TEXT")
            conn.commit()
            print("Successfully added analysis_results column!")
        except Exception as alter_err:
            print(f"Error altering table text_analyses: {alter_err}")

    conn.close()
    print(f"✅ SQLite Database initialized at: {DB_PATH}")
