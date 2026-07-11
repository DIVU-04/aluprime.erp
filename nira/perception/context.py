from dataclasses import dataclass
from typing import TYPE_CHECKING

from nira.perception.nlp import IntentType, ParsedIntent

if TYPE_CHECKING:
    from nira.memory.knowledge import KnowledgeBase
    from nira.memory.long_term import LongTermMemory
    from nira.memory.short_term import ShortTermMemory
    from nira.memory.user_profile import UserProfile


@dataclass
class AgentContext:
    user_input: str
    intent: ParsedIntent
    user_profile: str
    long_term_memory: str
    knowledge: str
    conversation_history: list[dict[str, str]]
    metadata: dict[str, str]

    def to_system_context(self) -> str:
        sections = [
            f"## User Input\n{self.user_input}",
            f"## Detected Intent\n{self.intent.intent.value} (confidence: {self.intent.confidence:.0%})",
        ]
        if self.intent.entities:
            entity_str = ", ".join(f"{k}={v}" for k, v in self.intent.entities.items())
            sections.append(f"## Entities\n{entity_str}")
        if self.user_profile:
            sections.append(f"## User Profile\n{self.user_profile}")
        if self.long_term_memory:
            sections.append(f"## Long-term Memory\n{self.long_term_memory}")
        if self.knowledge:
            sections.append(f"## Knowledge Base\n{self.knowledge}")
        return "\n\n".join(sections)


class ContextBuilder:
    """Assembles all context sources before reasoning."""

    def __init__(
        self,
        short_term: "ShortTermMemory",
        long_term: "LongTermMemory",
        user_profile: "UserProfile",
        knowledge: "KnowledgeBase",
    ) -> None:
        self._short_term = short_term
        self._long_term = long_term
        self._user_profile = user_profile
        self._knowledge = knowledge

    def build(self, user_input: str, intent: ParsedIntent) -> AgentContext:
        return AgentContext(
            user_input=user_input,
            intent=intent,
            user_profile=self._user_profile.context_block(),
            long_term_memory=self._long_term.context_block(),
            knowledge=self._knowledge.context_block(user_input),
            conversation_history=self._short_term.get_messages(),
            metadata={"intent": intent.intent.value},
        )
