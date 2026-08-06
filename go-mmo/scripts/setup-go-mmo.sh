#!/usr/bin/env bash
# Setup Go MMO as a parallel development server on alternate ports.
# Detects an existing Caddy install, prompts for a subdomain, and adds a
# reverse_proxy block via scripts/proxy-caddy.sh markers (does not clobber
# the primary site). Never merges to main — this lives on the go-mmo branch.
#
# Usage:
#   ./go-mmo/scripts/setup-go-mmo.sh
#   GO_MMO_SUBDOMAIN=go.example.com GO_MMO_PORT=3100 ./go-mmo/scripts/setup-go-mmo.sh --non-interactive
#
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GO_MMO_DIR="$ROOT/go-mmo"
PROXY_SCRIPT="$ROOT/scripts/proxy-caddy.sh"
CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"
ENV_FILE="$GO_MMO_DIR/.env"
ENV_EXAMPLE="$GO_MMO_DIR/.env.example"

DEFAULT_PORT="${GO_MMO_PORT:-3100}"
DEFAULT_HOST="${GO_MMO_HOST:-127.0.0.1}"
NON_INTERACTIVE=0

for arg in "$@"; do
  case "$arg" in
    --non-interactive|-y) NON_INTERACTIVE=1 ;;
    --help|-h)
      sed -n '1,20p' "$0"
      exit 0
      ;;
  esac
done

log() { printf '[setup-go-mmo] %s\n' "$*"; }
warn() { printf '[setup-go-mmo] WARN: %s\n' "$*" >&2; }

detect_caddy() {
  if command -v caddy >/dev/null 2>&1; then
    echo "cli"
    return 0
  fi
  if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files caddy.service 2>/dev/null | grep -q caddy; then
    echo "systemd"
    return 0
  fi
  if [[ -f "$CADDYFILE" ]]; then
    echo "file"
    return 0
  fi
  echo "none"
}

prompt() {
  local msg="$1"
  local def="${2:-}"
  local val=""
  if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
    echo "$def"
    return 0
  fi
  if [[ -n "$def" ]]; then
    read -rp "$msg [$def]: " val || true
  else
    read -rp "$msg: " val || true
  fi
  if [[ -z "$val" ]]; then
    echo "$def"
  else
    echo "$val"
  fi
}

yesno() {
  local msg="$1"
  local def="${2:-y}"
  if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
    [[ "$def" == "y" || "$def" == "Y" ]]
    return $?
  fi
  local ans
  read -rp "$msg [Y/n]: " ans || true
  ans="${ans:-$def}"
  [[ "$ans" == "y" || "$ans" == "Y" || "$ans" == "yes" ]]
}

write_env() {
  local port="$1"
  local host="$2"
  local public_url="$3"
  local db_url="$4"
  cat > "$ENV_FILE" <<EOF
# Go MMO development server (parallel to Next on :3000)
GO_MMO_HOST=$host
GO_MMO_PORT=$port
GO_MMO_PUBLIC_URL=$public_url
GO_MMO_DATABASE_URL=$db_url
GO_MMO_DEV_AUTH=true
GO_MMO_SIM_TPS=20
GO_MMO_NET_TPS=10
GO_MMO_LOBBY_CAPACITY=50
GO_MMO_CORS_ORIGIN=*
# Share Auth.js secret with the Next app when ready for cookie auth
AUTH_SECRET=\${AUTH_SECRET:-dev-secret-change-me}
EOF
  log "Wrote $ENV_FILE"
}

ensure_env_example() {
  if [[ ! -f "$ENV_EXAMPLE" ]]; then
    cp "$ENV_FILE" "$ENV_EXAMPLE" 2>/dev/null || true
  fi
}

build_binary() {
  if ! command -v go >/dev/null 2>&1; then
    warn "Go toolchain not found — skip build. Install Go 1.22+ then: cd go-mmo && go build -o bin/go-mmo ./cmd/server"
    return 1
  fi
  mkdir -p "$GO_MMO_DIR/bin"
  (cd "$GO_MMO_DIR" && go build -o bin/go-mmo ./cmd/server)
  log "Built $GO_MMO_DIR/bin/go-mmo"
}

