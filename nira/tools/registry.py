from typing import Any

from nira.tools.base import Tool


class ToolRegistry:
    """Registry of all available agent tools."""

    def __init__(self) -> None:
        self._tools: dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        self._tools[tool.name] = tool

    def get(self, name: str) -> Tool | None:
        return self._tools.get(name)

    def list_tools(self) -> list[Tool]:
        return list(self._tools.values())

    def get_schemas(self) -> list[dict[str, Any]]:
        return [tool.to_openai_schema() for tool in self._tools.values()]

    def execute(self, name: str, **kwargs: Any) -> str:
        tool = self.get(name)
        if not tool:
            return f"Error: Unknown tool '{name}'"
        result = tool.execute(**kwargs)
        if result.success:
            return result.output
        return f"Tool error: {result.output}"
