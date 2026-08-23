#!/usr/bin/env bash
# Setup Go MMO as a parallel development server beside an existing Saints install.
#
# Design (Option A — additive):
#   - If Caddy / primary stack is already running → ASK, then only ADD a subdomain
#     via scripts/dev-proxy.sh (never rewrite the primary site, never reinstall Caddy).
#   - Unique Docker container names (base → base1 → base2…) so it cannot conflict
#     with itself or the primary web container.
#   - Reruns are safe: proxy upsert + free port + free container name.
#
# Usage:
#   ./the-lobby/scripts/setup-the-lobby.sh
#   GO_MMO_SUBDOMAIN=go.example.com GO_MMO_PORT=3001 \
#     ./the-lobby/scripts/setup-the-lobby.sh --non-interactive --docker --full
#
# Flags:
#   --full   Force full stack (env + docker/binary + optional proxy), even when
#            Caddy/containers already exist. Used by scripts/setup.sh.
#   --proxy-only   Only upsert a Caddy subdomain (no containers).
#
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GO_MMO_DIR="$ROOT/the-lobby"
if [ ! -d "$GO_MMO_DIR" ]; then
  GO_MMO_DIR="$ROOT/go-mmo"
fi
DEV_PROXY="$ROOT/scripts/dev-proxy.sh"
PROXY_SCRIPT="$ROOT/scripts/proxy-caddy.sh"
CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"
ENV_FILE="$GO_MMO_DIR/.env"
ENV_EXAMPLE="$GO_MMO_DIR/.env.example"
COMPOSE_BASE="$GO_MMO_DIR/docker-compose.base.yml"
COMPOSE_FILE="$GO_MMO_DIR/docker-compose.yml"

DEFAULT_PORT="${GO_MMO_PORT:-3001}"
DEFAULT_HOST="${GO_MMO_HOST:-127.0.0.1}"
CONTAINER_BASE="${GO_MMO_CONTAINER_NAME:-${LOBBY_CONTAINER_NAME:-saints-lobby}}"
IMAGE_BASE="${GO_MMO_IMAGE_NAME:-${LOBBY_IMAGE_NAME:-saints-lobby}}"
COMPOSE_PROJECT_BASE="${GO_MMO_COMPOSE_PROJECT:-${LOBBY_COMPOSE_PROJECT:-saints-lobby}}"
NON_INTERACTIVE=0
USE_DOCKER="${GO_MMO_USE_DOCKER:-auto}"
PROXY_ONLY=0
FORCE_FULL=0

for arg in "$@"; do
  case "$arg" in
    --non-interactive|-y) NON_INTERACTIVE=1 ;;
    --docker) USE_DOCKER=1 ;;
    --no-docker) USE_DOCKER=0 ;;
    --proxy-only) PROXY_ONLY=1 ;;
    --full) FORCE_FULL=1 ;;
    --help|-h)
      sed -n '1,25p' "$0"
      exit 0
      ;;
  esac
done

log() { printf '[setup-the-lobby] %s\n' "$*" >&2; }
warn() { printf '[setup-the-lobby] WARN: %s\n' "$*" >&2; }

detect_caddy() {
  if command -v caddy >/dev/null 2>&1; then echo "cli"; return 0; fi
  if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files caddy.service 2>/dev/null | grep -q caddy; then
    echo "systemd"; return 0
  fi
  if [[ -f "$CADDYFILE" ]]; then echo "file"; return 0; fi
  echo "none"
}

caddy_running() {
  command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet caddy 2>/dev/null && return 0
  command -v pgrep >/dev/null 2>&1 && pgrep -x caddy >/dev/null 2>&1 && return 0
  return 1
}

docker_available() {
  command -v docker >/dev/null 2>&1 || return 1
  docker info >/dev/null 2>&1 || return 1
  return 0
}

