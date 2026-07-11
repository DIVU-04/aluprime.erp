import json
from pathlib import Path
from typing import Any

from nira.tools.base import Tool, ToolResult


class SmartHomeTool(Tool):
    name = "smart_home"
    description = "Control smart home devices (lights, thermostat, etc.). Simulated locally until integrated."

    def __init__(self, storage_path: Path) -> None:
        self._path = storage_path
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._state: dict[str, Any] = self._load()

    def _load(self) -> dict[str, Any]:
        if self._path.exists():
            return json.loads(self._path.read_text(encoding="utf-8"))
        return {
            "lights": {"living_room": "off", "bedroom": "off"},
            "thermostat": {"temperature": 22, "mode": "auto"},
        }

    def _save(self) -> None:
        self._path.write_text(json.dumps(self._state, indent=2), encoding="utf-8")

    def get_parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["status", "control"],
                    "description": "Get device status or control a device",
                },
                "device": {
                    "type": "string",
                    "description": "Device name (e.g. living_room lights, thermostat)",
                },
                "command": {
                    "type": "string",
                    "description": "Command: on, off, or temperature value",
                },
            },
            "required": ["action"],
        }

    def execute(self, **kwargs: Any) -> ToolResult:
        action = kwargs.get("action", "")

        if action == "status":
            lines = []
            for room, state in self._state.get("lights", {}).items():
                lines.append(f"Lights ({room}): {state}")
            thermo = self._state.get("thermostat", {})
            lines.append(
                f"Thermostat: {thermo.get('temperature', '?')}C ({thermo.get('mode', '?')})"
            )
            return ToolResult(True, "\n".join(lines))

        if action == "control":
            device = kwargs.get("device", "").lower()
            command = kwargs.get("command", "").lower()

            if "light" in device or device in self._state.get("lights", {}):
                room = device.replace("lights", "").replace("light", "").strip() or "living_room"
                room = room.replace(" ", "_")
                if room not in self._state["lights"]:
                    self._state["lights"][room] = "off"
                if command in ("on", "off"):
                    self._state["lights"][room] = command
                    self._save()
                    return ToolResult(True, f"Lights ({room}) turned {command}")
                return ToolResult(False, f"Unknown command: {command}")

            if "thermostat" in device:
                try:
                    temp = int(command)
                    self._state["thermostat"]["temperature"] = temp
                    self._save()
                    return ToolResult(True, f"Thermostat set to {temp}C")
                except ValueError:
                    return ToolResult(False, "Thermostat command must be a temperature number")

            return ToolResult(False, f"Unknown device: {device}")

        return ToolResult(False, f"Unknown action: {action}")
