import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from nira.tools.base import Tool, ToolResult


class NotesTool(Tool):
    name = "notes"
    description = "Create, list, search, and delete quick notes."

    def __init__(self, storage_path: Path) -> None:
        self._path = storage_path
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._notes: list[dict[str, str]] = self._load()

    def _load(self) -> list[dict[str, str]]:
        if self._path.exists():
            return json.loads(self._path.read_text(encoding="utf-8"))
        return []

    def _save(self) -> None:
        self._path.write_text(json.dumps(self._notes, indent=2), encoding="utf-8")

    def get_parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["add", "list", "search", "delete"],
                },
                "content": {"type": "string", "description": "Note content"},
                "note_id": {"type": "string", "description": "Note ID for delete"},
                "query": {"type": "string", "description": "Search query"},
            },
            "required": ["action"],
        }

    def execute(self, **kwargs: Any) -> ToolResult:
        action = kwargs.get("action", "")

        if action == "add":
            content = kwargs.get("content", "").strip()
            if not content:
                return ToolResult(False, "Note content is required")
            note_id = str(len(self._notes) + 1)
            self._notes.append({
                "id": note_id,
                "content": content,
                "created": datetime.now(timezone.utc).isoformat(),
            })
            self._save()
            return ToolResult(True, f"Note #{note_id} saved: {content}")

        if action == "list":
            if not self._notes:
                return ToolResult(True, "No notes yet.")
            lines = [f"[{n['id']}] {n['content']}" for n in self._notes[-20:]]
            return ToolResult(True, "\n".join(lines))

        if action == "search":
            query = kwargs.get("query", "").lower()
            matches = [n for n in self._notes if query in n["content"].lower()]
            if not matches:
                return ToolResult(True, f"No notes matching '{query}'")
            lines = [f"[{n['id']}] {n['content']}" for n in matches]
            return ToolResult(True, "\n".join(lines))

        if action == "delete":
            note_id = kwargs.get("note_id", "")
            before = len(self._notes)
            self._notes = [n for n in self._notes if n["id"] != note_id]
            if len(self._notes) < before:
                self._save()
                return ToolResult(True, f"Note #{note_id} deleted.")
            return ToolResult(False, f"Note #{note_id} not found.")

        return ToolResult(False, f"Unknown action: {action}")
