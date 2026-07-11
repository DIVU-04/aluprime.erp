import json
from typing import Any

from openai import OpenAI

from nira.config import Settings
from nira.perception.context import AgentContext
from nira.tools.registry import ToolRegistry


SYSTEM_PROMPT = """You are {agent_name}, a personal AI assistant like Jarvis.

You are helpful, precise, and proactive. You have access to tools for:
- web_search: search the internet
- file_operations: read/write/list files
- calendar: manage events
- run_code: execute Python snippets
- smart_home: control lights and thermostat
- memory: remember and recall facts

Use tools when you need real data or to perform actions. For simple greetings or
questions you can answer from context, respond directly.

Always be concise unless the user asks for detail. Address the user by name when known.
"""


class LLMBrain:
    """LLM reasoning engine with tool-calling loop."""

    def __init__(self, settings: Settings, tools: ToolRegistry) -> None:
        self._settings = settings
        self._tools = tools
        self._client = OpenAI(
            api_key=settings.llm_api_key or "not-set",
            base_url=settings.llm_base_url,
        )

    def _build_messages(
        self,
        context: AgentContext,
        plan: str | None = None,
    ) -> list[dict[str, Any]]:
        system = SYSTEM_PROMPT.format(agent_name=self._settings.agent_name)
        system += f"\n\n---\n{context.to_system_context()}"
        if plan:
            system += f"\n\n## Task Plan\n{plan}"

        messages: list[dict[str, Any]] = [{"role": "system", "content": system}]
        messages.extend(context.conversation_history)
        messages.append({"role": "user", "content": context.user_input})
        return messages

    def reason(
        self,
        context: AgentContext,
        plan: str | None = None,
    ) -> tuple[str, list[dict[str, Any]]]:
        """Run the agentic loop: reason, call tools, repeat until done."""
        if not self._settings.llm_api_key:
            return self._fallback_response(context), []

        messages = self._build_messages(context, plan)
        tool_schemas = self._tools.get_schemas()
        tool_log: list[dict[str, Any]] = []

        for _ in range(self._settings.max_tool_iterations):
            kwargs: dict[str, Any] = {
                "model": self._settings.llm_model,
                "messages": messages,
            }
            if tool_schemas:
                kwargs["tools"] = tool_schemas
                kwargs["tool_choice"] = "auto"

            response = self._client.chat.completions.create(**kwargs)
            choice = response.choices[0]
            message = choice.message

            if message.tool_calls:
                messages.append(message.model_dump())
                for tool_call in message.tool_calls:
                    fn = tool_call.function
                    try:
                        args = json.loads(fn.arguments)
                    except json.JSONDecodeError:
                        args = {}

                    result = self._tools.execute(fn.name, **args)
                    tool_log.append(
                        {"tool": fn.name, "args": args, "result": result[:500]}
                    )
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": result,
                        }
                    )
                continue

            return message.content or "", tool_log

        return "I reached my tool usage limit. Please try a simpler request.", tool_log

    def _fallback_response(self, context: AgentContext) -> str:
        """Offline/demo mode when no API key is configured."""
        intent = context.intent.intent.value
        name = self._settings.agent_name
        if intent == "greeting":
            return f"Hello! I'm {name}, your personal AI assistant. How can I help you today?"
        return (
            f"I'm {name}, ready to assist. To enable full AI capabilities, "
            "set NIRA_LLM_API_KEY in your .env file."
        )

    def summarize_for_memory(self, user_input: str, response: str) -> str:
        if not self._settings.llm_api_key:
            return f"User asked: {user_input[:100]}. Assistant responded."
        try:
            result = self._client.chat.completions.create(
                model=self._settings.llm_model,
                messages=[
                    {
                        "role": "system",
                        "content": "Summarize this interaction in one sentence for long-term memory.",
                    },
                    {
                        "role": "user",
                        "content": f"User: {user_input}\nAssistant: {response}",
                    },
                ],
                max_tokens=100,
            )
            return result.choices[0].message.content or ""
        except Exception:
            return f"Discussed: {user_input[:80]}"
