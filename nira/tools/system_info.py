import platform
from datetime import datetime, timezone
from typing import Any

from nira.tools.base import Tool, ToolResult


class SystemTool(Tool):
    name = "system_info"
    description = "Get current date, time, timezone, and system information."

    def get_parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "info_type": {
                    "type": "string",
                    "enum": ["datetime", "system", "all"],
                    "description": "Type of info to retrieve",
                },
            },
        }

    def execute(self, **kwargs: Any) -> ToolResult:
        info_type = kwargs.get("info_type", "all")
        now = datetime.now(timezone.utc)

        parts: list[str] = []
        if info_type in ("datetime", "all"):
            parts.append(
                f"UTC: {now.strftime('%A, %B %d, %Y %H:%M:%S')} UTC"
            )
        if info_type in ("system", "all"):
            parts.append(f"OS: {platform.system()} {platform.release()}")
            parts.append(f"Machine: {platform.machine()}")
            parts.append(f"Python: {platform.python_version()}")

        return ToolResult(True, "\n".join(parts))
