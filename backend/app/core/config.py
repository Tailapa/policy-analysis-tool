from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    MONGODB_URI: str = "mongodb://localhost:27017" # updated
    MONGODB_DB: str = "governance_watch" # updated

    JWT_SECRET: str = "dev-secret-change-me" # updated
    JWT_ALGORITHM: str = "HS256" # updated
    JWT_EXPIRE_MINUTES: int = 60 # updated

    MINISTRY_MATCH_THRESHOLD: int = 85 # updated

    GEMINI_API_KEY: str = ""
    GEMINI_TEXT_MODEL: str = "gemini-flash-lite-latest"

    # Policy Intelligence generation provider — "gemini" (default) or
    # "openrouter" (OpenAI-compatible, routes to any model OpenRouter hosts).
    INTELLIGENCE_PROVIDER: str = "gemini"
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "openai/gpt-4o-mini"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    SERPER_API_KEY: str = ""

    CORS_ORIGINS: str = "http://localhost:3000"

    # Admin login credentials, synced into admin_users on every backend
    # startup — "email:password" pairs, comma-separated. Add more admins by
    # adding more pairs. Existing users' passwords are overwritten to match
    # this on each restart, so it's the source of truth, not a one-time seed.
    ADMIN_USERS: str = "[EMAIL_ADDRESS]:[PASSWORD]" # updated

    ENV: str = "development" # updated

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
