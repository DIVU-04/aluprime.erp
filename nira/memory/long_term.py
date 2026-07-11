import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class LongTermMemory:
    """Persistent memory store for facts, summaries, and learned preferences."""

    def __init__(self, storage_path: Path) -> None:
        self._path = storage_path
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._data: dict[str, Any] = self._load()

    def _load(self) -> dict[str, Any]:
        if self._path.exists():
            return json.loads(self._path.read_text(encoding="utf-8"))
        return {"facts": [], "summaries": [], "interactions": []}

    def _save(self) -> None:
        self._path.write_text(json.dumps(self._data, indent=2), encoding="utf-8")

    def add_fact(self, fact: str, source: str = "conversation") -> None:
        entry = {
            "fact": fact,
            "source": source,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._data.setdefault("facts", []).append(entry)
        self._save()

    def add_summary(self, summary: str) -> None:
        entry = {
            "summary": summary,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._data.setdefault("summaries", []).append(entry)
        self._save()

    def record_interaction(self, user_input: str, response: str) -> None:
        entry = {
            "user": user_input,
            "assistant": response,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        interactions = self._data.setdefault("interactions", [])
        interactions.append(entry)
        # Keep last 100 interactions
        self._data["interactions"] = interactions[-100:]
        self._save()

    def get_facts(self, limit: int = 10) -> list[str]:
        facts = self._data.get("facts", [])
        return [f["fact"] for f in facts[-limit:]]

    def get_recent_summaries(self, limit: int = 3) -> list[str]:
        summaries = self._data.get("summaries", [])
        return [s["summary"] for s in summaries[-limit:]]

    def context_block(self) -> str:
        facts = self.get_facts()
        summaries = self.get_recent_summaries()
        parts: list[str] = []
        if facts:
            parts.append("Known facts:\n- " + "\n- ".join(facts))
        if summaries:
            parts.append("Recent summaries:\n- " + "\n- ".join(summaries))
        return "\n\n".join(parts) if parts else ""
