#!/usr/bin/env bash
# Check if Go MMO server is running
# Returns "running" or "stopped"

# 1. Quick probe to health endpoint on localhost:24011
if command -v curl &>/dev/null; then
  if curl -s -f -m 1 http://127.0.0.1:24011/api/health &>/dev/null; then
    echo "running"
    exit 0
  fi
fi

# 2. Check docker container status
if command -v docker &>/dev/null; then
  STATUS=$(docker inspect -f '{{.State.Running}}' saints-gaming-mmo-go 2>/dev/null || true)
  if [ "$STATUS" = "true" ]; then
    echo "running"
    exit 0
  fi
fi

# 3. Check systemd service if present
if command -v systemctl &>/dev/null; then
  if systemctl is-active --quiet saints-lobby 2>/dev/null; then
    echo "running"
    exit 0
  fi
fi

# 4. Check if process is listening on port 24011
if command -v ss &>/dev/null; then
  if ss -tlpn | grep -q ':24011 '; then
    echo "running"
    exit 0
  fi
elif command -v netstat &>/dev/null; then
  if netstat -tlpn 2>/dev/null | grep -q ':24011 '; then
    echo "running"
    exit 0
  fi
fi

echo "stopped"
exit 0
