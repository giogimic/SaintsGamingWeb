#!/usr/bin/env bash
# Local / staging smoke for forum, lobby, realtime surfaces.
# Usage:
#   PORT=3010 ./scripts/smoke-staging.sh
#   BASE_URL=https://staging.example ./scripts/smoke-staging.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:${PORT:-3000}}"
FAIL=0

check() {
  local name="$1"
  local path="$2"
  local expect="${3:-200}"
  local code
  code=$(curl -sS -o /tmp/sg-smoke-body -w '%{http_code}' --max-time 20 "${BASE_URL}${path}" || echo "000")
  if [[ "$code" == "$expect" ]]; then
    echo "OK  ${name} (${code}) ${path}"
  else
    echo "FAIL ${name} (got ${code}, want ${expect}) ${path}"
    FAIL=1
  fi
}

echo "Smoke against ${BASE_URL}"
check "game server-status" "/api/game/server-status" 200
check "home" "/home" 200
check "forum" "/forum" 200
check "lobby" "/lobby" 200
check "login" "/login" 200
check "servers" "/servers" 200
# Unauthenticated sync should reject (auth gate alive)
check "realtime sync auth gate" "/api/realtime/sync" 401
check "socket.io polling" "/socket.io/?EIO=4&transport=polling" 200

if [[ "$FAIL" -ne 0 ]]; then
  echo "Smoke FAILED"
  exit 1
fi

echo "Smoke PASSED"
status=$(curl -sS "${BASE_URL}/api/game/server-status" || true)
echo "server-status body: ${status}"
