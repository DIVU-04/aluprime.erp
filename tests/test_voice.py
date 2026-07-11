"""Tests for Nira voice engine."""

import pytest

from nira.config import Settings
from nira.perception.voice import VoiceEngine


@pytest.fixture
def voice_settings() -> Settings:
    return Settings(wake_word="nira")


@pytest.fixture
def engine(voice_settings: Settings) -> VoiceEngine:
    return VoiceEngine(voice_settings)


def test_strip_wake_word_hey_nira(engine: VoiceEngine):
    assert engine.strip_wake_word("Hey Nira, turn off the lights") == "turn off the lights"


def test_strip_wake_word_nira_prefix(engine: VoiceEngine):
    assert engine.strip_wake_word("Nira what time is it") == "what time is it"


def test_strip_wake_word_no_wake(engine: VoiceEngine):
    assert engine.strip_wake_word("turn off the lights") == "turn off the lights"


def test_clean_for_speech(engine: VoiceEngine):
    raw = "**Hello** [link](http://x.com) `code`"
    clean = VoiceEngine._clean_for_speech(raw)
    assert "**" not in clean
    assert "`" not in clean
    assert "link" in clean


def test_voice_engine_with_settings(engine: VoiceEngine):
    assert engine.settings.wake_word == "nira"
