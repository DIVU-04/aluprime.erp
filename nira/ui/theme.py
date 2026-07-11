"""Cyberpunk / sci-fi color palette and Rich styles."""

from dataclasses import dataclass


@dataclass(frozen=True)
class FutureTheme:
    """Neon futuristic palette inspired by Jarvis-style HUDs."""

    name: str = "FutureStick"
    primary: str = "bright_cyan"
    secondary: str = "bright_magenta"
    accent: str = "bright_blue"
    success: str = "bright_green"
    warning: str = "bright_yellow"
    dim: str = "dim cyan"
    glow: str = "bold bright_cyan"
    panel_border: str = "cyan"
    user_prompt: str = "bold bright_green"
    agent_title: str = "bold bright_cyan on black"
    hud_bg: str = "on grey11"

    @property
    def tagline(self) -> str:
        return "NEURAL INTERFACE v2.0 // FUTURESTICK PROTOCOL"
