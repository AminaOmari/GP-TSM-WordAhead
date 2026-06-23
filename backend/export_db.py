import os
import sqlite3
import csv
from database import DB_PATH

def export_table_to_csv(conn, table_name, output_dir):
    cursor = conn.cursor()
    try:
        cursor.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()
        
        if not rows:
            print(f"ℹ️ Table '{table_name}' is empty. Skipping CSV generation.")
            return

        # Get column names
        column_names = [description[0] for description in cursor.description]
        
        csv_file_path = os.path.join(output_dir, f"{table_name}.csv")
        with open(csv_file_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow(column_names)
            writer.writerows(rows)
        
        print(f"✅ Exported '{table_name}' to: {csv_file_path} ({len(rows)} rows)")
    except Exception as e:
        print(f"❌ Error exporting table '{table_name}': {e}")

def main():
    print("="*60)
    print("           WORDAHEAD SQLite DATA EXPORTER")
    print("="*60)
    
    if not os.path.exists(DB_PATH):
        print(f"❌ Database file not found at: {DB_PATH}")
        print("Please make sure the backend has run and generated data.")
        return

    print(f"Reading database from: {DB_PATH}")
    
    # Create output directory
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(project_root, "data_exports")
    os.makedirs(output_dir, exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall() if not row[0].startswith("sqlite_")]
    
    if not tables:
        print("ℹ️ No tables found in the database.")
        conn.close()
        return

    print(f"Found tables: {', '.join(tables)}")
    print("-"*60)
    
    for table in tables:
        export_table_to_csv(conn, table, output_dir)
        
    conn.close()
    print("="*60)
    print(f"🎉 Export complete! All CSV files saved in: {output_dir}")
    print("="*60)

if __name__ == "__main__":
    main()
