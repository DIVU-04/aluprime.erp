import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from nira.tools.base import Tool, ToolResult


class TimersTool(Tool):
    name = "timers"
    description = "Set timers, reminders, and list pending alerts."

    def __init__(self, storage_path: Path) -> None:
        self._path = storage_path
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._items: list[dict[str, str]] = self._load()

    def _load(self) -> list[dict[str, str]]:
        if self._path.exists():
            return json.loads(self._path.read_text(encoding="utf-8"))
        return []

    def _save(self) -> None:
        self._path.write_text(json.dumps(self._items, indent=2), encoding="utf-8")

    def get_parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["set", "list", "complete", "pending"],
                },
                "message": {"type": "string", "description": "Reminder message"},
                "minutes": {
                    "type": "integer",
                    "description": "Minutes from now for timer",
                },
                "item_id": {"type": "string", "description": "ID to complete"},
            },
            "required": ["action"],
        }

    def execute(self, **kwargs: Any) -> ToolResult:
        action = kwargs.get("action", "")
        now = datetime.now(timezone.utc)

        if action == "set":
            message = kwargs.get("message", "Reminder").strip()
            minutes = int(kwargs.get("minutes", 5))
            due = now + timedelta(minutes=minutes)
            item_id = str(len(self._items) + 1)
            self._items.append({
                "id": item_id,
                "message": message,
                "due": due.isoformat(),
                "status": "pending",
            })
            self._save()
            return ToolResult(
                True,
                f"Timer #{item_id} set: '{message}' in {minutes} min (due {due.strftime('%H:%M UTC')})",
            )

        if action in ("list", "pending"):
            pending = self._get_pending(now)
            if not pending:
                return ToolResult(True, "No pending timers or reminders.")
            lines = []
            for item in pending:
                due = datetime.fromisoformat(item["due"])
                overdue = due <= now
                tag = "OVERDUE" if overdue else "pending"
                lines.append(f"[{item['id']}] {item['message']} — {tag} ({due.strftime('%H:%M')})")
            return ToolResult(True, "\n".join(lines))

        if action == "complete":
            item_id = kwargs.get("item_id", "")
            for item in self._items:
                if item["id"] == item_id:
                    item["status"] = "done"
                    self._save()
                    return ToolResult(True, f"Timer #{item_id} marked complete.")
            return ToolResult(False, f"Timer #{item_id} not found.")

        return ToolResult(False, f"Unknown action: {action}")

    def _get_pending(self, now: datetime) -> list[dict[str, str]]:
        result = []
        for item in self._items:
            if item.get("status") != "pending":
                continue
            result.append(item)
        return result

    def get_due_now(self) -> list[dict[str, str]]:
        now = datetime.now(timezone.utc)
        due = []
        for item in self._items:
            if item.get("status") != "pending":
                continue
            item_due = datetime.fromisoformat(item["due"])
            if item_due <= now:
                due.append(item)
        return due
