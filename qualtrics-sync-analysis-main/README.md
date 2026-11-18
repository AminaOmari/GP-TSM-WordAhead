# Qualtrics Sync & Analysis CLI Explorer

A clean, modern Python utility designed to explore, understand, and demonstrate how to programmatically interact with the **Qualtrics v3 REST API**.

This project provides a step-by-step interactive command-line experience that generates customer feedback survey responses, uploads them to Qualtrics, monitors an asynchronous results export through a polling loop, and compiles a comprehensive statistical analysis report (Net Promoter Score, CSAT, geographic cohorts) directly in your terminal.

---

## 📂 Project Structure

All source code is contained under the best-practice `src/` folder for packaging and readability:

```
quick-fermi/
├── src/
│   ├── __init__.py           # Declares src as a Python package
│   ├── config.py             # Credentials loader & mode selector (.env file helper)
│   ├── qualtrics_client.py   # REST API caller using 'requests' (supports Live & Simulation modes)
│   ├── data_manager.py       # Local dataset generator and statistical parsing engine
│   └── main.py               # Interactive step-by-step console dashboard driver
├── .env.example              # Template configuration for live credentials
├── pyproject.toml            # Project packaging & dependency management with uv
└── README.md                 # Project technical documentation (this file)
```

---

## 🛠️ Package Management with `uv`

This project is built using modern Python standards and is managed with [**`uv`**](https://github.com/astral-sh/uv), an extremely fast Python package manager and resolver written in Rust.

### Setup and Installation

1. **Verify `uv` is installed**:
   ```powershell
   uv --version
   ```

2. **Run the utility instantly**:
   You do not need to create and activate a virtual environment manually! `uv` automatically resolves the `pyproject.toml` dependencies, manages the virtual environment in the background, and runs our mapped script:
   ```powershell
   uv run qualtrics-sync
   ```

---

## 💡 Qualtrics API v3 Technical Reference

The utility implements standard integration protocols using the `requests` library. Here are the core endpoints utilized:

### 1. Test Connection
Used to verify that your API token is valid and that you have permissions to edit the specified survey.
* **HTTP Method**: `GET`
* **Endpoint**: `https://{datacenterId}.qualtrics.com/API/v3/surveys/{surveyId}`
* **Header**: `X-API-TOKEN: {apiToken}`

### 2. Response Import (Send Data)
Enables importing pre-existing survey responses in CSV/TSV format.
* **HTTP Method**: `POST`
* **Endpoint**: `https://{datacenterId}.qualtrics.com/API/v3/surveys/{surveyId}/import-responses`
* **Headers**: `X-API-TOKEN: {apiToken}` (sent as `multipart/form-data`)
* **Payload**: Form-data parameter `file` pointing to your CSV.
* **Response**: Returns a unique `progressId` (e.g. `IMPORT_1234567`) to poll for status.

### 3. Response Export (Trigger Asynchronous Results Retrieval)
Since exporting thousands of survey responses can take time, Qualtrics processes exports asynchronously.
* **HTTP Method**: `POST`
* **Endpoint**: `https://{datacenterId}.qualtrics.com/API/v3/surveys/{surveyId}/export-responses`
* **Payload**:
  ```json
  {
    "format": "csv",
    "useLabels": true
  }
  ```
* **Response**: Returns a unique export `progressId` (e.g., `ES_987654321`).

### 4. Poll Export Status
Your script polls this endpoint in a loop (e.g., every 2 seconds) until the status reaches `"complete"`.
* **HTTP Method**: `GET`
* **Endpoint**: `https://{datacenterId}.qualtrics.com/API/v3/surveys/{surveyId}/export-responses/{progressId}`
* **Response**:
  ```json
  {
    "result": {
      "percentComplete": 100.0,
      "status": "complete",
      "fileId": "LF_11223344"
    }
  }
  ```

### 5. Download results ZIP
Retrieves the completed export as a compressed ZIP file.
* **HTTP Method**: `GET`
* **Endpoint**: `https://{datacenterId}.qualtrics.com/API/v3/surveys/{surveyId}/export-responses/{fileId}/file`
* **Extraction**: The script receives the binary stream, decompresses it in-memory using Python's `zipfile` module, and loads the CSV content without writing temporary files to the disk.

---

## 🏃 How to Run

### 1. Educational Simulation Mode (Offline Dry-Run)
If you do not have a Qualtrics developer API token, you can run the utility in **Simulation Mode** by explicitly passing the `--simulation` (or `--sim` / `-s`) flag:

The tool prints:
* Every REST API endpoint, headers, and payloads.
* The **equivalent `cURL` statement** for each request.
* Realistic simulated JSON responses.
* A live asynchronous polling timer incrementing (30% -> 75% -> 100%).
* Full analysis and country cohort breakdown in an ASCII dashboard.

```powershell
uv run qualtrics-sync --simulation
```

### 2. Live Integration Mode (Real Qualtrics Survey)
To run against your active Qualtrics account, set up your credentials:

1. Copy `.env.example` to `.env`:
   ```powershell
   copy .env.example .env
   ```
2. Open `.env` and fill in your details:
   * **`QUALTRICS_API_TOKEN`**: Generated in your Qualtrics Account Settings > Qualtrics IDs.
   * **`QUALTRICS_DATACENTER`**: Your instance ID or datacenter prefix (e.g., `ca1`, `fra1`, `co1`).
   * **`QUALTRICS_SURVEY_ID`**: The active survey ID (`SV_...`).
3. Run the CLI tool:
   ```powershell
   uv run qualtrics-sync
   ```
*(Note: If no credentials are configured and no simulation flag is passed, the CLI will display setup instructions and exit.)*

---

## 📊 local Stats Engine Calculations

The analytical results generated in **Step 5** are computed using the following industry-standard formulas:

* **Net Promoter Score (NPS)**:
  * Respondents rating `9` or `10` are classified as **Promoters**.
  * Respondents rating `7` or `8` are classified as **Passives**.
  * Respondents rating `0` through `6` are classified as **Detractors**.
  * $\text{NPS Score} = \text{Promoters \%} - \text{Detractors \%}$ (expressed as a decimal or a value between -100 and +100).
* **Customer Satisfaction (CSAT)**:
  * Simple average scoring on standard 1-to-5 Likert scales for Product Quality and Support Ratings.
* **Geographical Cohort Grouping**:
  * Cross-tabulation grouping all metrics by the responder's country of origin to identify geographic trends.