container_name_in_use() {
  local name="$1"
  command -v docker >/dev/null 2>&1 || return 1
  docker ps -a --format '{{.Names}}' 2>/dev/null | grep -Fxq -- "$name"
}

compose_project_in_use() {
  local name="$1"
  command -v docker >/dev/null 2>&1 || return 1
  if docker compose ls --format '{{.Name}}' >/dev/null 2>&1; then
    docker compose ls --format '{{.Name}}' 2>/dev/null | grep -Fxq -- "$name"
    return $?
  fi
  return 1
}

# Only the chosen name on stdout (logs → stderr).
unique_suffixed_name() {
  local base="$1"
  local check_fn="$2"
  local name="$base"
  local n=1
  while "$check_fn" "$name"; do
    name="${base}${n}"
    n=$((n + 1))
    if [[ "$n" -gt 999 ]]; then
      printf '%s\n' "${base}$$"
      return 1
    fi
  done
  if [[ "$name" != "$base" ]]; then
    log "Name '$base' in use — using '$name'."
  fi
  printf '%s\n' "$name"
}

prompt() {
  local msg="$1"
  local def="${2:-}"
  local val=""
  if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
    printf '%s\n' "$def"
    return 0
  fi
  if [[ -n "$def" ]]; then
    read -rp "$msg [$def]: " val || true
  else
    read -rp "$msg: " val || true
  fi
  if [[ -z "$val" ]]; then printf '%s\n' "$def"; else printf '%s\n' "$val"; fi
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
  local port="$1" host="$2" public_url="$3" db_url="$4"
  local container_name="$5" image_name="$6" compose_project="$7"
  cat > "$ENV_FILE" <<EOF
# Go MMO parallel to Next on :3000 — Caddy via scripts/dev-proxy.sh only
GO_MMO_HOST=$host
GO_MMO_PORT=$port
GO_MMO_PUBLIC_URL=$public_url
GO_MMO_DATABASE_URL=$db_url
GO_MMO_DEV_AUTH=true
GO_MMO_SIM_TPS=20
GO_MMO_NET_TPS=10
GO_MMO_LOBBY_CAPACITY=50
GO_MMO_CORS_ORIGIN=*
GO_MMO_CONTAINER_NAME=$container_name
GO_MMO_IMAGE_NAME=$image_name
COMPOSE_PROJECT_NAME=$compose_project
AUTH_SECRET=\${AUTH_SECRET:-dev-secret-change-me}
EOF
  log "Wrote $ENV_FILE"
}

