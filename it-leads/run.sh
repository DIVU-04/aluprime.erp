#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

PLATFORM="$(uname -s 2>/dev/null || echo Unknown)"

if [[ ! -f .env ]]; then
  echo "Creating .env from .env.example — add your GOOGLE_MAPS_API_KEY before searching."
  cp .env.example .env
fi

if [[ ! -d .venv ]]; then
  python3 -m venv .venv 2>/dev/null || {
    echo "python3-venv not found. On Ubuntu run: sudo apt install python3-venv"
    exit 1
  }
  .venv/bin/pip install -r requirements.txt
fi

# Show network URL for iOS / Android on same Wi-Fi
LOCAL_IP=""
if command -v ip >/dev/null 2>&1; then
  LOCAL_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if ($i=="src") {print $(i+1); exit}}')
elif command -v ifconfig >/dev/null 2>&1; then
  LOCAL_IP=$(ifconfig 2>/dev/null | awk '/inet / && $2 != "127.0.0.1" {print $2; exit}' | tr -d 'addr:')
fi

echo ""
echo "IT Maps Lead Generator"
echo "  Platform: ${PLATFORM} (macOS / Linux / Ubuntu compatible)"
echo "  Local:    http://localhost:8080"
if [[ -n "${LOCAL_IP}" ]]; then
  echo "  Network:  http://${LOCAL_IP}:8080  (iPhone, iPad, Android on same Wi-Fi)"
fi
echo "  Install:  Open in Safari/Chrome → Add to Home Screen / Install App"
echo ""

exec .venv/bin/uvicorn server.main:app --reload --host 0.0.0.0 --port 8080
