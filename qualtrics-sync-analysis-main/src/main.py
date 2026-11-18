import csv
import os
import sys
import time
from src.config import Config
from src.qualtrics_client import QualtricsClient
from src.data_manager import DataManager

def print_banner(text: str):
    """Prints a styled section header banner."""
    print("\n" + "="*80)
    print(f" {text.center(78)} ")
    print("="*80)

def print_kpi_card(label: str, value: str, color_indicator: str = ""):
    """Prints a formatted KPI dashboard element."""
    indicator = f" [{color_indicator}]" if color_indicator else ""
    print(f"  * {label:<28}: {value:<12}{indicator}")

def run_workflow(simulation_mode: bool):
    """
    Executes the step-by-step Qualtrics REST API integration exploration.
    """
    mode_name = "SIMULATION / DRY-RUN" if simulation_mode else "LIVE INTEGRATION"
    print_banner(f"STARTING WORKFLOW - MODE: {mode_name}")
    
    client = QualtricsClient(simulation_mode=simulation_mode)
    
    # --------------------------------------------------------------------------
    # STEP 1: Test Connection
    # --------------------------------------------------------------------------
    print("\n[STEP 1] Testing Connection to Qualtrics Survey API...")
    conn_result = client.test_connection()
    
    if not conn_result.get("success"):
        print(f"[ERROR] Connection failed!")
        print(f"   Error Details: {conn_result.get('error_text')}")
        print(f"   HTTP Status Code: {conn_result.get('error_code')}")
        print("\nPlease verify your .env credentials and try again.")
        return False
        
    print(f"[ OK ] Connection successful!")
    print(f"   Target Survey: {conn_result.get('survey_name')}")
    print(f"   Survey Status: {'Active' if conn_result.get('isActive') else 'Inactive'}")
    time.sleep(1.5)

    # --------------------------------------------------------------------------
    # STEP 2: Generate Sample Survey Data
    # --------------------------------------------------------------------------
    print("\n[STEP 2] Generating Local Sample Survey Responses...")
    local_csv_path = os.path.join("data", "sample_responses.csv")
    DataManager.generate_sample_responses(local_csv_path)
    
    print(f"[ OK ] Generated sample response file: {local_csv_path}")
    print("\n--- [Previewing CSV Responses (First 5 Rows)] ---")
    print(f"{'Response ID':<13} | {'NPS (0-10)':<10} | {'Product (1-5)':<13} | {'Support (1-5)':<13} | {'Country':<10}")
    print("-" * 68)
    
    # Parse generated CSV for preview using csv.reader to correctly handle quotes
    with open(local_csv_path, mode="r", newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader)  # Skip header row
        for i, row in enumerate(reader):
            if i >= 5:  # Preview first 5 rows
                break
            if len(row) >= 6:
                print(f"{row[0]:<13} | {row[1]:^10} | {row[2]:^13} | {row[3]:^13} | {row[5]:<10}")
    print("-------------------------------------------------")
    time.sleep(1.5)

    # --------------------------------------------------------------------------
    # STEP 3: Send Data (Import Responses)
    # --------------------------------------------------------------------------
    print("\n[STEP 3] Uploading CSV Data to Qualtrics (Response Import API)...")
    print("   Uploading file to: POST /surveys/{surveyId}/import-responses")
    
    import_result = client.import_responses(local_csv_path)
    if not import_result.get("success"):
        print(f"[ERROR] Response Import failed!")
        print(f"   Details: {import_result.get('error_text')}")
        return False
        
    import_progress_id = import_result.get("progress_id")
    print(f"[ OK ] Data upload initiated successfully!")
    print(f"   Qualtrics Job Progress ID: {import_progress_id}")
    time.sleep(1.5)

    # --------------------------------------------------------------------------
    # STEP 4: Retrieve Results (Response Export Asynchronous Polling)
    # --------------------------------------------------------------------------
    print("\n[STEP 4] Fetching Synced Survey Responses (Asynchronous Response Export API)...")
    print("   Initiating Response Export request...")
    
    export_trigger = client.start_response_export()
    if not export_trigger.get("success"):
        print(f"[ERROR] Failed to start Response Export!")
        print(f"   Details: {export_trigger.get('error_text')}")
        return False
        
    export_progress_id = export_trigger.get("progress_id")
    print(f"[ OK ] Export job started. Progress ID: {export_progress_id}")
    print("   Starting active polling loop (monitoring progress)...")
    
    file_id = None
    poll_count = 0
    
    while True:
        poll_count += 1
        print(f"   [Poll #{poll_count}] Checking status of export job...")
        
        status_result = client.get_export_progress(export_progress_id)
        if not status_result.get("success"):
            print(f"[ERROR] Polling error: {status_result.get('error_text')}")
            return False
            
        percent = status_result.get("percent_complete", 0.0)
        status = status_result.get("status", "")
        
        print(f"   -> Status: '{status}' | Completion: {percent}%")
        
        if status == "complete" or percent >= 100.0:
            file_id = status_result.get("file_id")
            print(f"[ OK ] Export job completed! File ID obtained: {file_id}")
            break
        elif status == "failed":
            print(f"[ERROR] Qualtrics reported export job failure.")
            return False
            
        time.sleep(2)  # Wait 2 seconds before polling again
        
    print(f"\n   Downloading export archive (fileId: {file_id}) and extracting in-memory...")
    download_result = client.download_export_file(file_id)
    
    if not download_result.get("success"):
        print(f"[ERROR] Download failed!")
        print(f"   Details: {download_result.get('error_text')}")
        return False
        
    csv_content = download_result.get("csv_content", "")
    print(f"[ OK ] Successfully downloaded and decompressed response ZIP in-memory!")
    print(f"   Received {len(csv_content.encode('utf-8'))} bytes of CSV survey results.")
    time.sleep(1.5)

    # --------------------------------------------------------------------------
    # STEP 5: Present Results (Analysis Dashboard)
    # --------------------------------------------------------------------------
    print("\n[STEP 5] Parsing Results and Compiling Statistical Report...")
    stats = DataManager.analyze_results(csv_content)
    
    if "error" in stats:
        print(f"[ERROR] Analysis failed: {stats['error']}")
        return False

    # Present beautiful ASCII dashboard report
    print_banner("QUALTRICS SURVEY ANALYSIS REPORT")
    
    print("\n--- OVERVIEW KEY PERFORMANCE INDICATORS ---")
    print_kpi_card("Total Responses Parsed", f"{stats['total_responses']} respondents")
    
    nps = stats["nps"]
    nps_val = nps["score"]
    
    # Classify NPS rating health
    nps_status = "NEEDS IMPROVEMENT"
    if nps_val >= 50:
        nps_status = "EXCELLENT"
    elif nps_val >= 30:
        nps_status = "GOOD"
    elif nps_val >= 0:
        nps_status = "HEALTHY"
        
    print_kpi_card("Net Promoter Score (NPS)", f"{nps_val:+.1f}", nps_status)
    print_kpi_card("Avg Product Quality rating", f"{stats['averages']['product_quality']:.2f} / 5.0")
    print_kpi_card("Avg Customer Support rating", f"{stats['averages']['customer_support']:.2f} / 5.0")
    
    print("\n--- NET PROMOTER SCORE BREAKDOWN ---")
    print_kpi_card("Promoters (Score 9-10)", f"{nps['promoters_count']:>2} ({nps['promoters_percent']:.1f}%)", "LOYALISTS")
    print_kpi_card("Passives   (Score 7-8)", f"{nps['passives_count']:>2} ({nps['passives_percent']:.1f}%)", "INDIFFERENT")
    print_kpi_card("Detractors (Score 0-6)", f"{nps['detractors_count']:>2} ({nps['detractors_percent']:.1f}%)", "CHURN_RISK")
    
    print("\n--- COHORT SEGMENTATION (BY COUNTRY) ---")
    print(f"  {'Country':<12} | {'Count':<6} | {'NPS':<10} | {'Avg Product':<12} | {'Avg Support':<12}")
    print("  " + "-" * 62)
    for country, items in stats["countries"].items():
        nps_str = f"{items['NPS']:+.1f}"
        print(f"  {country:<12} | {items['Count']:^6} | {nps_str:^10} | {items['Avg Product Quality']:^12.2f} | {items['Avg Customer Support']:^12.2f}")
    print("  " + "-" * 62)

    print("\n--- QUALITATIVE USER FEEDBACK COMMENTS ---")
    for idx, feedback in enumerate(stats["feedbacks"][:4], 1): # Show up to 4 comments
        print(f"  {idx}. \"{feedback}\"")
    if len(stats["feedbacks"]) > 4:
        print(f"  ... (+ {len(stats['feedbacks']) - 4} more comments)")

    print("\n" + "="*80)
    print("                    END OF QUALTRICS INTEGRATION SUMMARY")
    print("="*80 + "\n")
    return True