# Point the Next lobby client at this Go instance (safe upsert in root .env).
upsert_root_go_mmo_url() {
  local public_url="$1"
  local root_env="$ROOT/.env"
  local val="$public_url"
  # Prefer local upstream for same-machine Next; HTTPS subdomain still works via Caddy.
  if [[ "$public_url" == http://* || "$public_url" == https://* ]]; then
    val="$public_url"
  else
    val="http://127.0.0.1:${DEFAULT_PORT}"
  fi
  # When behind Caddy subdomain, browser must hit that origin for sockets (CORS + TLS).
  # When public_url is https://go… use that; otherwise 127.0.0.1:port for local.
  if [[ -f "$root_env" ]]; then
    if grep -q '^NEXT_PUBLIC_GO_MMO_URL=' "$root_env" 2>/dev/null; then
      if [[ "$NON_INTERACTIVE" -eq 1 ]] || yesno "Update root .env NEXT_PUBLIC_GO_MMO_URL to $val?" "y"; then
        # portable sed-free replace
        local tmp
        tmp="$(mktemp)"
        awk -v v="$val" 'BEGIN{done=0} /^NEXT_PUBLIC_GO_MMO_URL=/ { print "NEXT_PUBLIC_GO_MMO_URL=" v; done=1; next } { print } END { if (!done) print "NEXT_PUBLIC_GO_MMO_URL=" v }' "$root_env" > "$tmp"
        mv "$tmp" "$root_env"
        log "Set NEXT_PUBLIC_GO_MMO_URL=$val in $root_env (restart Next to pick up)."
      fi
    else
      if [[ "$NON_INTERACTIVE" -eq 1 ]] || yesno "Add NEXT_PUBLIC_GO_MMO_URL=$val to root .env so lobby/Studio use Go?" "y"; then
        printf '\n# Go MMO lobby socket\nNEXT_PUBLIC_GO_MMO_URL=%s\n' "$val" >> "$root_env"
        log "Appended NEXT_PUBLIC_GO_MMO_URL=$val to $root_env (restart Next to pick up)."
      fi
    fi
  else
    log "No root .env yet — set NEXT_PUBLIC_GO_MMO_URL=$val after Next setup."
  fi
}

ensure_env_example() {
  cat > "$ENV_EXAMPLE" <<EOF
GO_MMO_PORT=3001
GO_MMO_PUBLIC_URL=http://127.0.0.1:3001
GO_MMO_DATABASE_URL=file:../prisma/db/go-mmo-dev.db
GO_MMO_DEV_AUTH=true
GO_MMO_SIM_TPS=20
GO_MMO_NET_TPS=10
GO_MMO_LOBBY_CAPACITY=50
GO_MMO_CORS_ORIGIN=*
AUTH_SECRET=dev-secret-change-me
EOF
}

write_compose() {
  local port="$1" container_name="$2" image_name="$3"
  [[ -f "$COMPOSE_BASE" ]] || { warn "Missing $COMPOSE_BASE"; return 1; }
  sed \
    -e "s/container_name: saints-lobby/container_name: ${container_name}/" \
    -e "s/container_name: saints-gaming-go-mmo/container_name: ${container_name}/" \
    -e "s|image: saints-lobby|image: ${image_name}|" \
    -e "s|image: saints-gaming-go-mmo|image: ${image_name}|" \
    -e "s/\"3001:3001\"/\"${port}:3001\"/" \
    "$COMPOSE_BASE" > "$COMPOSE_FILE"
  log "Wrote $COMPOSE_FILE (container=$container_name host_port=$port)"
}

build_binary() {
  if ! command -v go >/dev/null 2>&1; then
    warn "Go toolchain not found — skip host build."
    return 1
  fi
  mkdir -p "$GO_MMO_DIR/bin"
  (cd "$GO_MMO_DIR" && go build -o bin/server ./cmd/server)
  log "Built $GO_MMO_DIR/bin/server"
}

start_docker() {
  local compose_project="$1"
  mkdir -p "$GO_MMO_DIR/data"
  (
    cd "$GO_MMO_DIR"
    export COMPOSE_PROJECT_NAME="$compose_project"
    if docker compose version >/dev/null 2>&1; then
      docker compose -f docker-compose.yml --env-file .env up -d --build
    else
      docker-compose -f docker-compose.yml --env-file .env up -d --build
    fi
  )
}

add_proxy_additive() {
  local subdomain="$1" host="$2" port="$3"
  if [[ ! -f "$DEV_PROXY" ]]; then
    warn "Missing $DEV_PROXY — falling back to proxy-caddy.sh"
    CADDYFILE="$CADDYFILE" "$PROXY_SCRIPT" add "$subdomain" "$host" "$port" || return 1
    CADDYFILE="$CADDYFILE" "$PROXY_SCRIPT" reload || true
    return 0
  fi
  chmod +x "$DEV_PROXY" 2>/dev/null || true
  # -y: already confirmed in this script; additive-only (never installs Caddy).
  CADDYFILE="$CADDYFILE" bash "$DEV_PROXY" add "$subdomain" "$host" "$port" -y
}

main() {
  log "Root: $ROOT"
  log "Go MMO parallel runtime — default port $DEFAULT_PORT (Next stays on 3000)."

  local caddy_mode
  caddy_mode="$(detect_caddy)"

  # --- Detect existing install; ASK before changing anything ---
  local existing=0
  local hints=""
  if [[ "$caddy_mode" != "none" ]]; then
    existing=1
    hints="${hints}• Caddy detected ($caddy_mode)\n"
  fi
  if caddy_running; then
    existing=1
    hints="${hints}• Caddy service RUNNING\n"
  fi
  if container_name_in_use "saints-gaming-web"; then
    existing=1
    hints="${hints}• Primary container saints-gaming-web exists\n"
  fi
  if container_name_in_use "$CONTAINER_BASE"; then
    existing=1
    hints="${hints}• Go MMO container name '$CONTAINER_BASE' already taken\n"
  fi
  if ss -tuln 2>/dev/null | grep -q ":${DEFAULT_PORT} "; then
    existing=1
    hints="${hints}• Port ${DEFAULT_PORT} already in use\n"
  fi

  local mode="full"
  if [[ "$PROXY_ONLY" -eq 1 ]]; then
    mode="proxy"
  elif [[ "$FORCE_FULL" -eq 1 ]]; then
    mode="full"
    log "Full setup requested (--full) — unique names + free port; primary Caddy untouched."
  elif [[ "$existing" -eq 1 ]]; then
    log "Existing install / conflict hints:"
    printf '%b' "$hints" >&2
    if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
      mode="proxy"
      log "Non-interactive: defaulting to subdomain-only attach (no primary changes)."
    else
      echo
      echo "1) Add subdomain only on existing Caddy (recommended — cannot conflict with primary)"
      echo "2) Full Go MMO setup beside it (unique names + free port)"
      echo "3) Abort"
      local choice
      read -rp "Choice [1]: " choice || true
      choice="${choice:-1}"
      case "$choice" in
        1) mode="proxy" ;;
        2) mode="full" ;;
        *) log "Aborted."; exit 0 ;;
      esac
    fi
  fi

  if [[ "$mode" == "proxy" && "$caddy_mode" == "none" ]]; then
    warn "No Caddy to attach to. Falling back to local bind only."
    mode="full"
  fi

  local port host subdomain public_url db_url add_proxy want_docker
  port="$(prompt "Go MMO listen port (Caddy upstream)" "$DEFAULT_PORT")"
  # If port busy, bump (cannot conflict with self).
  if command -v ss >/dev/null 2>&1; then
    while ss -tuln 2>/dev/null | grep -q ":${port} "; do
      log "Port $port busy — trying $((port + 1))"
      port=$((port + 1))
    done
  fi

  want_docker=0
  if [[ "$mode" == "full" ]]; then
    if [[ "$USE_DOCKER" == "1" ]]; then want_docker=1
    elif [[ "$USE_DOCKER" == "0" ]]; then want_docker=0
    elif docker_available; then
      if yesno "Docker detected — run Go MMO in a container?" "y"; then want_docker=1; fi
    fi
  fi

  local container_name="$CONTAINER_BASE"
  local image_name="$IMAGE_BASE"
  local compose_project="$COMPOSE_PROJECT_BASE"
  if [[ "$want_docker" -eq 1 ]]; then
    if ! docker_available; then
      warn "Docker not usable — host binary instead."
      want_docker=0
    else
      container_name="$(unique_suffixed_name "$CONTAINER_BASE" container_name_in_use)"
      local suffix="${container_name#"$CONTAINER_BASE"}"
      [[ -n "$suffix" ]] && image_name="${IMAGE_BASE}${suffix}"
      compose_project="$(unique_suffixed_name "$COMPOSE_PROJECT_BASE" compose_project_in_use)"
      if [[ "$compose_project" == "$COMPOSE_PROJECT_BASE" && -n "$suffix" ]]; then
        compose_project="${COMPOSE_PROJECT_BASE}${suffix}"
      fi
      log "Docker names: container=$container_name image=$image_name project=$compose_project"
    fi
  fi

  if [[ "$want_docker" -eq 1 ]]; then
    host="$(prompt "Host address Caddy should reach" "127.0.0.1")"
    db_url="file:/app/data/go-mmo.db"
  else
    host="$(prompt "Go MMO bind host" "$DEFAULT_HOST")"
    db_url="$(prompt "SQLite database URL" "file:$ROOT/prisma/db/go-mmo-dev.db")"
  fi

  subdomain=""
  public_url="http://${host}:${port}"
  add_proxy=0

  if [[ -n "${GO_MMO_SUBDOMAIN:-}" ]]; then
    subdomain="$GO_MMO_SUBDOMAIN"
    public_url="https://${subdomain}"
    add_proxy=1
  elif [[ "$caddy_mode" != "none" ]]; then
    local ask_default="y"
    [[ "$mode" == "proxy" ]] && ask_default="y"
    if yesno "Add/update Caddy subdomain for Go MMO on :${port}? (additive — primary untouched)" "$ask_default"; then
      add_proxy=1
      subdomain="$(prompt "Subdomain (e.g. go.saintsgaming.net)" "")"
      if [[ -z "$subdomain" ]]; then
        warn "No subdomain — skip Caddy."
        add_proxy=0
      else
        public_url="https://${subdomain}"
      fi
    fi
  fi

  if [[ "$mode" == "proxy" && "$add_proxy" -eq 0 ]]; then
    warn "Proxy-only mode with no subdomain — nothing to do."
    exit 0
  fi

  if [[ "$mode" != "proxy" ]]; then
    write_env "$port" "$host" "$public_url" "$db_url" "$container_name" "$image_name" "$compose_project"
    ensure_env_example
    if [[ "$want_docker" -eq 1 ]]; then
      write_compose "$port" "$container_name" "$image_name" || want_docker=0
    fi
  fi

  if [[ "$add_proxy" -eq 1 ]]; then
    log "Additive Caddy attach: $subdomain -> ${host}:${port}"
    add_proxy_additive "$subdomain" "$host" "$port" || warn "Proxy add failed."
  fi

  # Lobby client URL: HTTPS subdomain if proxied, else local upstream.
  local client_url="$public_url"
  if [[ "$client_url" != http* ]]; then
    client_url="http://127.0.0.1:${port}"
  fi
  upsert_root_go_mmo_url "$client_url"

  if [[ "$mode" == "proxy" ]]; then
    cat <<EOF

