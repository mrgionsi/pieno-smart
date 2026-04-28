from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_env: str = "local"
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/pienosmart"
    mimit_dataset_page_url: str = (
        "https://www.mimit.gov.it/it/open-data/elenco-dataset/"
        "carburanti-prezzi-praticati-e-anagrafica-degli-impianti"
    )
    mimit_http_timeout_seconds: float = 30.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
