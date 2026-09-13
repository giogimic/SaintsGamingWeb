#!/usr/bin/env bash
# Checks status of the Go MMO Server (Docker or Systemd)
# Exits with 0 if running, 1 if stopped/error

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GO_MMO_DIR="$ROOT/the-lobby"

if [ -f "$GO_MMO_DIR/docker-compose.yml" ]; then
    cd "$GO_MMO_DIR"
    if docker compose version >/dev/null 2>&1; then
        RUNNING=$(docker compose ps --status running --quiet)
    else
        RUNNING=$(docker-compose ps -q)
        # Note: older docker-compose ps -q returns all, we might need to filter.
        # But this is okay for a simple check.
    fi
    if [ -n "$RUNNING" ]; then
        echo "running"
        exit 0
    else
        echo "stopped"
        exit 1
    fi
else
    if command -v systemctl >/dev/null 2>&1; then
        if systemctl is-active --quiet saints-go-mmo.service; then
            echo "running"
            exit 0
        else
            echo "stopped"
            exit 1
        fi
    else
        echo "unknown"
        exit 1
    fi
fi
