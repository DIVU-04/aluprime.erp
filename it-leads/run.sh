#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  echo "Creating .env from .env.example — add your GOOGLE_MAPS_API_KEY before searching."
  cp .env.example .env
fi

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi

exec .venv/bin/uvicorn server.main:app --reload --host 0.0.0.0 --port 8080
