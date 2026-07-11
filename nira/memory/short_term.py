import json
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class Message:
    role: str
    content: str
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Message":
        return cls(
            role=data["role"],
            content=data["content"],
            timestamp=data.get("timestamp", datetime.now(timezone.utc).isoformat()),
            metadata=data.get("metadata", {}),
        )


class ShortTermMemory:
    """Rolling conversation context for the current session."""

    def __init__(self, limit: int = 20) -> None:
        self._messages: deque[Message] = deque(maxlen=limit)

    def add(self, role: str, content: str, **metadata: Any) -> None:
        self._messages.append(Message(role=role, content=content, metadata=metadata))

    def get_messages(self) -> list[dict[str, str]]:
        return [{"role": m.role, "content": m.content} for m in self._messages]

    def clear(self) -> None:
        self._messages.clear()

    def summary(self) -> str:
        if not self._messages:
            return "No conversation history yet."
        lines = [f"{m.role}: {m.content[:120]}" for m in list(self._messages)[-5:]]
        return "\n".join(lines)
