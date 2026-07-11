from dataclasses import dataclass
from enum import Enum

from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel


class OutputMode(str, Enum):
    TEXT = "text"
    VOICE = "voice"
    ACTION = "action"


@dataclass
class AgentResponse:
    text: str
    mode: OutputMode = OutputMode.TEXT
    tool_calls: list[dict] | None = None


class ResponseDeliverer:
    """Delivers agent responses to the user via text, voice, or actions."""

    def __init__(self, agent_name: str = "Nira") -> None:
        self._console = Console()
        self._agent_name = agent_name

    def deliver(self, response: AgentResponse) -> None:
        if response.mode == OutputMode.TEXT:
            self._deliver_text(response.text)
        elif response.mode == OutputMode.VOICE:
            self._deliver_voice(response.text)
        else:
            self._deliver_action(response.text)

    def _deliver_text(self, text: str) -> None:
        self._console.print(
            Panel(
                Markdown(text),
                title=f"[bold cyan]{self._agent_name}[/bold cyan]",
                border_style="cyan",
            )
        )

    def _deliver_voice(self, text: str) -> None:
        from nira.perception.voice import VoiceAdapter

        adapter = VoiceAdapter()
        try:
            adapter.speak(text)
        except NotImplementedError:
            self._console.print("[yellow]Voice not available. Showing text:[/yellow]")
            self._deliver_text(text)

    def _deliver_action(self, text: str) -> None:
        self._console.print(f"[dim]Action executed:[/dim] {text}")
