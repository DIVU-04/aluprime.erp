from pathlib import Path
from typing import Any

from nira.tools.base import Tool, ToolResult


class FileTool(Tool):
    name = "file_operations"
    description = "Read, write, or list files in the allowed workspace directory."

    def __init__(self, workspace_dir: Path) -> None:
        self._workspace = workspace_dir.resolve()
        self._workspace.mkdir(parents=True, exist_ok=True)

    def _resolve_safe(self, path: str) -> Path:
        resolved = (self._workspace / path).resolve()
        if not str(resolved).startswith(str(self._workspace)):
            raise ValueError("Path escapes workspace boundary")
        return resolved

    def get_parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["read", "write", "list"],
                    "description": "File operation to perform",
                },
                "path": {
                    "type": "string",
                    "description": "Relative file or directory path",
                },
                "content": {
                    "type": "string",
                    "description": "Content to write (for write action)",
                },
            },
            "required": ["action", "path"],
        }

    def execute(self, **kwargs: Any) -> ToolResult:
        action = kwargs.get("action", "")
        path = kwargs.get("path", "")
        content = kwargs.get("content", "")

        try:
            target = self._resolve_safe(path)
            if action == "read":
                if not target.exists():
                    return ToolResult(False, f"File not found: {path}")
                text = target.read_text(encoding="utf-8")
                return ToolResult(True, text[:4000])
            if action == "write":
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(content, encoding="utf-8")
                return ToolResult(True, f"Written {len(content)} bytes to {path}")
            if action == "list":
                if not target.exists():
                    return ToolResult(False, f"Directory not found: {path}")
                entries = sorted(target.iterdir())
                listing = "\n".join(
                    f"{'[dir]' if e.is_dir() else '[file]'} {e.name}" for e in entries
                )
                return ToolResult(True, listing or "(empty directory)")
            return ToolResult(False, f"Unknown action: {action}")
        except Exception as exc:
            return ToolResult(False, str(exc))
