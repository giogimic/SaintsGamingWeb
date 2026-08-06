#!/usr/bin/env bash
# Additive subdomain proxy helper for an *already running* Saints / Caddy host.
#
# This script NEVER:
#   - installs Caddy / Nginx
#   - rewrites the primary site block
#   - touches docker-compose / .env of the main app
#
# It ONLY upserts/lists/removes blocks between the managed markers via
# scripts/proxy-caddy.sh (safe for reruns).
#
# Usage:
#   ./scripts/dev-proxy.sh list
#   ./scripts/dev-proxy.sh add <subdomain> <port>              # host defaults to 127.0.0.1
#   ./scripts/dev-proxy.sh add <subdomain> <host:port>
#   ./scripts/dev-proxy.sh add <subdomain> <host> <port>
#   ./scripts/dev-proxy.sh remove <subdomain>
#   ./scripts/dev-proxy.sh reload
#   ./scripts/dev-proxy.sh status                             # detect existing Caddy + list
#   ./scripts/dev-proxy.sh ask                                # interactive add (asks first)
#
# Flags:
#   --dry-run     print what would happen; change nothing
#   --no-reload   skip Caddy reload after add/remove
#   -y            non-interactive (skip confirmations)
#
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROXY_SCRIPT="${PROXY_SCRIPT:-$ROOT/scripts/proxy-caddy.sh}"
CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"
DEFAULT_HOST="${DEV_PROXY_HOST:-127.0.0.1}"

DRY_RUN=0
NO_RELOAD=0
YES=0
ARGS=()

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --no-reload) NO_RELOAD=1 ;;
    -y|--yes) YES=1 ;;
    --help|-h)
      sed -n '1,35p' "$0"
      exit 0
      ;;
    *) ARGS+=("$arg") ;;
  esac
done
set -- "${ARGS[@]+"${ARGS[@]}"}"

log() { printf '[dev-proxy] %s\n' "$*" >&2; }
warn() { printf '[dev-proxy] WARN: %s\n' "$*" >&2; }
die() { printf '[dev-proxy] ERROR: %s\n' "$*" >&2; exit 1; }

caddy_detected() {
  if command -v caddy >/dev/null 2>&1; then return 0; fi
  if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files caddy.service 2>/dev/null | grep -q caddy; then
    return 0
  fi
  [[ -f "$CADDYFILE" ]]
}

