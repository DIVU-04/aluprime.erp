"""Basic tests for Nira Agent core modules."""

from pathlib import Path

import pytest

from nira.agent.orchestrator import NiraAgent
from nira.config import Settings
from nira.perception.nlp import IntentType, parse_intent
from nira.tools.registry import ToolRegistry
from nira.tools.smart_home import SmartHomeTool


@pytest.fixture
def temp_settings(tmp_path: Path) -> Settings:
    return Settings(
        data_dir=tmp_path / "data",
        llm_api_key="",
        web_search_enabled=False,
    )


def test_parse_greeting_intent():
    result = parse_intent("Hello Nira!")
    assert result.intent == IntentType.GREETING


def test_parse_device_control_intent():
    result = parse_intent("Turn off the living room lights")
    assert result.intent == IntentType.DEVICE_CONTROL
    assert "device" in result.entities


def test_parse_memory_intent():
    result = parse_intent("Remember my birthday is July 11")
    assert result.intent == IntentType.MEMORY


def test_smart_home_tool(tmp_path: Path):
    tool = SmartHomeTool(tmp_path / "smart_home.json")
    result = tool.execute(action="control", device="living_room lights", command="off")
    assert result.success
    assert "off" in result.output


def test_agent_demo_mode(temp_settings: Settings):
    agent = NiraAgent(temp_settings)
    response = agent.process("Hello!")
    assert "Nira" in response


def test_agent_futuristic_ui(temp_settings: Settings):
    temp_settings.futuristic_ui = True
    agent = NiraAgent(temp_settings)
    assert agent.deliverer.hud is not None
    assert agent.deliverer.hud.theme.name == "FutureStick"


def test_agent_classic_ui(temp_settings: Settings):
    temp_settings.futuristic_ui = False
    agent = NiraAgent(temp_settings)
    assert agent.deliverer.hud is None


def test_tool_registry():
    registry = ToolRegistry()
    tool = SmartHomeTool(Path("/tmp/test_smart_home.json"))
    registry.register(tool)
    assert registry.get("smart_home") is not None
    assert len(registry.get_schemas()) == 1
