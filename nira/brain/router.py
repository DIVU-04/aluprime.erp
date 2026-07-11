from nira.perception.nlp import IntentType, ParsedIntent


class IntentRouter:
    """Routes parsed intents to the appropriate processing path."""

    COMPLEX_INTENTS = {
        IntentType.TASK,
        IntentType.CODE,
        IntentType.FILE_OPERATION,
        IntentType.DEVICE_CONTROL,
        IntentType.REMINDER,
    }

    TOOL_HINTS: dict[IntentType, list[str]] = {
        IntentType.QUESTION: ["web_search", "memory"],
        IntentType.TASK: ["web_search", "calendar", "file_operations", "run_code"],
        IntentType.CODE: ["run_code"],
        IntentType.FILE_OPERATION: ["file_operations"],
        IntentType.DEVICE_CONTROL: ["smart_home"],
        IntentType.REMINDER: ["calendar", "memory"],
        IntentType.MEMORY: ["memory"],
    }

    def route(self, intent: ParsedIntent) -> dict[str, object]:
        needs_planner = intent.intent in self.COMPLEX_INTENTS
        suggested_tools = self.TOOL_HINTS.get(intent.intent, [])
        return {
            "needs_planner": needs_planner,
            "suggested_tools": suggested_tools,
            "direct_response": intent.intent == IntentType.GREETING,
        }
