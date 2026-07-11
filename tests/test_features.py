"""Tests for new Nira tools and services."""

from pathlib import Path

import pytest

from nira.agent.orchestrator import NiraAgent
from nira.config import Settings
from nira.perception.nlp import IntentType, parse_intent
from nira.services.briefing import BriefingService
from nira.tools.notes import NotesTool
from nira.tools.system_info import SystemTool
from nira.tools.timers import TimersTool


@pytest.fixture
def temp_settings(tmp_path: Path) -> Settings:
    return Settings(
        data_dir=tmp_path / "data",
        llm_api_key="",
        web_search_enabled=False,
        default_city="London",
    )


def test_parse_weather_intent():
    result = parse_intent("What's the weather in Paris?")
    assert result.intent == IntentType.WEATHER


def test_parse_briefing_intent():
    result = parse_intent("Give me my daily briefing")
    assert result.intent == IntentType.BRIEFING


def test_parse_notes_intent():
    result = parse_intent("Jot down buy groceries")
    assert result.intent == IntentType.NOTES


def test_notes_tool_add_and_list(tmp_path: Path):
    tool = NotesTool(tmp_path / "notes.json")
    tool.execute(action="add", content="Test note")
    result = tool.execute(action="list")
    assert result.success
    assert "Test note" in result.output


def test_timers_tool_set(tmp_path: Path):
    tool = TimersTool(tmp_path / "timers.json")
    result = tool.execute(action="set", message="Take a break", minutes=10)
    assert result.success
    assert "Take a break" in result.output


def test_system_tool():
    tool = SystemTool()
    result = tool.execute(info_type="datetime")
    assert result.success
    assert "UTC" in result.output


def test_briefing_service(temp_settings: Settings):
    agent = NiraAgent(temp_settings)
    briefing = BriefingService(agent).generate()
    assert "briefing" in briefing.lower()
    assert "morning" in briefing.lower() or "Good" in briefing


def test_agent_has_new_tools(temp_settings: Settings):
    agent = NiraAgent(temp_settings)
    names = {t.name for t in agent.tools.list_tools()}
    assert "weather" in names
    assert "notes" in names
    assert "timers" in names
    assert "system_info" in names
    assert "http_fetch" in names
