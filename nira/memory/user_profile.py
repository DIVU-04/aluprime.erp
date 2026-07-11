import json
from pathlib import Path
from typing import Any


DEFAULT_PROFILE = {
    "name": "User",
    "timezone": "UTC",
    "preferences": {
        "response_style": "concise and helpful",
        "voice_enabled": False,
    },
    "interests": [],
}


class UserProfile:
    """Persistent user profile and preferences."""

    def __init__(self, storage_path: Path) -> None:
        self._path = storage_path
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._data: dict[str, Any] = self._load()

    def _load(self) -> dict[str, Any]:
        if self._path.exists():
            return json.loads(self._path.read_text(encoding="utf-8"))
        return dict(DEFAULT_PROFILE)

    def _save(self) -> None:
        self._path.write_text(json.dumps(self._data, indent=2), encoding="utf-8")

    def get(self, key: str, default: Any = None) -> Any:
        return self._data.get(key, default)

    def set(self, key: str, value: Any) -> None:
        self._data[key] = value
        self._save()

    def update_preference(self, key: str, value: Any) -> None:
        prefs = self._data.setdefault("preferences", {})
        prefs[key] = value
        self._save()

    def context_block(self) -> str:
        prefs = self._data.get("preferences", {})
        interests = self._data.get("interests", [])
        lines = [
            f"User name: {self._data.get('name', 'User')}",
            f"Timezone: {self._data.get('timezone', 'UTC')}",
            f"Response style: {prefs.get('response_style', 'concise')}",
        ]
        if interests:
            lines.append(f"Interests: {', '.join(interests)}")
        return "\n".join(lines)
