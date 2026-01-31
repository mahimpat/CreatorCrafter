"""
Application configuration using Pydantic Settings.
"""
from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    APP_NAME: str = "CreatorCrafter"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api"

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/creatorcrafter"

    # JWT Authentication
    SECRET_KEY: str = "your-secret-key-change-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Storage
    STORAGE_PATH: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage")
    MAX_UPLOAD_SIZE: int = 500 * 1024 * 1024  # 500MB
    ALLOWED_VIDEO_EXTENSIONS: List[str] = ["mp4", "mov", "avi", "mkv", "webm"]
    ALLOWED_AUDIO_EXTENSIONS: List[str] = ["wav", "mp3", "ogg", "m4a"]

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    # AI Models
    WHISPER_MODEL: str = "base"
    BLIP_MODEL: str = "Salesforce/blip-image-captioning-base"

    # ElevenLabs API for SFX generation
    ELEVENLABS_API_KEY: str = ""

    # LLM for intelligent audio description (optional - enables smarter SFX prompts)
    # Set one of these in .env for LLM-based audio description generation
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # Use semantic matching for SFX (requires sentence-transformers)
    USE_SEMANTIC_SFX_MATCHING: bool = True

    # Task timeouts (seconds)
    VIDEO_ANALYSIS_TIMEOUT: int = 1800  # 30 minutes
    SFX_GENERATION_TIMEOUT: int = 600   # 10 minutes
    VIDEO_RENDER_TIMEOUT: int = 3600    # 1 hour

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
