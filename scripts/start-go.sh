#!/usr/bin/env bash
# Starts the Go MMO Server (Docker or Systemd)

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GO_MMO_DIR="$ROOT/the-lobby"

if [ -f "$GO_MMO_DIR/docker-compose.yml" ]; then
    echo "[start-go] Starting Docker container..."
    cd "$GO_MMO_DIR"
    if docker compose version >/dev/null 2>&1; then
        docker compose up -d
    else
        docker-compose up -d
    fi
    echo "[start-go] Done."
else
    echo "[start-go] Checking for systemd service..."
    if command -v systemctl >/dev/null 2>&1; then
        sudo systemctl start saints-go-mmo.service
        echo "[start-go] Service started."
    else
        echo "[start-go] No docker-compose.yml or systemctl found. Cannot start automatically."
        exit 1
    fi
fi
