#!/usr/bin/env bash
set -euo pipefail

echo "Installing IT Lead Gen dependencies for Ubuntu / Debian..."

sudo apt-get update
sudo apt-get install -y python3 python3-venv python3-pip

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env — add GOOGLE_MAPS_API_KEY"
fi

python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

echo ""
echo "Done. Start with: ./run.sh"
