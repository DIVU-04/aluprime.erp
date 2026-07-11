#!/usr/bin/env python3
"""Nira Agent — CLI entry point."""

import argparse

from rich.console import Console
from rich.panel import Panel

from nira.agent.orchestrator import NiraAgent
from nira.config import get_settings
from nira.ui.hud import FutureStickHUD


def run_interactive(agent: NiraAgent) -> None:
    settings = agent.settings
    futuristic = settings.futuristic_ui
    hud = FutureStickHUD(settings.agent_name) if futuristic else None
    console = Console()
    name = settings.agent_name

    if hud:
        hud.boot_sequence()
        hud.welcome_panel()
    else:
        console.print(
            Panel(
                f"[bold]Hey! I'm {name}[/bold], your personal AI assistant.\n"
                "Type your message, or 'quit' to exit.\n"
                "Commands: /clear (reset conversation), /status (agent info)",
                title=f"{name} Agent",
                border_style="cyan",
            )
        )

    while True:
        try:
            user_input = hud.user_prompt() if hud else console.input("\n[bold green]You:[/bold green] ").strip()
        except (EOFError, KeyboardInterrupt):
            if hud:
                hud.shutdown()
            else:
                console.print(f"\n[cyan]{name} signing off. Goodbye![/cyan]")
            break

        if not user_input:
            continue
        if user_input.lower() in ("quit", "exit", "bye"):
            if hud:
                hud.shutdown()
            else:
                console.print(f"[cyan]{name} signing off. Goodbye![/cyan]")
            break
        if user_input == "/clear":
            agent.short_term.clear()
            if hud:
                hud.notify("Memory buffer cleared.", "success")
            else:
                console.print("[dim]Conversation cleared.[/dim]")
            continue
        if user_input == "/status":
            if hud:
                hud.status_hud(agent)
            else:
                _print_status(agent, console)
            continue

        agent.process(user_input)


def _print_status(agent: NiraAgent, console: Console) -> None:
    tools = ", ".join(t.name for t in agent.tools.list_tools())
    has_key = "yes" if agent.settings.llm_api_key else "no (demo mode)"
    console.print(
        Panel(
            f"Agent: {agent.settings.agent_name}\n"
            f"Model: {agent.settings.llm_model}\n"
            f"API key configured: {has_key}\n"
            f"Tools: {tools}\n"
            f"Data dir: {agent.settings.data_dir}",
            title="Status",
            border_style="blue",
        )
    )


def run_single(agent: NiraAgent, message: str) -> None:
    agent.process(message)


def main() -> None:
    parser = argparse.ArgumentParser(description="Nira — Personal AI Agent")
    parser.add_argument("message", nargs="?", help="Single message (omit for interactive mode)")
    parser.add_argument("--trigger", metavar="EVENT", help="Simulate a trigger event")
    parser.add_argument("--schedule", metavar="TASK", help="Simulate a scheduled task")
    parser.add_argument("--classic", action="store_true", help="Use classic UI instead of FutureStick HUD")
    args = parser.parse_args()

    settings = get_settings()
    if args.classic:
        settings.futuristic_ui = False

    agent = NiraAgent(settings)

    if args.trigger:
        agent.process_trigger(args.trigger, {"message": args.trigger})
    elif args.schedule:
        agent.process_scheduled(args.schedule)
    elif args.message:
        run_single(agent, args.message)
    else:
        run_interactive(agent)


if __name__ == "__main__":
    main()
