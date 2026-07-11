from pathlib import Path

from nira.brain.llm import LLMBrain
from nira.brain.planner import TaskPlanner
from nira.brain.router import IntentRouter
from nira.config import Settings
from nira.feedback.logger import InteractionLogger
from nira.feedback.reflection import ReflectionEngine
from nira.memory.knowledge import KnowledgeBase
from nira.memory.long_term import LongTermMemory
from nira.memory.short_term import ShortTermMemory
from nira.memory.user_profile import UserProfile
from nira.output.response import AgentResponse, OutputMode, ResponseDeliverer
from nira.perception.context import ContextBuilder
from nira.perception.nlp import parse_intent
from nira.tools.calendar import CalendarTool
from nira.tools.code_exec import CodeExecTool
from nira.tools.files import FileTool
from nira.tools.memory_tool import MemoryTool
from nira.tools.registry import ToolRegistry
from nira.tools.smart_home import SmartHomeTool
from nira.tools.web_search import WebSearchTool


class NiraAgent:
    """Main orchestrator — ties together all layers of the Nira agent."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or Settings()
        self._init_storage()
        self._init_memory()
        self._init_tools()
        self._init_brain()
        self._init_output()
        self._init_feedback()

    def _init_storage(self) -> None:
        self.settings.data_dir.mkdir(parents=True, exist_ok=True)
        self.settings.memory_dir.mkdir(parents=True, exist_ok=True)
        self.settings.logs_dir.mkdir(parents=True, exist_ok=True)

    def _init_memory(self) -> None:
        mem = self.settings.memory_dir
        self.short_term = ShortTermMemory(limit=self.settings.short_term_memory_limit)
        self.long_term = LongTermMemory(mem / "long_term.json")
        self.user_profile = UserProfile(mem / "profile.json")
        self.knowledge = KnowledgeBase(mem / "knowledge.json")
        self.context_builder = ContextBuilder(
            self.short_term, self.long_term, self.user_profile, self.knowledge
        )

    def _init_tools(self) -> None:
        mem = self.settings.memory_dir
        workspace = self.settings.data_dir / "workspace"
        self.tools = ToolRegistry()
        self.tools.register(MemoryTool(self.long_term))
        self.tools.register(FileTool(workspace))
        self.tools.register(CalendarTool(mem / "calendar.json"))
        self.tools.register(CodeExecTool())
        self.tools.register(SmartHomeTool(mem / "smart_home.json"))
        if self.settings.web_search_enabled:
            self.tools.register(WebSearchTool())

    def _init_brain(self) -> None:
        self.router = IntentRouter()
        self.planner = TaskPlanner()
        self.brain = LLMBrain(self.settings, self.tools)

    def _init_output(self) -> None:
        self.deliverer = ResponseDeliverer(
            agent_name=self.settings.agent_name,
            futuristic=self.settings.futuristic_ui,
        )

    def _init_feedback(self) -> None:
        self.logger = InteractionLogger(self.settings.logs_dir)
        self.reflection = ReflectionEngine(self.brain, self.long_term)

    def process(self, user_input: str, output_mode: OutputMode = OutputMode.TEXT) -> str:
        """Run the full agent pipeline for a single user input."""
        # 1. Perception — parse intent
        intent = parse_intent(user_input)

        # 2. Context — assemble memory and knowledge
        context = self.context_builder.build(user_input, intent)

        # 3. Brain — route and plan
        route = self.router.route(intent)
        plan = None
        if route["needs_planner"]:
            plan = self.planner.create_plan(context)

        # 4. Brain — LLM reasoning with tool loop
        hud = self.deliverer.hud
        if hud:
            hud.thinking(intent.intent.value)
        response_text, tool_log = self.brain.reason(context, plan)

        # 5. Output — deliver response
        agent_response = AgentResponse(
            text=response_text,
            mode=output_mode,
            tool_calls=tool_log,
        )
        self.deliverer.deliver(agent_response)

        # 6. Memory — update short-term
        self.short_term.add("user", user_input)
        self.short_term.add("assistant", response_text)

        # 7. Feedback — log and reflect
        self.logger.log(user_input, response_text, intent.intent.value, tool_log)
        self.reflection.process(user_input, response_text)

        return response_text

    def process_trigger(self, event: str, payload: dict | None = None) -> str:
        """Handle automated triggers (sensors, webhooks, etc.)."""
        payload = payload or {}
        message = f"[Trigger: {event}] {payload.get('message', event)}"
        return self.process(message, output_mode=OutputMode.ACTION)

    def process_scheduled(self, task: str) -> str:
        """Handle scheduled/cron tasks."""
        message = f"[Scheduled task] {task}"
        return self.process(message, output_mode=OutputMode.ACTION)
