# Nira Agent

**Nira** is your personal AI assistant — inspired by Jarvis. It listens, reasons, uses tools, remembers context, and acts on your behalf.

Powered by the **FutureStick** interface — a futuristic HUD with boot sequence, neon panels, live processing animations, and system status dashboards.

## Architecture

Nira follows a layered architecture matching the agent flowchart:

```
Input → Perception → Memory + Context → Brain (Router → Planner → LLM) → Tools → Output → Feedback
```

| Layer | Components |
|-------|-----------|
| **Input** | Text CLI, triggers, scheduled tasks (voice-ready) |
| **Perception** | Intent parsing, entity extraction, context builder |
| **Memory** | Short-term conversation, long-term facts, user profile, knowledge base |
| **Brain** | Intent router, task planner, LLM with tool-calling loop |
| **Tools** | Web search, files, calendar, code execution, smart home, memory |
| **Output** | Rich text UI (voice-ready) |
| **Feedback** | Interaction logging, reflection, memory updates |

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env and set NIRA_LLM_API_KEY
```

### 3. Run

**Interactive mode (FutureStick HUD):**
```bash
python3 -m nira.main
```

**Classic UI:**
```bash
python3 -m nira.main --classic
```

**Voice mode (speak & listen):**
```bash
pip install -r requirements-voice.txt
python3 -m nira.main --voice
```

**Wake-word mode:**
```bash
python3 -m nira.main --voice --wake
# Say "Hey Nira" then your command
```

**Single message:**
```bash
python -m nira.main "What's on my calendar today?"
```

**Daily briefing:**
```bash
python3 -m nira.main --briefing
```

**Web server (chat UI + API):**
```bash
python3 -m nira.main --server
# Open http://localhost:8080
```

**Simulate a trigger:**
```bash
python -m nira.main --trigger "motion_detected"
```

**Simulate a scheduled task:**
```bash
python -m nira.main --schedule "Daily briefing"
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `quit` / `exit` | End the session |
| `/clear` | Reset conversation memory |
| `/status` | Show agent configuration |
| `/briefing` | Daily morning briefing |
| `/help` | Show all commands |
| `/voice` | Toggle voice input/output on or off |

## Example Interactions

```
You: Hey Nira
Nira: Hello! I'm Nira, your personal AI assistant. How can I help you today?

You: Remember my favorite color is blue
Nira: Got it — I'll remember that.

You: Turn off the living room lights
Nira: Lights (living_room) turned off.

You: What's the weather in Tokyo?
Nira: Weather in Tokyo: 22°C, Partly cloudy...

You: Set a timer for 10 minutes to take a break
Nira: Timer set — 'take a break' in 10 min.

You: /briefing
Nira: Good morning! Here's your daily briefing...
```

## Tools

| Tool | Description |
|------|-------------|
| `web_search` | DuckDuckGo web search |
| `file_operations` | Read, write, list files in workspace |
| `calendar` | Add, list, remove events |
| `notes` | Quick notes — add, list, search, delete |
| `timers` | Set timers and reminders |
| `weather` | Current weather and forecast (Open-Meteo) |
| `system_info` | Date, time, and system details |
| `http_fetch` | Fetch data from any URL |
| `run_code` | Execute Python snippets |
| `smart_home` | Control lights and thermostat (simulated) |
| `memory` | Store and recall long-term facts |

## Web API

Start the server with `python3 -m nira.main --server`, then use:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Futuristic web chat UI |
| `/api/chat` | POST | `{"message": "..."}` → get response |
| `/api/briefing` | GET | Daily briefing JSON |
| `/api/tools` | GET | List available tools |
| `/api/trigger/{event}` | POST | Fire a trigger event |
| `/health` | GET | Health check |

## Project Structure

```
nira/
├── main.py              # CLI entry point
├── config.py            # Settings from environment
├── agent/
│   └── orchestrator.py  # Main pipeline orchestrator
├── perception/
│   ├── nlp.py           # Intent & entity parsing
│   ├── context.py       # Context assembly
│   └── voice.py         # Voice I/O (optional)
├── memory/
│   ├── short_term.py    # Session conversation
│   ├── long_term.py     # Persistent facts
│   ├── user_profile.py  # User preferences
│   └── knowledge.py     # Local knowledge base
├── brain/
│   ├── router.py        # Intent routing
│   ├── planner.py       # Task planning
│   └── llm.py           # LLM + tool loop
├── tools/
│   ├── registry.py      # Tool registry
│   ├── web_search.py
│   ├── files.py
│   ├── calendar.py
│   ├── code_exec.py
│   ├── smart_home.py
│   └── memory_tool.py
├── output/
│   └── response.py      # Response delivery
└── feedback/
    ├── logger.py        # Interaction logs
    └── reflection.py    # Memory reflection
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NIRA_LLM_API_KEY` | — | OpenAI-compatible API key |
| `NIRA_LLM_BASE_URL` | `https://api.openai.com/v1` | API base URL |
| `NIRA_LLM_MODEL` | `gpt-4o-mini` | Model name |
| `NIRA_AGENT_NAME` | `Nira` | Agent display name |
| `NIRA_DATA_DIR` | `./data` | Data storage directory |
| `NIRA_FUTURISTIC_UI` | `true` | Enable FutureStick HUD interface |
| `NIRA_VOICE_ENABLED` | `false` | Enable voice by default |
| `NIRA_WAKE_WORD` | `nira` | Wake word (say "Hey Nira") |
| `NIRA_TTS_RATE` | `175` | Speech rate for text-to-speech |
| `NIRA_DEFAULT_CITY` | `London` | Default city for weather |
| `NIRA_API_HOST` | `0.0.0.0` | Web server host |
| `NIRA_API_PORT` | `8080` | Web server port |

## Voice Setup

```bash
# Linux
sudo apt install portaudio19-dev espeak
pip install -r requirements-voice.txt

# macOS
brew install portaudio espeak
pip install -r requirements-voice.txt
```

| Mode | Command |
|------|---------|
| Voice chat | `python3 -m nira.main --voice` |
| Wake word | `python3 -m nira.main --voice --wake` |
| Toggle in chat | `/voice` |
| Speak one reply | `python3 -m nira.main "Hello" --speak` |

Say **"Hey Nira"** followed by your command, or speak directly in voice mode.

## Demo Mode

Without an API key, Nira runs in demo mode with basic greeting responses. Set `NIRA_LLM_API_KEY` to enable full LLM reasoning and tool use.

## License

MIT
