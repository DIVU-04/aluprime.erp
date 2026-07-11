"""Tests for Nira web API."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from nira.agent.orchestrator import NiraAgent
from nira.api.server import create_app
from nira.config import Settings


@pytest.fixture
def client(tmp_path: Path) -> TestClient:
    settings = Settings(
        data_dir=tmp_path / "data",
        llm_api_key="",
        web_search_enabled=False,
        futuristic_ui=False,
    )
    agent = NiraAgent(settings)
    app = create_app(agent)
    return TestClient(app)


def test_health(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "online"


def test_chat(client: TestClient):
    response = client.post("/api/chat", json={"message": "Hello"})
    assert response.status_code == 200
    assert "response" in response.json()


def test_briefing_api(client: TestClient):
    response = client.get("/api/briefing")
    assert response.status_code == 200
    assert "briefing" in response.json()


def test_tools_api(client: TestClient):
    response = client.get("/api/tools")
    assert response.status_code == 200
    tools = response.json()["tools"]
    assert "weather" in tools
    assert "notes" in tools


def test_home_page(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    assert "NIRA AGENT" in response.text
