import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from nira.tools.base import Tool, ToolResult


class CalendarTool(Tool):
    name = "calendar"
    description = "View, add, or remove calendar events."

    def __init__(self, storage_path: Path) -> None:
        self._path = storage_path
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._events: list[dict[str, str]] = self._load()

    def _load(self) -> list[dict[str, str]]:
        if self._path.exists():
            return json.loads(self._path.read_text(encoding="utf-8"))
        return []

    def _save(self) -> None:
        self._path.write_text(json.dumps(self._events, indent=2), encoding="utf-8")

    def get_parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["list", "add", "remove"],
                    "description": "Calendar action",
                },
                "title": {"type": "string", "description": "Event title"},
                "datetime": {
                    "type": "string",
                    "description": "ISO datetime for the event",
                },
                "event_id": {"type": "string", "description": "Event ID to remove"},
            },
            "required": ["action"],
        }

    def execute(self, **kwargs: Any) -> ToolResult:
        action = kwargs.get("action", "")

        if action == "list":
            now = datetime.now(timezone.utc)
            upcoming = []
            for event in self._events:
                try:
                    event_time = datetime.fromisoformat(event["datetime"])
                    if event_time >= now - timedelta(hours=1):
                        upcoming.append(event)
                except (KeyError, ValueError):
                    continue
            if not upcoming:
                return ToolResult(True, "No upcoming events.")
            lines = [
                f"- [{e['id']}] {e['title']} at {e['datetime']}" for e in upcoming
            ]
            return ToolResult(True, "\n".join(lines))

        if action == "add":
            title = kwargs.get("title", "Untitled")
            dt = kwargs.get("datetime", datetime.now(timezone.utc).isoformat())
            event_id = str(len(self._events) + 1)
            self._events.append({"id": event_id, "title": title, "datetime": dt})
            self._save()
            return ToolResult(True, f"Event added: {title} at {dt} (id: {event_id})")

        if action == "remove":
            event_id = kwargs.get("event_id", "")
            before = len(self._events)
            self._events = [e for e in self._events if e.get("id") != event_id]
            if len(self._events) < before:
                self._save()
                return ToolResult(True, f"Event {event_id} removed.")
            return ToolResult(False, f"Event {event_id} not found.")

        return ToolResult(False, f"Unknown action: {action}")