------------------------------------------------------------
 Go MMO subdomain attached (additive — primary untouched)
------------------------------------------------------------
  Upstream: ${host}:${port}
  Public:   ${public_url}
  Client:   NEXT_PUBLIC_GO_MMO_URL → ${client_url}
  Tool:     ${DEV_PROXY}

 Start Go MMO separately, then traffic hits the subdomain.
 Rerun safely: ./go-mmo/scripts/setup-go-mmo.sh --proxy-only
 Restart Next after .env change so the lobby picks up the Go URL.
------------------------------------------------------------
EOF
    exit 0
  fi

  if [[ "$want_docker" -eq 1 ]]; then
    if yesno "Build and start the Go MMO container now?" "y"; then
      start_docker "$compose_project" || warn "Docker start failed."
    fi
  else
    build_binary || true
  fi

  cat <<EOF

------------------------------------------------------------
 Go MMO ready (beside Next :3000 — no self-conflict)
------------------------------------------------------------
  Bind/upstream:  ${host}:${port}
  Public:         ${public_url}
  Env:            ${ENV_FILE}
  Container:      ${container_name}
  Compose proj:   ${compose_project}

 Proxy-only later: ./go-mmo/scripts/setup-go-mmo.sh --proxy-only
 Dev-proxy CLI:    ./scripts/dev-proxy.sh status | ask | add …
------------------------------------------------------------
EOF
}

main "$@"
