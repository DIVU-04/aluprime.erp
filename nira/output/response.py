from dataclasses import dataclass
from enum import Enum

from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel

from nira.perception.voice import VoiceEngine, VoiceError
from nira.ui.hud import FutureStickHUD


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

    def __init__(
        self,
        agent_name: str = "Nira",
        futuristic: bool = True,
        voice: VoiceEngine | None = None,
        voice_output: bool = False,
    ) -> None:
        self._console = Console()
        self._agent_name = agent_name
        self._futuristic = futuristic
        self._hud = FutureStickHUD(agent_name) if futuristic else None
        self._voice = voice
        self._voice_output = voice_output

    def deliver(self, response: AgentResponse) -> None:
        if response.mode == OutputMode.ACTION:
            self._deliver_action(response.text)
            return

        self._deliver_text(response.text, response.tool_calls)

        if response.mode == OutputMode.VOICE or self._voice_output:
            self._speak(response.text)

    def _deliver_text(self, text: str, tool_calls: list[dict] | None = None) -> None:
        if self._hud:
            self._hud.deliver_response(text, tool_calls)
            return
        self._console.print(
            Panel(
                Markdown(text),
                title=f"[bold cyan]{self._agent_name}[/bold cyan]",
                border_style="cyan",
            )
        )

    def _speak(self, text: str) -> None:
        if not self._voice:
            return
        try:
            if self._hud:
                self._hud.speaking()
            self._voice.speak(text)
        except VoiceError as exc:
            if self._hud:
                self._hud.notify(str(exc), "warning")
            else:
                self._console.print(f"[yellow]{exc}[/yellow]")

    def _deliver_action(self, text: str) -> None:
        if self._hud:
            self._hud.action_pulse(text)
        else:
            self._console.print(f"[dim]Action executed:[/dim] {text}")

    @property
    def hud(self) -> FutureStickHUD | None:
        return self._hud
