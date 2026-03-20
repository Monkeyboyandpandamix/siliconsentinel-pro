from pydantic_settings import BaseSettings
from functools import lru_cache
import os
from pathlib import Path


_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_DEFAULT_DB_PATH = _PROJECT_ROOT / "siliconsentinel.db"


class Settings(BaseSettings):
    app_name: str = "SiliconSentinel Pro"
    # Use an absolute path so the backend never accidentally opens a
    # different (read-only) sqlite file when the working directory changes.
    silicon_db_url: str = f"sqlite+aiosqlite:///{_DEFAULT_DB_PATH.as_posix()}"
    ai_provider: str = "gemini"  # "gemini" | "watsonx"
    gemini_api_key: str = ""
    watsonx_api_key: str = ""
    watsonx_project_id: str = ""
    watsonx_url: str = "https://us-south.ml.cloud.ibm.com"
    watson_tts_api_key: str = ""
    watson_tts_url: str = ""
    watson_orchestrate_api_key: str = ""
    watson_orchestrate_url: str = ""
    watson_orchestrate_instance_id: str = ""
    watson_orchestrate_agent_id: str = ""
    watson_stt_api_key: str = ""
    watson_stt_url: str = ""
    electricity_maps_api_key: str = ""
    # Nexar (Octopart) API — free tier at https://nexar.com/api (OAuth2 client creds)
    nexar_client_id: str = ""
    nexar_client_secret: str = ""
    # Mouser Electronics API — free API key at https://www.mouser.com/api-search/
    mouser_api_key: str = ""
    upload_dir: str = "uploads"
    cors_origins: list[str] = ["*"]

    model_config = {
        "env_file": ["siliconsentinel-pro/.env", ".env"],
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()
