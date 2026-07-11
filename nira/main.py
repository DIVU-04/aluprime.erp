#!/usr/bin/env python3
"""Nira Agent — CLI entry point."""

import argparse

from rich.console import Console
from rich.panel import Panel

from nira.agent.orchestrator import NiraAgent
from nira.config import get_settings
from nira.output.response import OutputMode
from nira.perception.voice import VoiceEngine, VoiceError
from nira.ui.hud import FutureStickHUD


def run_interactive(agent: NiraAgent, wake_mode: bool = False) -> None:
    settings = agent.settings
    futuristic = settings.futuristic_ui
    hud = FutureStickHUD(settings.agent_name) if futuristic else None
    console = Console()
    name = settings.agent_name
    voice_mode = settings.voice_enabled
    voice = agent.voice

    if hud:
        hud.boot_sequence()
        hud.welcome_panel()
        if voice_mode:
            hud.notify(f"Voice mode active — say \"Hey {settings.wake_word.title()}\"", "success")
    else:
        intro = (
            f"[bold]Hey! I'm {name}[/bold], your personal AI assistant.\n"
            "Type your message, or 'quit' to exit.\n"
            "Commands: /clear · /status · /voice"
        )
        if voice_mode:
            intro += f"\nVoice active — say \"Hey {settings.wake_word.title()}\""
        console.print(Panel(intro, title=f"{name} Agent", border_style="cyan"))

    while True:
        try:
            user_input = _get_input(agent, hud, console, wake_mode, voice_mode, voice)
        except (EOFError, KeyboardInterrupt):
            if hud:
                hud.shutdown()
            else:
                console.print(f"\n[cyan]{name} signing off. Goodbye![/cyan]")
            break

        if user_input is None:
            continue
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
        if user_input == "/voice":
            voice_mode, settings.voice_enabled = _toggle_voice(agent, voice_mode, hud, console)
            voice = agent.voice
            continue

        output_mode = OutputMode.VOICE if voice_mode else OutputMode.TEXT
        agent.process(user_input, output_mode=output_mode)


def _get_input(
    agent: NiraAgent,
    hud: FutureStickHUD | None,
    console: Console,
    wake_mode: bool,
    voice_mode: bool,
    voice: VoiceEngine | None,
) -> str | None:
    if not voice_mode or not voice:
        return hud.user_prompt() if hud else console.input("\n[bold green]You:[/bold green] ").strip()

    def on_listen() -> None:
        if hud:
            hud.listening(agent.settings.wake_word)
        else:
            console.print("[magenta]Listening...[/magenta]")

    try:
        if wake_mode:
            return voice.wait_for_wake_word(on_listening=on_listen)
        on_listen()
        result = voice.listen(on_listening=on_listen)
        return voice.strip_wake_word(result.text)
    except VoiceError as exc:
        if hud:
            hud.notify(str(exc), "warning")
        else:
            console.print(f"[yellow]{exc}[/yellow]")
        return None


def _toggle_voice(
    agent: NiraAgent,
    voice_mode: bool,
    hud: FutureStickHUD | None,
    console: Console,
) -> tuple[bool, bool]:
    if not VoiceEngine.is_available():
        msg = "Voice deps missing. Run: pip install -r requirements-voice.txt"
        if hud:
            hud.notify(msg, "warning")
        else:
            console.print(f"[yellow]{msg}[/yellow]")
        return voice_mode, agent.settings.voice_enabled

    voice_mode = not voice_mode
    agent.settings.voice_enabled = voice_mode
    agent.settings.voice_output = voice_mode
    agent._init_voice()
    agent._init_output()

    state = "enabled" if voice_mode else "disabled"
    msg = f"Voice mode {state}."
    if hud:
        hud.notify(msg, "success" if voice_mode else "info")
    else:
        console.print(f"[cyan]{msg}[/cyan]")
    return voice_mode, voice_mode


def _print_status(agent: NiraAgent, console: Console) -> None:
    tools = ", ".join(t.name for t in agent.tools.list_tools())
    has_key = "yes" if agent.settings.llm_api_key else "no (demo mode)"
    voice_state = "on" if agent.settings.voice_enabled else "off"
    console.print(
        Panel(
            f"Agent: {agent.settings.agent_name}\n"
            f"Model: {agent.settings.llm_model}\n"
            f"API key configured: {has_key}\n"
            f"Voice: {voice_state}\n"
            f"Wake word: Hey {agent.settings.wake_word.title()}\n"
            f"Tools: {tools}\n"
            f"Data dir: {agent.settings.data_dir}",
            title="Status",
            border_style="blue",
        )
    )


def run_single(agent: NiraAgent, message: str, speak: bool = False) -> None:
    mode = OutputMode.VOICE if speak else OutputMode.TEXT
    agent.process(message, output_mode=mode)


def main() -> None:
    parser = argparse.ArgumentParser(description="Nira — Personal AI Agent")
    parser.add_argument("message", nargs="?", help="Single message (omit for interactive mode)")
    parser.add_argument("--trigger", metavar="EVENT", help="Simulate a trigger event")
    parser.add_argument("--schedule", metavar="TASK", help="Simulate a scheduled task")
    parser.add_argument("--classic", action="store_true", help="Use classic UI instead of FutureStick HUD")
    parser.add_argument("--voice", action="store_true", help="Enable voice input and spoken responses")
    parser.add_argument("--wake", action="store_true", help="Continuous wake-word listening (requires --voice)")
    parser.add_argument("--speak", action="store_true", help="Speak the response (single-message mode)")
    args = parser.parse_args()

    settings = get_settings()
    if args.classic:
        settings.futuristic_ui = False
    if args.voice:
        settings.voice_enabled = True
        settings.voice_output = True

    agent = NiraAgent(settings)

    if args.trigger:
        agent.process_trigger(args.trigger, {"message": args.trigger})
    elif args.schedule:
        agent.process_scheduled(args.schedule)
    elif args.message:
        run_single(agent, args.message, speak=args.speak or args.voice)
    else:
        run_interactive(agent, wake_mode=args.wake and args.voice)


if __name__ == "__main__":
    main()
