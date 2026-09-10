import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Market Intelligence API"
    app_version: str = "0.1.0"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    
    # CORS Origins - Get from environment or use defaults
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://localhost:3000",
    ]
    
    def __init__(self, **data):
        super().__init__(**data)
        # Add Render frontend URL if available
        render_frontend = os.getenv("RENDER_EXTERNAL_URL")
        if render_frontend:
            self.cors_origins.append(render_frontend)
        
        # Add any frontend URL from environment
        frontend_url = os.getenv("FRONTEND_URL")
        if frontend_url:
            self.cors_origins.append(frontend_url)


@lru_cache
def get_settings() -> Settings:
    return Settings()