main() {
  log "Root: $ROOT"
  log "Go MMO is a separate branch/runtime — default listen port $DEFAULT_PORT (Next stays on 3000)."

  local caddy_mode
  caddy_mode="$(detect_caddy)"
  case "$caddy_mode" in
    none)
      warn "No Caddy detected (no caddy binary, caddy.service, or $CADDYFILE)."
      warn "Continuing with local-only bind. Install/configure Caddy later and re-run this script."
      ;;
    *)
      log "Caddy detected via: $caddy_mode (Caddyfile=$CADDYFILE)"
      ;;
  esac

  local port host subdomain public_url db_url add_proxy
  port="$(prompt "Go MMO listen port" "$DEFAULT_PORT")"
  host="$(prompt "Go MMO bind host" "$DEFAULT_HOST")"
  db_url="$(prompt "SQLite database URL" "file:$ROOT/prisma/db/go-mmo-dev.db")"

  subdomain=""
  public_url="http://${host}:${port}"
  add_proxy=0

  # Prefer explicit subdomain from env (esp. non-interactive / CI).
  if [[ -n "${GO_MMO_SUBDOMAIN:-}" ]]; then
    subdomain="$GO_MMO_SUBDOMAIN"
    public_url="https://${subdomain}"
    add_proxy=1
  elif [[ "$caddy_mode" != "none" ]]; then
    if yesno "Add/update a Caddy reverse_proxy subdomain for this Go MMO instance?" "y"; then
      add_proxy=1
      subdomain="$(prompt "Subdomain / host to serve (e.g. go.saintsgaming.net or go.localhost)" "")"
      if [[ -z "$subdomain" ]]; then
        warn "No subdomain provided — skipping Caddy integration."
        add_proxy=0
      else
        public_url="https://${subdomain}"
      fi
    fi
  else
    if yesno "No live Caddy found — still write a proxy block if Caddyfile path is writable?" "n"; then
      add_proxy=1
      subdomain="$(prompt "Subdomain / host to serve" "${GO_MMO_SUBDOMAIN:-}")"
      if [[ -z "$subdomain" ]]; then
        add_proxy=0
      else
        public_url="https://${subdomain}"
        # Ensure target file exists with markers so proxy-caddy can manage it.
        if [[ ! -f "$CADDYFILE" ]]; then
          mkdir -p "$(dirname "$CADDYFILE")" 2>/dev/null || true
          printf '%s\n' "# Saints Gaming — managed proxies" "# SAINTS_PROXY_LIST_BEGIN" "# SAINTS_PROXY_LIST_END" > "$CADDYFILE" 2>/dev/null \
            || warn "Could not create $CADDYFILE (need permissions)."
        fi
      fi
    fi
  fi

  write_env "$port" "$host" "$public_url" "$db_url"
  ensure_env_example

  if [[ "$add_proxy" -eq 1 ]]; then
    if [[ ! -x "$PROXY_SCRIPT" && -f "$PROXY_SCRIPT" ]]; then
      chmod +x "$PROXY_SCRIPT" || true
    fi
    if [[ ! -f "$PROXY_SCRIPT" ]]; then
      warn "Missing $PROXY_SCRIPT — cannot patch Caddyfile automatically."
    else
      log "Adding Caddy proxy: $subdomain -> ${host}:${port}"
      if CADDYFILE="$CADDYFILE" "$PROXY_SCRIPT" add "$subdomain" "$host" "$port"; then
        if yesno "Reload Caddy now?" "y"; then
          if command -v caddy >/dev/null 2>&1 || (command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet caddy 2>/dev/null); then
            CADDYFILE="$CADDYFILE" "$PROXY_SCRIPT" reload || warn "Caddy reload failed — reload manually."
          else
            warn "Caddy not running in this environment — proxy block written; reload on the host later."
          fi
        fi
        log "Caddy block managed between # SAINTS_PROXY_LIST_BEGIN/END markers."
      else
        warn "proxy-caddy add failed. You can run manually:"
        warn "  $PROXY_SCRIPT add $subdomain $host $port && $PROXY_SCRIPT reload"
      fi
    fi
  fi

  build_binary || true

  cat <<EOF

------------------------------------------------------------
 Go MMO test environment ready (separate from Next :3000)
------------------------------------------------------------
  Bind:     ${host}:${port}
  Public:   ${public_url}
  Env:      ${ENV_FILE}
  Health:   curl ${public_url%/}/healthz
  Maps:     curl ${public_url%/}/api/maps
  Sockets:  ${public_url%/}/socket.io/

 Start:
   set -a; source ${ENV_FILE}; set +a
   ${GO_MMO_DIR}/bin/go-mmo
   # or: cd ${GO_MMO_DIR} && go run ./cmd/server

 Dev auth: connect with socket.io auth: { token: "dev:<accountId>" }
 This branch must NOT merge to main until you decide.
------------------------------------------------------------
EOF
}

main "$@"
