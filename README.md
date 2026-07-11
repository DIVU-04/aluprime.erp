# Nira Agent

**Nira** is your personal AI assistant — inspired by Jarvis. It listens, reasons, uses tools, remembers context, and acts on your behalf.

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

**Interactive mode:**
```bash
python -m nira.main
```

**Single message:**
```bash
python -m nira.main "What's on my calendar today?"
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

## Example Interactions

```
You: Hey Nira
Nira: Hello! I'm Nira, your personal AI assistant. How can I help you today?

You: Remember my favorite color is blue
Nira: Got it — I'll remember that.

You: Turn off the living room lights
Nira: Lights (living_room) turned off.

You: What's 15% of 240?
Nira: 36
```

## Tools

| Tool | Description |
|------|-------------|
| `web_search` | DuckDuckGo web search |
| `file_operations` | Read, write, list files in workspace |
| `calendar` | Add, list, remove events |
| `run_code` | Execute Python snippets |
| `smart_home` | Control lights and thermostat (simulated) |
| `memory` | Store and recall long-term facts |

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

## Demo Mode

Without an API key, Nira runs in demo mode with basic greeting responses. Set `NIRA_LLM_API_KEY` to enable full LLM reasoning and tool use.

## License

MIT
