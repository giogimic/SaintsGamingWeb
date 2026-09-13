#!/usr/bin/env bash
# Stops the Go MMO Server (Docker or Systemd)

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GO_MMO_DIR="$ROOT/the-lobby"

if [ -f "$GO_MMO_DIR/docker-compose.yml" ]; then
    echo "[stop-go] Stopping Docker container..."
    cd "$GO_MMO_DIR"
    if docker compose version >/dev/null 2>&1; then
        docker compose stop
    else
        docker-compose stop
    fi
    echo "[stop-go] Done."
else
    echo "[stop-go] Checking for systemd service..."
    if command -v systemctl >/dev/null 2>&1; then
        sudo systemctl stop saints-go-mmo.service
        echo "[stop-go] Service stopped."
    else
        echo "[stop-go] No docker-compose.yml or systemctl found. Cannot stop automatically."
        exit 1
    fi
fi
