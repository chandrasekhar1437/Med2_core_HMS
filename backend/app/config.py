from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    # MongoDB Database Connection
    MONGO_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "med_core_hms"

    # JWT Authentication (supports both JWT_SECRET_KEY and SECRET_KEY)
    JWT_SECRET_KEY: str = "medcore_super_secret_jwt_key_2026"
    SECRET_KEY: Optional[str] = None
    JWT_ALGORITHM: str = "HS256"
    ALGORITHM: Optional[str] = None
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Gmail SMTP Settings
    MAIL_USERNAME: Optional[str] = None
    MAIL_PASSWORD: Optional[str] = None
    MAIL_FROM: Optional[str] = None
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_PORT: int = 587

    # Allows extra keys in .env without throwing validation errors
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def __init__(self, **values):
        super().__init__(**values)
        # Ensure SECRET_KEY and JWT_SECRET_KEY stay in sync
        if not self.SECRET_KEY:
            self.SECRET_KEY = self.JWT_SECRET_KEY
        else:
            self.JWT_SECRET_KEY = self.SECRET_KEY

        # Ensure ALGORITHM and JWT_ALGORITHM stay in sync
        if not self.ALGORITHM:
            self.ALGORITHM = self.JWT_ALGORITHM
        else:
            self.JWT_ALGORITHM = self.ALGORITHM

        # Fallback MAIL_FROM to MAIL_USERNAME if not explicitly set
        if not self.MAIL_FROM and self.MAIL_USERNAME:
            self.MAIL_FROM = self.MAIL_USERNAME


settings = Settings()