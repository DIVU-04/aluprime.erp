"""Nira web API and chat interface."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

if TYPE_CHECKING:
    from nira.agent.orchestrator import NiraAgent

CHAT_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nira Agent</title>
  <style>
    :root {
      --bg: #0a0e17;
      --panel: #111827;
      --border: #06b6d4;
      --text: #e2e8f0;
      --accent: #22d3ee;
      --user: #34d399;
      --nira: #67e8f9;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border);
      background: linear-gradient(135deg, #0f172a, #1e1b4b);
    }
    header h1 { color: var(--accent); font-size: 1.4rem; letter-spacing: 0.15em; }
    header p { color: #94a3b8; font-size: 0.8rem; margin-top: 0.25rem; }
    #chat {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .msg {
      max-width: 80%;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    .msg.user {
      align-self: flex-end;
      background: #064e3b;
      border: 1px solid var(--user);
      color: var(--user);
    }
    .msg.nira {
      align-self: flex-start;
      background: var(--panel);
      border: 1px solid var(--border);
      color: var(--nira);
    }
    .input-bar {
      display: flex;
      gap: 0.5rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #1e293b;
      background: var(--panel);
    }
    input {
      flex: 1;
      background: var(--bg);
      border: 1px solid #334155;
      color: var(--text);
      padding: 0.75rem 1rem;
      border-radius: 6px;
      font-size: 1rem;
      outline: none;
    }
    input:focus { border-color: var(--border); }
    button {
      background: linear-gradient(135deg, #0891b2, #6366f1);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      letter-spacing: 0.05em;
    }
    button:hover { opacity: 0.9; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .typing { color: #64748b; font-style: italic; padding: 0 1.5rem 1rem; }
  </style>
</head>
<body>
  <header>
    <h1>NIRA AGENT</h1>
    <p>FutureStick Neural Interface // Web Channel</p>
  </header>
  <div id="chat"></div>
  <div class="typing" id="typing" style="display:none">Nira is thinking...</div>
  <div class="input-bar">
    <input id="input" placeholder="Ask Nira anything..." autofocus />
    <button id="send">SEND</button>
  </div>
  <script>
    const chat = document.getElementById('chat');
    const input = document.getElementById('input');
    const send = document.getElementById('send');
    const typing = document.getElementById('typing');

    function addMsg(text, role) {
      const div = document.createElement('div');
      div.className = 'msg ' + role;
      div.textContent = text;
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }

    async function submit() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      addMsg(text, 'user');
      send.disabled = true;
      typing.style.display = 'block';
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        });
        const data = await res.json();
        addMsg(data.response || data.detail || 'No response', 'nira');
      } catch (e) {
        addMsg('Connection error. Is the server running?', 'nira');
      }
      typing.style.display = 'none';
      send.disabled = false;
      input.focus();
    }

    send.addEventListener('click', submit);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    addMsg('Hello! I am Nira, your personal AI assistant. How can I help?', 'nira');
  </script>
</body>
</html>"""


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


def create_app(agent: NiraAgent) -> FastAPI:
    app = FastAPI(title="Nira Agent API", version="0.2.0")

    @app.get("/", response_class=HTMLResponse)
    def home() -> str:
        return CHAT_HTML

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "online", "agent": agent.settings.agent_name}

    @app.post("/api/chat", response_model=ChatResponse)
    def chat(req: ChatRequest) -> ChatResponse:
        from nira.output.response import OutputMode

        # Suppress console output during API calls
        agent.settings.futuristic_ui = False
        agent._init_output()
        response = agent.process(req.message, output_mode=OutputMode.TEXT)
        return ChatResponse(response=response)

    @app.get("/api/briefing")
    def briefing() -> dict[str, str]:
        from nira.services.briefing import BriefingService

        text = BriefingService(agent).generate()
        return {"briefing": text}

    @app.get("/api/tools")
    def list_tools() -> dict[str, list[str]]:
        return {"tools": [t.name for t in agent.tools.list_tools()]}

    @app.post("/api/trigger/{event}")
    def trigger(event: str, message: str = "") -> ChatResponse:
        response = agent.process_trigger(event, {"message": message or event})
        return ChatResponse(response=response)

    return app
