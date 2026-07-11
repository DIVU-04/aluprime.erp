from nira.brain.llm import LLMBrain
from nira.memory.long_term import LongTermMemory


class ReflectionEngine:
    """Reflects on interactions and updates long-term memory."""

    def __init__(self, brain: LLMBrain, long_term: LongTermMemory) -> None:
        self._brain = brain
        self._long_term = long_term

    def process(self, user_input: str, response: str) -> None:
        self._long_term.record_interaction(user_input, response)
        summary = self._brain.summarize_for_memory(user_input, response)
        if summary:
            self._long_term.add_summary(summary)

        if "remember" in user_input.lower():
            fact = user_input.replace("remember", "").replace("Remember", "").strip()
            if fact:
                self._long_term.add_fact(fact, source="explicit")
