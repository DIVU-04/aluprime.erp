from typing import Any

from nira.memory.long_term import LongTermMemory
from nira.tools.base import Tool, ToolResult


class MemoryTool(Tool):
    name = "memory"
    description = "Store or recall facts in long-term memory."

    def __init__(self, long_term: LongTermMemory) -> None:
        self._long_term = long_term

    def get_parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["remember", "recall"],
                    "description": "Store a fact or recall known facts",
                },
                "fact": {
                    "type": "string",
                    "description": "Fact to remember",
                },
            },
            "required": ["action"],
        }

    def execute(self, **kwargs: Any) -> ToolResult:
        action = kwargs.get("action", "")

        if action == "remember":
            fact = kwargs.get("fact", "")
            if not fact:
                return ToolResult(False, "No fact provided")
            self._long_term.add_fact(fact)
            return ToolResult(True, f"Remembered: {fact}")

        if action == "recall":
            facts = self._long_term.get_facts(limit=20)
            if not facts:
                return ToolResult(True, "No stored facts yet.")
            return ToolResult(True, "\n".join(f"- {f}" for f in facts))

        return ToolResult(False, f"Unknown action: {action}")
