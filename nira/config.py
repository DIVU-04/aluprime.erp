from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="NIRA_",
        extra="ignore",
    )

    agent_name: str = "Nira"
    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    data_dir: Path = Path("./data")
    log_level: str = "INFO"
    max_tool_iterations: int = 8
    short_term_memory_limit: int = 20
    web_search_enabled: bool = True
    futuristic_ui: bool = True
    voice_enabled: bool = False
    voice_output: bool = True
    wake_word: str = "nira"
    listen_timeout: int = 8
    phrase_time_limit: int = 20
    tts_rate: int = 175
    tts_voice: str = ""

    @property
    def memory_dir(self) -> Path:
        return self.data_dir / "memory"

    @property
    def logs_dir(self) -> Path:
        return self.data_dir / "logs"


def get_settings() -> Settings:
    return Settings()
