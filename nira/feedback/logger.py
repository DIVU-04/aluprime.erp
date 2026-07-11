import json
from datetime import datetime, timezone
from pathlib import Path


class InteractionLogger:
    """Logs all agent interactions for the feedback loop."""

    def __init__(self, logs_dir: Path) -> None:
        self._logs_dir = logs_dir
        self._logs_dir.mkdir(parents=True, exist_ok=True)
        self._log_file = self._logs_dir / "interactions.jsonl"

    def log(
        self,
        user_input: str,
        response: str,
        intent: str,
        tool_calls: list[dict] | None = None,
    ) -> None:
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_input": user_input,
            "response": response,
            "intent": intent,
            "tool_calls": tool_calls or [],
        }
        with self._log_file.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
