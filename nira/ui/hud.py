"""FutureStick HUD — boot sequence, status panels, and live processing display."""

import random
import time
from typing import TYPE_CHECKING

from rich.align import Align
from rich.console import Console, Group
from rich.live import Live
from rich.markdown import Markdown
from rich.panel import Panel
from rich.progress import BarColumn, Progress, SpinnerColumn, TextColumn
from rich.table import Table
from rich.text import Text

from nira.ui.theme import FutureTheme

if TYPE_CHECKING:
    from nira.agent.orchestrator import NiraAgent

NIRA_LOGO = r"""
    ███╗   ██╗██╗██████╗  █████╗ 
    ████╗  ██║██║██╔══██╗██╔══██╗
    ██╔██╗ ██║██║██████╔╝███████║
    ██║╚██╗██║██║██╔══██╗██╔══██║
    ██║ ╚████║██║██║  ██║██║  ██║
    ╚═╝  ╚═══╝╚═╝╚═╝  ╚═╝╚═╝  ╚═╝
"""

BOOT_STEPS = [
    ("Initializing neural core", 0.12),
    ("Loading memory matrices", 0.10),
    ("Syncing tool protocols", 0.14),
    ("Calibrating intent router", 0.08),
    ("Activating FutureStick HUD", 0.10),
    ("Agent online", 0.06),
]


class FutureStickHUD:
    """Futuristic heads-up display for the Nira agent."""

    def __init__(self, agent_name: str = "Nira", theme: FutureTheme | None = None) -> None:
        self.agent_name = agent_name
        self.theme = theme or FutureTheme()
        self.console = Console()

    def boot_sequence(self) -> None:
        """Sci-fi startup animation."""
        self.console.print()
        logo = Text(NIRA_LOGO, style=self.theme.glow)
        self.console.print(Align.center(logo))
        self.console.print(
            Align.center(Text(self.theme.tagline, style=self.theme.dim)),
        )
        self.console.print()

        progress = Progress(
            SpinnerColumn(spinner_name="dots12", style=self.theme.primary),
            TextColumn("[{task.description}]", style=self.theme.primary),
            BarColumn(bar_width=40, style=self.theme.accent, complete_style=self.theme.success),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            console=self.console,
            transient=True,
        )

        with progress:
            task = progress.add_task("Booting...", total=100)
            for label, weight in BOOT_STEPS:
                progress.update(task, description=label)
                for _ in range(int(weight * 100)):
                    progress.advance(task, 1)
                    time.sleep(0.008)

        self.console.print(
            Align.center(
                Text(
                    f"◈  {self.agent_name.upper()} AGENT ONLINE  ◈",
                    style=f"bold {self.theme.success}",
                )
            )
        )
        self.console.print()

    def welcome_panel(self) -> None:
        body = (
            f"[{self.theme.glow}]{self.agent_name}[/] neural assistant initialized.\n"
            f"[{self.theme.dim}]Powered by FutureStick Interface[/]\n\n"
            f"[{self.theme.accent}]▸[/] Voice-ready  "
            f"[{self.theme.accent}]▸[/] Tool-augmented  "
            f"[{self.theme.accent}]▸[/] Memory-enabled\n\n"
            f"[{self.theme.dim}]Say anything, or type /status · /clear · quit[/]"
        )
        self.console.print(
            Panel(
                body,
                title=f"[{self.theme.agent_title}] FUTURESTICK HUD [/]",
                border_style=self.theme.panel_border,
                subtitle="[dim]awaiting input[/dim]",
            )
        )

    def user_prompt(self) -> str:
        self.console.print()
        return self.console.input(
            f"[{self.theme.user_prompt}]▶ OPERATOR[/] [{self.theme.dim}]│[/] "
        ).strip()

    def thinking(self, intent: str = "processing") -> None:
        """Brief animated thinking indicator."""
        frames = ["◐", "◓", "◑", "◒"]
        with Live(
            Text(f"  {frames[0]} {self.agent_name} analyzing [{intent}]...", style=self.theme.primary),
            console=self.console,
            refresh_per_second=12,
            transient=True,
        ) as live:
            for i in range(24):
                frame = frames[i % len(frames)]
                live.update(
                    Text(
                        f"  {frame} {self.agent_name} analyzing [{intent}]...",
                        style=self.theme.primary,
                    )
                )
                time.sleep(0.05)

    def deliver_response(self, text: str, tool_calls: list[dict] | None = None) -> None:
        """Render agent response in a futuristic panel."""
        parts: list = [Markdown(text)]

        if tool_calls:
            tool_table = Table(
                show_header=True,
                header_style=self.theme.secondary,
                border_style=self.theme.dim,
                expand=True,
            )
            tool_table.add_column("TOOL", style=self.theme.accent)
            tool_table.add_column("RESULT", style=self.theme.dim, overflow="fold")
            for call in tool_calls:
                result = call.get("result", "")[:120]
                tool_table.add_row(call.get("tool", "?"), result)
            parts.append(tool_table)

        self.console.print(
            Panel(
                Group(*parts),
                title=f"[{self.theme.agent_title}] {self.agent_name.upper()} [/]",
                border_style=self.theme.panel_border,
                subtitle=f"[{self.theme.dim}]response transmitted[/]",
            )
        )

    def status_hud(self, agent: "NiraAgent") -> None:
        """Futuristic system status dashboard."""
        settings = agent.settings
        tools = agent.tools.list_tools()
        has_key = settings.llm_api_key
        mode = "FULL NEURAL" if has_key else "DEMO / OFFLINE"

        table = Table(
            show_header=False,
            border_style=self.theme.panel_border,
            pad_edge=True,
            expand=True,
        )
        table.add_column("KEY", style=self.theme.secondary, width=22)
        table.add_column("VALUE", style=self.theme.primary)

        table.add_row("AGENT", settings.agent_name)
        table.add_row("INTERFACE", self.theme.name)
        table.add_row("MODE", f"[{self.theme.success if has_key else self.theme.warning}]{mode}[/]")
        table.add_row("MODEL", settings.llm_model)
        table.add_row("TOOLS ONLINE", str(len(tools)))
        table.add_row("MEMORY NODES", str(len(agent.long_term.get_facts())))
        table.add_row("DATA CORE", str(settings.data_dir))

        tool_list = " · ".join(t.name for t in tools)
        table.add_row("PROTOCOLS", tool_list)

        self.console.print(
            Panel(
                table,
                title=f"[{self.theme.agent_title}] SYSTEM STATUS [/]",
                border_style=self.theme.panel_border,
            )
        )

    def notify(self, message: str, level: str = "info") -> None:
        styles = {
            "info": self.theme.primary,
            "success": self.theme.success,
            "warning": self.theme.warning,
        }
        icon = {"info": "◈", "success": "✓", "warning": "⚠"}.get(level, "◈")
        self.console.print(f"  [{styles.get(level, self.theme.primary)}]{icon} {message}[/]")

    def shutdown(self) -> None:
        self.console.print()
        self.console.print(
            Align.center(
                Text(
                    f"◈  {self.agent_name.upper()} ENTERING STANDBY  ◈",
                    style=f"dim {self.theme.primary}",
                )
            )
        )
        self.console.print(
            Align.center(Text("FutureStick interface disconnected.", style="dim")),
        )
        self.console.print()

    def action_pulse(self, text: str) -> None:
        pulse = random.choice(["▸", "▹", "►"])
        self.console.print(
            f"  [{self.theme.accent}]{pulse}[/] [{self.theme.dim}]ACTION[/] │ {text}"
        )
