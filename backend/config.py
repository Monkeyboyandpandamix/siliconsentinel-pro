from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    app_name: str = "SiliconSentinel Pro"
    silicon_db_url: str = "sqlite+aiosqlite:///./siliconsentinel.db"
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
    upload_dir: str = "uploads"
    cors_origins: list[str] = ["*"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
