#!/usr/bin/env bash
# Fetches logs for the Go MMO Server (Docker or Systemd)

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GO_MMO_DIR="$ROOT/the-lobby"

if [ -f "$GO_MMO_DIR/docker-compose.yml" ]; then
    cd "$GO_MMO_DIR"
    if docker compose version >/dev/null 2>&1; then
        docker compose logs --tail=100 -f
    else
        docker-compose logs --tail=100 -f
    fi
else
    if command -v systemctl >/dev/null 2>&1; then
        sudo journalctl -u saints-go-mmo.service -f -n 100
    else
        echo "[logs-go] No docker-compose.yml or systemctl found."
        exit 1
    fi
fi
