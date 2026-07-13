# aluprime.erp

## Cursor Cloud specific instructions

### Repository layout (important, non-obvious)

`main` is essentially empty (only this file and a one-line `README.md`). This repo is a
**multi-product sandbox**: each product lives on its own `cursor/*` feature branch and they are
unrelated to each other. To work on or run a product, check out (or create a worktree from) its
branch:

| Product | Branch | Stack | Run |
| --- | --- | --- | --- |
| RideNow (ride-booking app) | `cursor/uber-rapido-app-mvp-0fbc` | Node/Express + `ws` | `npm install` then `npm start` → http://localhost:3000 |
| Nira (Jarvis-style AI agent) | `cursor/nira-agent-implementation-e0fb` | Python 3.10+, FastAPI | `python3 -m nira.main --server` → http://localhost:8080 (CLI: `python3 -m nira.main`) |
| KB Garage (static marketing site) | `cursor/kb-garage-website-c2d5` | Static HTML/CSS/JS | `python3 -m http.server 8000` → http://localhost:8000 |
| KB Garage (simpler variant) | `cursor/kb-garage-website-8043` | Static HTML/CSS/JS | site is in `kb-garage-website/` subfolder |
| Jarvis flowchart | `cursor/jarvis-agent-flowchart-6e1a` | Markdown/Mermaid docs | nothing to run |

Per-product commands are documented in each branch's own `README.md`.

To run a product without leaving your current branch, use a git worktree, e.g.
`git worktree add /home/ubuntu/worktrees/ridenow origin/cursor/uber-rapido-app-mvp-0fbc`.

### Dependencies / update script

The startup update script is intentionally **guarded and generic** because `main` has no manifests:
it runs `npm ci`/`npm install` only when a `package.json` is present, and
`pip install --user -r requirements.txt pytest` only when a `requirements.txt` is present. So it is a
no-op on `main` and auto-installs the right deps for whichever product branch is checked out.

- Python packages install to the **user site** (`~/.local`), not a virtualenv. Run tools with
  `python3 -m ...`. `~/.local/bin` may not be on `PATH`.
- Nira's test suite needs `pytest`, which Nira does **not** declare as a dependency; the update script
  installs it alongside `requirements.txt`. Run tests with `python3 -m pytest` from the Nira branch.

### Per-product run/test caveats

- **Nira** runs in a degraded **demo mode** without an LLM key: `/api/chat` returns a canned greeting
  and tools are not driven by an LLM. Full reasoning/tool use requires the optional secret
  `NIRA_LLM_API_KEY` (OpenAI-compatible). Copy `.env.example` to `.env` to configure. No key is needed
  to run the server or pass the test suite (`python3 -m pytest`, 26 tests).
- **RideNow** keeps all state **in memory** — every restart wipes users/rides. It has no test script.
  All 5 surfaces are served by the one process: rider `/`, driver `/driver.html`,
  admin `/admin.html` (default token `rideadmin`, override with `ADMIN_TOKEN`), tracker `/track.html`,
  API docs `/api/docs`. Override the port with `PORT=...`.
- **KB Garage** has no build step; serve the folder statically (browser-side map/WhatsApp links need
  internet).

None of the products require a database, cache, or other companion service.