caddy_running() {
  if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet caddy 2>/dev/null; then
    return 0
  fi
  if command -v caddy >/dev/null 2>&1 && pgrep -x caddy >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

ensure_proxy_script() {
  [[ -f "$PROXY_SCRIPT" ]] || die "Missing $PROXY_SCRIPT"
  if [[ ! -x "$PROXY_SCRIPT" ]]; then
    chmod +x "$PROXY_SCRIPT" 2>/dev/null || true
  fi
}

confirm() {
  local msg="$1"
  if [[ "$YES" -eq 1 ]]; then return 0; fi
  if [[ ! -t 0 ]]; then
    warn "No TTY — pass -y to confirm: $msg"
    return 1
  fi
  local ans
  read -rp "$msg [y/N]: " ans || true
  [[ "$ans" == "y" || "$ans" == "Y" || "$ans" == "yes" ]]
}

status_cmd() {
  echo "Caddyfile: $CADDYFILE"
  if caddy_detected; then
    echo "Caddy:     detected"
  else
    echo "Caddy:     not found"
  fi
  if caddy_running; then
    echo "Service:   running"
  else
    echo "Service:   not running (or unknown)"
  fi
  echo "Managed proxies:"
  ensure_proxy_script
  if [[ -f "$CADDYFILE" ]]; then
    CADDYFILE="$CADDYFILE" "$PROXY_SCRIPT" list || true
  else
    echo "  (no Caddyfile yet)"
  fi
}

add_cmd() {
  local subdomain="${1:-}"
  local a="${2:-}"
  local b="${3:-}"
  [[ -n "$subdomain" ]] || die "Usage: dev-proxy.sh add <subdomain> <port|host:port|host port>"

  if ! caddy_detected; then
    die "No existing Caddy install detected. Refusing to install or invent one — set up the primary server first, then re-run."
  fi

  local host="$DEFAULT_HOST"
  local port=""
  if [[ -n "$b" ]]; then
    host="$a"
    port="$b"
  elif [[ "$a" == *:* ]]; then
    host="${a%%:*}"
    port="${a##*:}"
  else
    port="$a"
  fi
  [[ -n "$port" && "$port" =~ ^[0-9]+$ ]] || die "Port must be numeric (got '${port:-}')."

  ensure_proxy_script
  log "Upsert subdomain: $subdomain -> ${host}:${port} (primary site untouched)"

  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "DRY-RUN: would run: $PROXY_SCRIPT add $subdomain $host $port"
    return 0
  fi

  if [[ "$YES" -ne 1 ]]; then
    confirm "Add/update proxy $subdomain -> ${host}:${port} on existing Caddy?" || die "Aborted."
  fi

  CADDYFILE="$CADDYFILE" "$PROXY_SCRIPT" add "$subdomain" "$host" "$port" || die "proxy-caddy add failed"

  if [[ "$NO_RELOAD" -eq 0 ]]; then
    CADDYFILE="$CADDYFILE" "$PROXY_SCRIPT" reload || warn "Reload failed — run: $PROXY_SCRIPT reload"
  else
    log "Skipped reload (--no-reload)."
  fi
  log "Done. Primary Caddy site was not rewritten."
}

remove_cmd() {
  local subdomain="${1:-}"
  [[ -n "$subdomain" ]] || die "Usage: dev-proxy.sh remove <subdomain>"
  ensure_proxy_script
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "DRY-RUN: would remove $subdomain"
    return 0
  fi
  if [[ "$YES" -ne 1 ]]; then
    confirm "Remove proxy block for $subdomain?" || die "Aborted."
  fi
  CADDYFILE="$CADDYFILE" "$PROXY_SCRIPT" remove "$subdomain" || die "remove failed"
  if [[ "$NO_RELOAD" -eq 0 ]]; then
    CADDYFILE="$CADDYFILE" "$PROXY_SCRIPT" reload || warn "Reload failed"
  fi
}

ask_cmd() {
  status_cmd
  echo
  if ! caddy_detected; then
    die "Nothing to attach to — no Caddy on this host."
  fi
  if caddy_running; then
    log "Existing Caddy is running — will only ADD a subdomain (no install / no primary rewrite)."
  else
    warn "Caddyfile present but service may be stopped — still additive-only."
  fi
  local sub port host
  if [[ -t 0 ]]; then
    read -rp "Subdomain to serve (e.g. go.example.com): " sub || true
    read -rp "Upstream port [$DEFAULT_HOST]: " port || true
    read -rp "Upstream host [$DEFAULT_HOST]: " host || true
  else
    die "ask requires a TTY (or use: add <subdomain> <port> -y)"
  fi
  host="${host:-$DEFAULT_HOST}"
  [[ -n "$sub" && -n "$port" ]] || die "Subdomain and port required."
  YES=1 add_cmd "$sub" "$host" "$port"
}

main() {
  local cmd="${1:-}"
  shift || true
  case "$cmd" in
    list)
      ensure_proxy_script
      CADDYFILE="$CADDYFILE" "$PROXY_SCRIPT" list
      ;;
    add) add_cmd "$@" ;;
    remove) remove_cmd "$@" ;;
    reload)
      ensure_proxy_script
      if [[ "$DRY_RUN" -eq 1 ]]; then log "DRY-RUN: would reload"; exit 0; fi
      CADDYFILE="$CADDYFILE" "$PROXY_SCRIPT" reload
      ;;
    status) status_cmd ;;
    ask) ask_cmd ;;
    ""|help|-h|--help)
      sed -n '1,35p' "$0"
      exit 0
      ;;
    *)
      die "Unknown command: $cmd (try list|add|remove|reload|status|ask)"
      ;;
  esac
}

main "$@"
