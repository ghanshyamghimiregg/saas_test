from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ENVIRONMENT: str = "development"
    CCTV_AUTHORIZED_USER_IDS: str = ""
    # Comma-separated list of allowed CORS origins.
    # In production set to your actual subdomains, e.g.:
    # "https://stock.yourdomain.com,https://sales.yourdomain.com,https://admin.yourdomain.com"
    CORS_ORIGINS: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()