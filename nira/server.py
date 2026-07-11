"""Start the Nira web server."""

import uvicorn

from nira.agent.orchestrator import NiraAgent
from nira.api.server import create_app
from nira.config import get_settings


def run_server() -> None:
    settings = get_settings()
    agent = NiraAgent(settings)
    app = create_app(agent)
    uvicorn.run(app, host=settings.api_host, port=settings.api_port, log_level="info")


if __name__ == "__main__":
    run_server()
