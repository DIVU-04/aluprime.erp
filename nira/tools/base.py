from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class ToolResult:
    success: bool
    output: str
    data: dict[str, Any] | None = None


class Tool(ABC):
    name: str
    description: str

    @abstractmethod
    def get_parameters(self) -> dict[str, Any]:
        """Return JSON schema for tool parameters."""

    @abstractmethod
    def execute(self, **kwargs: Any) -> ToolResult:
        """Execute the tool with given arguments."""

    def to_openai_schema(self) -> dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.get_parameters(),
            },
        }
