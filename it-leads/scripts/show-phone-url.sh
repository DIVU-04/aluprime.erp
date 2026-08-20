#!/usr/bin/env bash
# Print network URL for phone access
cd "$(dirname "$0")/.."
PORT=8080

IP=""
if command -v ip >/dev/null 2>&1; then
  IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if ($i=="src") {print $(i+1); exit}}')
elif command -v ifconfig >/dev/null 2>&1; then
  IP=$(ifconfig 2>/dev/null | awk '/inet / && $2 != "127.0.0.1" {print $2; exit}' | tr -d 'addr:')
fi

echo ""
echo "=== OPEN ON YOUR PHONE (same Wi-Fi) ==="
if [[ -n "$IP" ]]; then
  echo "  http://${IP}:${PORT}"
  echo ""
  echo "Do NOT use localhost on your phone."
else
  echo "  Could not detect IP. Check ip addr or ifconfig."
fi
echo "======================================="
echo ""
