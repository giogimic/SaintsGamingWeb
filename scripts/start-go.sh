#!/usr/bin/env bash
# Start Go MMO server (Debian / Linux First)
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[start-go] Starting Saints Gaming Go MMO server..."

# 1. If Docker compose is available and docker-compose.yml exists, use docker compose
if command -v docker &>/dev/null && [ -f "$ROOT/docker-compose.yml" ]; then
  echo "[start-go] Starting via Docker Compose..."
  docker compose up -d game-server
  exit 0
fi

# 2. If systemd service exists, use systemctl
if command -v systemctl &>/dev/null && [ -f /etc/systemd/system/saints-lobby.service ]; then
  echo "[start-go] Starting via systemctl..."
  sudo systemctl start saints-lobby
  exit 0
fi

# 3. Fallback: Build and run binary in background
if [ -d "$ROOT/the-lobby" ]; then
  echo "[start-go] Starting binary in background..."
  cd "$ROOT/the-lobby"
  if command -v go &>/dev/null; then
    mkdir -p "$ROOT/the-lobby/bin"
    go build -o "$ROOT/the-lobby/bin/server" ./cmd/server
    nohup "$ROOT/the-lobby/bin/server" > "$ROOT/the-lobby/server.log" 2>&1 &
    echo "[start-go] Process started with PID $!"
    exit 0
  fi
fi

echo "[start-go] Error: No valid runner found (docker, systemd, or go compiler)."
exit 1
