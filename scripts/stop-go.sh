#!/usr/bin/env bash
# Stop Go MMO server (Debian / Linux First)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[stop-go] Stopping Saints Gaming Go MMO server..."

# 1. Docker Compose
if command -v docker &>/dev/null; then
  docker compose stop game-server 2>/dev/null || docker stop saints-gaming-mmo-go 2>/dev/null || true
fi

# 2. Systemd
if command -v systemctl &>/dev/null && [ -f /etc/systemd/system/saints-lobby.service ]; then
  sudo systemctl stop saints-lobby 2>/dev/null || true
fi

# 3. Kill any lingering process listening on 24011
if command -v fuser &>/dev/null; then
  fuser -k 24011/tcp 2>/dev/null || true
fi

echo "[stop-go] Go MMO server stopped."
exit 0
