import io
import os
import time
import zipfile
import csv
import json
from datetime import datetime, timezone
import requests
from src.config import Config
from src.data_manager import DataManager

class QualtricsClient:
    """
    Client wrapper for standard Qualtrics API v3 interactions.
    Supports a fully-featured Simulation/Dry-Run mode which prints cURL commands,
    API endpoint requests, and realistic JSON responses.
    """

    def __init__(self, simulation_mode: bool = False):
        self.simulation_mode = simulation_mode
        self.base_url = Config.get_base_url()
        self.headers = Config.get_headers()
        self.survey_id = Config.SURVEY_ID or "SV_SIMULATED_SURVEY_ID"
        
        # State tracking for polling progress in simulation mode
        self._sim_export_progress = {}

    def _print_curl_instruction(self, method: str, url: str, headers: dict, data=None, files=None, raw_binary_file: str = None):
        """
        Helper method to output educational cURL equivalent commands in the terminal
        so the user learns how to replicate the requests manually.
        """
        print("\n" + "="*80)
        print(" [EDUCATIONAL: Equivalent API Request to Qualtrics] ")
        print("="*80)
        
        curl_headers = " \\\n  ".join([f'-H "{k}: {v}"' for k, v in headers.items() if k != "X-API-TOKEN"])
        # Obfuscate token for security in printouts, but keep it clear
        curl_headers += ' \\\n  -H "X-API-TOKEN: **********' + (headers.get("X-API-TOKEN", "")[-4:] if len(headers.get("X-API-TOKEN", "")) > 4 else "") + '"'
        
        if raw_binary_file:
            print(f"curl -X {method} \"{url}\" \\\n  {curl_headers} \\\n  --data-binary \"@{raw_binary_file}\"")
        elif files:
            file_param = "file=@sample_responses.csv"
            print(f"curl -X {method} \"{url}\" \\\n  {curl_headers} \\\n  -F \"{file_param}\"")
        elif data:
            import json
            data_str = json.dumps(data) if isinstance(data, dict) else str(data)
            print(f"curl -X {method} \"{url}\" \\\n  {curl_headers} \\\n  -d '{data_str}'")
        else:
            print(f"curl -X {method} \"{url}\" \\\n  {curl_headers}")
        print("="*80 + "\n")

    def test_connection(self) -> dict:
        """
        Validates API access and survey availability by fetching Survey Info.
        API Endpoint: GET /v3/surveys/{surveyId}
        """
        url = f"{self.base_url}/surveys/{self.survey_id}"
        
        if self.simulation_mode:
            self._print_curl_instruction("GET", url, self.headers)
            time.sleep(0.5)  # Simulate small network latency
            return {
                "success": True,
                "survey_name": "Simulated Customer Satisfaction Survey",
                "isActive": True,
                "response_count_estimate": 10
            }

        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            if response.status_code == 200:
                result = response.json().get("result", {})
                return {
                    "success": True,
                    "survey_name": result.get("name", "Unknown Survey"),
                    "isActive": result.get("isActive", False)
                }
            else:
                return {
                    "success": False,
                    "error_code": response.status_code,
                    "error_text": response.text
                }
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error_text": str(e)
            }

    def _format_for_qualtrics(self, input_path: str) -> str:
        """
        Ensures the CSV file has the exact 3-row header and standard metadata
        columns required by the Qualtrics response import engine.
        Returns the path to a formatted temporary file (or original if already formatted).
        """
        try:
            with open(input_path, 'r', encoding='utf-8-sig') as f:
                reader = list(csv.reader(f))
            if not reader:
                return input_path
            
            headers = reader[0]
            data_rows = reader[1:]
            
            # If already has 3-row header with ImportId JSON
            if len(reader) >= 3 and reader[2] and reader[2][0].startswith('{'):
                return input_path
            
            row1_std = ['StartDate','EndDate','Status','IPAddress','Progress','Duration (in seconds)','Finished','RecordedDate','ResponseId','RecipientLastName','RecipientFirstName','RecipientEmail','ExternalReference','LocationLatitude','LocationLongitude','DistributionChannel','UserLanguage']
            row2_std = ['Start Date','End Date','Response Type','IP Address','Progress','Duration (in seconds)','Finished','Recorded Date','Response ID','Recipient Last Name','Recipient First Name','Recipient Email','External Data Reference','Location Latitude','Location Longitude','Distribution Channel','User Language']
            row3_std = ['{"ImportId":"startDate","timeZone":"Z"}','{"ImportId":"endDate","timeZone":"Z"}','{"ImportId":"status"}','{"ImportId":"ipAddress"}','{"ImportId":"progress"}','{"ImportId":"duration"}','{"ImportId":"finished"}','{"ImportId":"recordedDate","timeZone":"Z"}','{"ImportId":"_recordId"}','{"ImportId":"recipientLastName"}','{"ImportId":"recipientFirstName"}','{"ImportId":"recipientEmail"}','{"ImportId":"externalDataReference"}','{"ImportId":"locationLatitude"}','{"ImportId":"locationLongitude"}','{"ImportId":"distributionChannel"}','{"ImportId":"userLanguage"}']
            
            custom_cols = [c for c in headers if c not in row1_std]
            custom_idx = [headers.index(c) for c in custom_cols]
            
            row1 = row1_std + custom_cols
            row2 = row2_std + custom_cols
            row3 = row3_std + [json.dumps({"ImportId": c}) for c in custom_cols]
            
            now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
            formatted_rows = [row1, row2, row3]
            for row in data_rows:
                std_vals = [now_str, now_str, "0", "", "100", "0", "1", now_str, "", "", "", "", "", "", "", "anonymous", "EN"]
                custom_vals = [row[i] if i < len(row) else "" for i in custom_idx]
                formatted_rows.append(std_vals + custom_vals)
                
            formatted_path = input_path + ".qualtrics_formatted.csv"
            with open(formatted_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerows(formatted_rows)
            return formatted_path
        except Exception as e:
            print(f"Warning: could not reformat CSV for Qualtrics: {e}")
            return input_path

    def import_responses(self, csv_file_path: str) -> dict:
        """
        Uploads survey response CSV to Qualtrics survey.
        API Endpoint: POST /v3/surveys/{surveyId}/import-responses
        """
        url = f"{self.base_url}/surveys/{self.survey_id}/import-responses"
        
        if self.simulation_mode:
            # Set the headers simulation to match raw binary upload
            headers = {k: v for k, v in self.headers.items() if k.lower() != "content-type"}
            headers["Content-Type"] = "text/csv"
            self._print_curl_instruction("POST", url, headers, raw_binary_file="sample_responses.csv")
            time.sleep(0.8)
            # Qualtrics returns a progress ID to poll for status
            progress_id = "SIM_IMP_555888222"
            print(f"Server responded with simulated 200 OK: progressId = {progress_id}")
            return {
                "success": True,
                "progress_id": progress_id
            }

        upload_path = self._format_for_qualtrics(csv_file_path)
        try:
            with open(upload_path, "rb") as f:
                headers = {
                    "X-API-TOKEN": self.headers.get("X-API-TOKEN", "").strip(),
                    "Content-Type": "text/csv; charset=UTF-8"
                }
                response = requests.post(url, headers=headers, data=f, timeout=20)
                
            if response.status_code == 200:
                result = response.json().get("result", {})
                progress_id = result.get("progressId")
                
                # Poll for up to 4 seconds to confirm processing success
                if progress_id:
                    for _ in range(4):
                        time.sleep(1)
                        try:
                            check = requests.get(f"{url}/{progress_id}", headers={"X-API-TOKEN": headers["X-API-TOKEN"]}, timeout=5).json()
                            status = check.get("result", {}).get("status")
                            if status == "complete":
                                return {
                                    "success": True,
                                    "progress_id": progress_id,
                                    "responses_imported": check.get("result", {}).get("responsesImported", 1)
                                }
                            elif status == "failed":
                                err = check.get("result", {}).get("error", {}).get("message", "Import processing failed")
                                return {
                                    "success": False,
                                    "error_text": f"Qualtrics processing error: {err}"
                                }
                        except Exception:
                            break

                return {
                    "success": True,
                    "progress_id": progress_id
                }
            else:
                return {
                    "success": False,
                    "error_code": response.status_code,
                    "error_text": f"HTTP {response.status_code}: {response.text}"
                }
        except Exception as e:
            return {
                "success": False,
                "error_text": str(e)
            }
        finally:
            if upload_path != csv_file_path and os.path.exists(upload_path):
                try:
                    os.remove(upload_path)
                except Exception:
                    pass

    def start_response_export(self) -> dict:
        """
        Triggers an asynchronous Response Export job.
        API Endpoint: POST /v3/surveys/{surveyId}/export-responses
        """
        url = f"{self.base_url}/surveys/{self.survey_id}/export-responses"
        payload = {
            "format": "csv",
            "useLabels": True  # Instructs Qualtrics to download full labels where possible
        }

        if self.simulation_mode:
            self._print_curl_instruction("POST", url, self.headers, data=payload)
            time.sleep(0.8)
            progress_id = "SIM_EXP_999000111"
            self._sim_export_progress[progress_id] = 0  # Initialize simulated percentage tracking
            print(f"Export Job Triggered! Simulated progressId = {progress_id}")
            return {
                "success": True,
                "progress_id": progress_id
            }

        try:
            response = requests.post(url, headers=self.headers, json=payload, timeout=10)
            if response.status_code == 200:
                result = response.json().get("result", {})
                return {
                    "success": True,
                    "progress_id": result.get("progressId")
                }
            else:
                return {
                    "success": False,
                    "error_code": response.status_code,
                    "error_text": response.text
                }
        except Exception as e:
            return {
                "success": False,
                "error_text": str(e)
            }

    def get_export_progress(self, progress_id: str) -> dict:
        """
        Polls the status of the Response Export job.
        API Endpoint: GET /v3/surveys/{surveyId}/export-responses/{progressId}
        """
        url = f"{self.base_url}/surveys/{self.survey_id}/export-responses/{progress_id}"

        if self.simulation_mode:
            self._print_curl_instruction("GET", url, self.headers)
            time.sleep(0.5)
            
            # Retrieve or initialize simulated percentage complete
            pct = self._sim_export_progress.get(progress_id, 0)
            
            # Increment simulation progress on each poll
            if pct < 30:
                new_pct = 30
                status = "inProgress"
            elif pct < 75:
                new_pct = 75
                status = "inProgress"
            else:
                new_pct = 100
                status = "complete"
                
            self._sim_export_progress[progress_id] = new_pct
            
            sim_response = {
                "percentComplete": float(new_pct),
                "status": status
            }
            if status == "complete":
                sim_response["fileId"] = "SIM_FILE_888777"
                
            return {
                "success": True,
                "percent_complete": float(new_pct),
                "status": status,
                "file_id": sim_response.get("fileId")
            }

        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            if response.status_code == 200:
                result = response.json().get("result", {})
                return {
                    "success": True,
                    "percent_complete": result.get("percentComplete", 0.0),
                    "status": result.get("status", "failed"),
                    "file_id": result.get("fileId")
                }
            else:
                return {
                    "success": False,
                    "error_code": response.status_code,
                    "error_text": response.text
                }
        except Exception as e:
            return {
                "success": False,
                "error_text": str(e)
            }

    def download_export_file(self, file_id: str) -> dict:
        """
        Downloads the response export zip archive and extracts the survey CSV in-memory.
        API Endpoint: GET /v3/surveys/{surveyId}/export-responses/{fileId}/file
        """
        url = f"{self.base_url}/surveys/{self.survey_id}/export-responses/{file_id}/file"

        if self.simulation_mode:
            self._print_curl_instruction("GET", url, self.headers)
            time.sleep(0.8)
            # Return our high-quality simulated CSV with 3-row header
            simulated_csv = DataManager.get_simulated_export_csv()
            return {
                "success": True,
                "csv_content": simulated_csv
            }

        try:
            response = requests.get(url, headers=self.headers, timeout=20, stream=True)
            if response.status_code == 200:
                # Read zip archive in-memory
                zip_data = io.BytesIO(response.content)
                
                with zipfile.ZipFile(zip_data) as z:
                    # Look for the exported CSV file in the ZIP archive
                    csv_files = [name for name in z.namelist() if name.lower().endswith(".csv")]
                    
                    if not csv_files:
                        return {
                            "success": False,
                            "error_text": "No CSV file found inside the downloaded ZIP archive."
                        }
                    
                    # Extract the first CSV file
                    csv_filename = csv_files[0]
                    with z.open(csv_filename) as f:
                        csv_content = f.read().decode("utf-8")
                        
                return {
                    "success": True,
                    "csv_content": csv_content
                }
            else:
                return {
                    "success": False,
                    "error_code": response.status_code,
                    "error_text": response.text
                }
        except Exception as e:
            return {
                "success": False,
                "error_text": str(e)
            }
