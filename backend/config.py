from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    OPENAI_API_KEY: str | None = None
    CORS_ORIGINS: list[str] = ["*"]
    APP_NAME: str = "Exam Evaluator API"

    class Config:
        env_file = ".env"

settings = Settings()
