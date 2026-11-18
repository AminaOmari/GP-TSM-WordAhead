import os
from dotenv import load_dotenv

# Load environment variables from a .env file if present
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(dotenv_path)

class Config:
    """
    Manages Qualtrics integration settings, including API token, datacenter ID,
    and survey ID. Automatically detects whether real credentials are provided
    to switch between Live Mode and simulated Dry-Run Mode.
    """
    API_TOKEN = os.getenv("QUALTRICS_API_TOKEN") or "IqXb1TfDGvo8lnO9AnPsVnDHowgRACjv0dGfVtiX"
    DATACENTER = os.getenv("QUALTRICS_DATACENTER") or "fra1"
    SURVEY_ID = os.getenv("QUALTRICS_SURVEY_ID") or "SV_8AEVYmqsH5Gd6xU"

    @classmethod
    def is_live_configured(cls) -> bool:
        """
        Checks whether all credentials needed for live Qualtrics API interaction
        are present and non-empty.
        """
        # Ensure credentials are not just placeholders from the example
        placeholders = {"your_api_token_here", "your_datacenter_here", "your_survey_id_here", ""}
        token = (os.getenv("QUALTRICS_API_TOKEN") or cls.API_TOKEN or "").strip()
        dc = (os.getenv("QUALTRICS_DATACENTER") or cls.DATACENTER or "").strip()
        sid = (os.getenv("QUALTRICS_SURVEY_ID") or cls.SURVEY_ID or "").strip()
        
        token_ok = token and token not in placeholders
        dc_ok = dc and dc not in placeholders
        sid_ok = sid and sid not in placeholders
        
        return bool(token_ok and dc_ok and sid_ok)

    @classmethod
    def get_base_url(cls) -> str:
        """
        Constructs the base URL for the Qualtrics API v3 based on the datacenter ID.
        """
        dc = (os.getenv("QUALTRICS_DATACENTER") or cls.DATACENTER or "fra1").strip().lower()
        return f"https://{dc}.qualtrics.com/API/v3"

    @classmethod
    def get_headers(cls) -> dict:
        """
        Constructs the necessary HTTP headers including authentication for Qualtrics API requests.
        """
        token = (os.getenv("QUALTRICS_API_TOKEN") or cls.API_TOKEN or "").strip()
        return {
            "X-API-TOKEN": token,
            "Content-Type": "application/json"
        }