def main():
    import argparse
    
    print("="*80)
    print("               QUALTRICS API SYNC & ANALYSIS CLI EXPLORER")
    print("="*80)
    
    parser = argparse.ArgumentParser(
        description="Qualtrics API Sync & Analysis CLI Explorer",
        add_help=False
    )
    parser.add_argument(
        "--simulation", "--sim", "-s",
        action="store_true",
        help="Run the script in simulated dry-run mode (does not require live Qualtrics API credentials)."
    )
    parser.add_argument(
        "--help", "-h",
        action="store_true",
        help="Show this help message and exit."
    )
    
    args, unknown = parser.parse_known_args()
    
    if args.help:
        print("\nOptions:")
        print("  -s, --simulation, --sim   Run in simulated dry-run mode (no credentials required).")
        print("  -h, --help                Show this help message and exit.")
        print("\nBy default, the script runs in Live Mode if credentials are configured.")
        print("If credentials are not found, instructions for setting them up are displayed.")
        sys.exit(0)
        
    is_live = Config.is_live_configured()
    
    if args.simulation:
        print("\n[EXPLICIT MODE] Running in simulated EDUCATIONAL DRY-RUN Mode.")
        print("  This showcases full API logs, cURL equivalents, and polls progress offline.")
        sim_mode = True
    elif is_live:
        print("\n[CONFIG DETECTED] Valid credentials found in your environment!")
        print("  Datacenter ID :", Config.DATACENTER)
        print("  Survey ID     :", Config.SURVEY_ID)
        print("  Starting Live Integration Mode (communicating directly with Qualtrics API)...")
        sim_mode = False
    else:
        print("\n" + "="*80)
        print(" [MISSING CONFIGURATION] Qualtrics API Credentials Not Found ".center(80, "="))
        print("="*80)
        print("\nTo run the live integration, please set up your Qualtrics credentials:")
        print("\n1. Copy the example environment file to .env:")
        print("   copy .env.example .env")
        print("\n2. Edit the .env file and replace the placeholder values with your credentials:")
        print("   - QUALTRICS_API_TOKEN  : Your unique Qualtrics API token")
        print("                            (found under Account Settings > Qualtrics IDs)")
        print("   - QUALTRICS_DATACENTER : Your Qualtrics Data Center prefix (e.g., ca1, fra1, etc.)")
        print("   - QUALTRICS_SURVEY_ID  : The ID of your target Qualtrics survey (e.g., SV_...)")
        print("\nAlternatively, you can set these as environment variables in your terminal.")
        print("\n" + "-"*80)
        print(" EDUCATIONAL DRY-RUN / SIMULATION MODE ".center(80, "-"))
        print("-"*80)
        print("To explore the tool without real credentials, you can explicitly run in simulation mode:")
        print("   uv run qualtrics-sync --simulation")
        print("="*80 + "\n")
        sys.exit(1)
        
    try:
        run_workflow(simulation_mode=sim_mode)
    except KeyboardInterrupt:
        print("\n\nExecution cancelled by user. Exiting.")
        sys.exit(0)

if __name__ == "__main__":
    main()
