import os
from typing import Optional
from pydantic import BaseModel, Field

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict

    class Settings(BaseSettings):
        port: int = Field(default=8000, alias="PORT")
        host: str = Field(default="0.0.0.0", alias="HOST")
        environment: str = Field(default="development", alias="ENVIRONMENT")
        log_level: str = Field(default="info", alias="LOG_LEVEL")
        backend_url: str = Field(default="http://localhost:5000", alias="BACKEND_URL")
        database_url: Optional[str] = Field(default=None, alias="DATABASE_URL")
        gemini_api_key: Optional[str] = Field(default=None, alias="GEMINI_API_KEY")

        model_config = SettingsConfigDict(
            env_file=".env",
            env_file_encoding="utf-8",
            extra="ignore",
        )

except ImportError:
    from dotenv import load_dotenv

    load_dotenv()

    class Settings(BaseModel):
        port: int = int(os.getenv("PORT", "8000"))
        host: str = os.getenv("HOST", "0.0.0.0")
        environment: str = os.getenv("ENVIRONMENT", "development")
        log_level: str = os.getenv("LOG_LEVEL", "info")
        backend_url: str = os.getenv("BACKEND_URL", "http://localhost:5000")
        database_url: Optional[str] = os.getenv("DATABASE_URL")
        gemini_api_key: Optional[str] = os.getenv("GEMINI_API_KEY")


settings = Settings()
