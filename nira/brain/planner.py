from nira.perception.context import AgentContext
from nira.perception.nlp import IntentType


class TaskPlanner:
    """Breaks complex tasks into a structured plan for the LLM."""

    def create_plan(self, context: AgentContext) -> str:
        intent = context.intent.intent
        entities = context.intent.entities

        if intent == IntentType.DEVICE_CONTROL:
            device = entities.get("device", "device")
            action = entities.get("action", "control")
            return (
                f"Plan: Use smart_home tool to {action} the {device}. "
                "Confirm the action was successful, then respond to the user."
            )

        if intent == IntentType.REMINDER:
            return (
                "Plan: Parse the reminder details, use calendar tool to add the event, "
                "and optionally use memory to store recurring preferences."
            )

        if intent == IntentType.CODE:
            return (
                "Plan: Write the required Python code, execute it with run_code tool, "
                "and present the results clearly."
            )

        if intent == IntentType.FILE_OPERATION:
            return (
                "Plan: Identify the file path and operation, use file_operations tool, "
                "and summarize what was read or written."
            )

        return (
            "Plan: Analyze the request, use available tools as needed, "
            "iterate until the task is complete, then provide a clear answer."
        )
