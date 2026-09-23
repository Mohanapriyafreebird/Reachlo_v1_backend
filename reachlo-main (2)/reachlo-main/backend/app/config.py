import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    GOOGLE_PLACES_API_KEY: str | None = None
    GOOGLE_MAPS_API_KEY: str | None = None
    REDIS_URL: str | None = None
    # AI generation keys
    GEMINI_API_KEY: str | None = None
    HUGGINGFACE_API_KEY: str | None = None
    IDEOGRAM_API_KEY: str | None = None
    # Cloudflare Workers AI (primary image generator — 10K neurons/day free)
    CF_ACCOUNT_ID: str | None = None
    CF_API_TOKEN: str | None = None
    # Groq (optional — fast LLM fallback)
    GROQ_API_KEY: str | None = None
    # S3 config (optional — uses local uploads dir as fallback for MVP)
    AWS_S3_BUCKET: str | None = None
    AWS_ACCESS_KEY_ID: str | None = None
    AWS_SECRET_ACCESS_KEY: str | None = None
    AWS_REGION: str = "ap-south-1"
    
    # Cloudinary Config
    CLOUDINARY_CLOUD_NAME: str | None = None
    CLOUDINARY_UPLOAD_PRESET: str | None = None

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
        env_file_encoding = "utf-8"

settings = Settings()
