#!/usr/bin/env bash
# Setup Go MMO as a parallel development server on :3001.
# Detects an existing Caddy install, prompts for a subdomain, and adds a
# reverse_proxy block via scripts/proxy-caddy.sh markers (does not clobber
# the primary site). Allocates unique Docker container names (base, then
# base1 / base2 / …) when names are already in use.
# Never merges to main — this lives on the go-mmo branch.
#
# Usage:
#   ./go-mmo/scripts/setup-go-mmo.sh
#   GO_MMO_SUBDOMAIN=go.example.com GO_MMO_PORT=3001 ./go-mmo/scripts/setup-go-mmo.sh --non-interactive
#
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GO_MMO_DIR="$ROOT/go-mmo"
PROXY_SCRIPT="$ROOT/scripts/proxy-caddy.sh"
CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"
ENV_FILE="$GO_MMO_DIR/.env"
ENV_EXAMPLE="$GO_MMO_DIR/.env.example"
COMPOSE_BASE="$GO_MMO_DIR/docker-compose.base.yml"
COMPOSE_FILE="$GO_MMO_DIR/docker-compose.yml"

# When an existing Caddy install is present, default upstream is :3001
# (Next primary stays on :3000). Override with GO_MMO_PORT.
DEFAULT_PORT="${GO_MMO_PORT:-3001}"
DEFAULT_HOST="${GO_MMO_HOST:-127.0.0.1}"
CONTAINER_BASE="${GO_MMO_CONTAINER_NAME:-saints-gaming-go-mmo}"
IMAGE_BASE="${GO_MMO_IMAGE_NAME:-saints-gaming-go-mmo}"
COMPOSE_PROJECT_BASE="${GO_MMO_COMPOSE_PROJECT:-saints-go-mmo}"
NON_INTERACTIVE=0
USE_DOCKER="${GO_MMO_USE_DOCKER:-auto}"

for arg in "$@"; do
  case "$arg" in
    --non-interactive|-y) NON_INTERACTIVE=1 ;;
    --docker) USE_DOCKER=1 ;;
    --no-docker) USE_DOCKER=0 ;;
    --help|-h)
      sed -n '1,20p' "$0"
      exit 0
      ;;
  esac
done

log() { printf '[setup-go-mmo] %s\n' "$*" >&2; }
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

docker_available() {
  command -v docker >/dev/null 2>&1 || return 1
  docker info >/dev/null 2>&1 || return 1
  return 0
}

# True if a Docker container with this exact name already exists (running or stopped).
container_name_in_use() {
  local name="$1"
  if ! command -v docker >/dev/null 2>&1; then
    return 1
  fi
  docker ps -a --format '{{.Names}}' 2>/dev/null | grep -Fxq -- "$name"
}

# True if a compose project name is already listed by `docker compose ls`.
compose_project_in_use() {
  local name="$1"
  if ! command -v docker >/dev/null 2>&1; then
    return 1
  fi
  if docker compose ls --format '{{.Name}}' >/dev/null 2>&1; then
    docker compose ls --format '{{.Name}}' 2>/dev/null | grep -Fxq -- "$name"
    return $?
  fi
  return 1
}

# Allocate base, then base1, base2, … until free.
# Only the chosen name is printed on stdout (callers capture it); logs go to stderr.
unique_suffixed_name() {
  local base="$1"
  local check_fn="$2"
  local name="$base"
  local n=1
  while "$check_fn" "$name"; do
    name="${base}${n}"
    n=$((n + 1))
    if [[ "$n" -gt 999 ]]; then
      warn "Could not allocate unique name from base '$base' after 999 tries."
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
  local container_name="$5"
  local image_name="$6"
  local compose_project="$7"
  cat > "$ENV_FILE" <<EOF
# Go MMO development server (parallel to Next on :3000)
# Default with existing Caddy: host :3001 → reverse_proxy subdomain
GO_MMO_HOST=$host
GO_MMO_PORT=$port
GO_MMO_PUBLIC_URL=$public_url
GO_MMO_DATABASE_URL=$db_url
GO_MMO_DEV_AUTH=true
GO_MMO_SIM_TPS=20
GO_MMO_NET_TPS=10
GO_MMO_LOBBY_CAPACITY=50
GO_MMO_CORS_ORIGIN=*
# Docker (set by setup when using compose)
GO_MMO_CONTAINER_NAME=$container_name
GO_MMO_IMAGE_NAME=$image_name
COMPOSE_PROJECT_NAME=$compose_project
# Share Auth.js secret with the Next app when ready for cookie auth
AUTH_SECRET=\${AUTH_SECRET:-dev-secret-change-me}
EOF
  log "Wrote $ENV_FILE"
}

ensure_env_example() {
  cat > "$ENV_EXAMPLE" <<EOF
# GO_MMO_HOST=0.0.0.0
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
  log "Wrote $ENV_EXAMPLE"
}

write_compose() {
  local port="$1"
  local container_name="$2"
  local image_name="$3"
  if [[ ! -f "$COMPOSE_BASE" ]]; then
    warn "Missing $COMPOSE_BASE — skip docker-compose.yml generation."
    return 1
  fi
  # Substitute published port + unique names into the generated compose file.
  sed \
    -e "s/container_name: saints-gaming-go-mmo/container_name: ${container_name}/" \
    -e "s|image: saints-gaming-go-mmo|image: ${image_name}|" \
    -e "s/\"3001:3001\"/\"${port}:3001\"/" \
    -e "s/GO_MMO_PORT=3001/GO_MMO_PORT=3001/" \
    "$COMPOSE_BASE" > "$COMPOSE_FILE"
  log "Wrote $COMPOSE_FILE (container=$container_name image=$image_name host_port=$port)"
}

build_binary() {
  if ! command -v go >/dev/null 2>&1; then
    warn "Go toolchain not found — skip host build. Use Docker or install Go 1.22+."
    return 1
  fi
  mkdir -p "$GO_MMO_DIR/bin"
  (cd "$GO_MMO_DIR" && go build -o bin/go-mmo ./cmd/server)
  log "Built $GO_MMO_DIR/bin/go-mmo"
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

main() {
  log "Root: $ROOT"
  log "Go MMO parallel runtime — default listen port $DEFAULT_PORT (Next stays on 3000)."

  local caddy_mode
  caddy_mode="$(detect_caddy)"
  case "$caddy_mode" in
    none)
      warn "No Caddy detected (no caddy binary, caddy.service, or $CADDYFILE)."
      warn "Continuing with local-only bind. Install/configure Caddy later and re-run this script."
      ;;
    *)
      log "Existing Caddy detected via: $caddy_mode (Caddyfile=$CADDYFILE)"
      log "Will wire reverse_proxy to host port $DEFAULT_PORT without replacing the primary site."
      ;;
  esac

  local want_docker=0
  if [[ "$USE_DOCKER" == "1" ]]; then
    want_docker=1
  elif [[ "$USE_DOCKER" == "0" ]]; then
    want_docker=0
  elif docker_available; then
    if yesno "Docker detected — run Go MMO in a container (recommended alongside existing Caddy)?" "y"; then
      want_docker=1
    fi
  else
    log "Docker not available — will build/run the host binary."
  fi

  local container_name="$CONTAINER_BASE"
  local image_name="$IMAGE_BASE"
  local compose_project="$COMPOSE_PROJECT_BASE"
  if [[ "$want_docker" -eq 1 ]]; then
    if ! docker_available; then
      warn "Docker requested but not usable — falling back to host binary."
      want_docker=0
    else
      # If saints-gaming-go-mmo is taken, use saints-gaming-go-mmo1, then 2, 3…
      container_name="$(unique_suffixed_name "$CONTAINER_BASE" container_name_in_use)"
      local suffix="${container_name#"$CONTAINER_BASE"}"
      if [[ -n "$suffix" ]]; then
        image_name="${IMAGE_BASE}${suffix}"
      fi
      compose_project="$(unique_suffixed_name "$COMPOSE_PROJECT_BASE" compose_project_in_use)"
      # Keep compose project suffix aligned with container when compose ls is empty/unavailable.
      if [[ "$compose_project" == "$COMPOSE_PROJECT_BASE" && -n "$suffix" ]]; then
        compose_project="${COMPOSE_PROJECT_BASE}${suffix}"
      fi
      log "Docker names: container=$container_name image=$image_name project=$compose_project"
    fi
  fi

  local port host subdomain public_url db_url add_proxy
  port="$(prompt "Go MMO listen port (Caddy upstream)" "$DEFAULT_PORT")"
  if [[ "$want_docker" -eq 1 ]]; then
    # Container listens on 3001 internally; host bind is for Caddy → published port.
    host="$(prompt "Host address Caddy should reach (published port)" "127.0.0.1")"
    db_url="file:/app/data/go-mmo.db"
  else
    host="$(prompt "Go MMO bind host" "$DEFAULT_HOST")"
    db_url="$(prompt "SQLite database URL" "file:$ROOT/prisma/db/go-mmo-dev.db")"
  fi

  subdomain=""
  public_url="http://${host}:${port}"
  add_proxy=0

  # Prefer explicit subdomain from env (esp. non-interactive / CI).
  if [[ -n "${GO_MMO_SUBDOMAIN:-}" ]]; then
    subdomain="$GO_MMO_SUBDOMAIN"
    public_url="https://${subdomain}"
    add_proxy=1
  elif [[ "$caddy_mode" != "none" ]]; then
    if yesno "Add/update a Caddy reverse_proxy subdomain for this Go MMO instance on :${port}?" "y"; then
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
        if [[ ! -f "$CADDYFILE" ]]; then
          mkdir -p "$(dirname "$CADDYFILE")" 2>/dev/null || true
          printf '%s\n' "# Saints Gaming — managed proxies" "# SAINTS_PROXY_LIST_BEGIN" "# SAINTS_PROXY_LIST_END" > "$CADDYFILE" 2>/dev/null \
            || warn "Could not create $CADDYFILE (need permissions)."
        fi
      fi
    fi
  fi

  write_env "$port" "$host" "$public_url" "$db_url" "$container_name" "$image_name" "$compose_project"
  ensure_env_example

  if [[ "$want_docker" -eq 1 ]]; then
    write_compose "$port" "$container_name" "$image_name" || want_docker=0
  fi

  if [[ "$add_proxy" -eq 1 ]]; then
    if [[ ! -x "$PROXY_SCRIPT" && -f "$PROXY_SCRIPT" ]]; then
      chmod +x "$PROXY_SCRIPT" || true
    fi
    if [[ ! -f "$PROXY_SCRIPT" ]]; then
      warn "Missing $PROXY_SCRIPT — cannot patch Caddyfile automatically."
    else
      log "Adding Caddy proxy onto existing install: $subdomain -> ${host}:${port}"
      if CADDYFILE="$CADDYFILE" "$PROXY_SCRIPT" add "$subdomain" "$host" "$port"; then
        if yesno "Reload Caddy now?" "y"; then
          if command -v caddy >/dev/null 2>&1 || (command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet caddy 2>/dev/null); then
            CADDYFILE="$CADDYFILE" "$PROXY_SCRIPT" reload || warn "Caddy reload failed — reload manually."
          else
            warn "Caddy not running in this environment — proxy block written; reload on the host later."
          fi
        fi
        log "Caddy block managed between # SAINTS_PROXY_LIST_BEGIN/END markers (primary site untouched)."
      else
        warn "proxy-caddy add failed. You can run manually:"
        warn "  $PROXY_SCRIPT add $subdomain $host $port && $PROXY_SCRIPT reload"
      fi
    fi
  fi

  if [[ "$want_docker" -eq 1 ]]; then
    if yesno "Build and start the Go MMO container now?" "y"; then
      if start_docker "$compose_project"; then
        log "Container '$container_name' is up on host port $port."
      else
        warn "Docker start failed — you can retry: cd go-mmo && COMPOSE_PROJECT_NAME=$compose_project docker compose up -d --build"
      fi
    else
      log "Skipped start. Later: cd go-mmo && COMPOSE_PROJECT_NAME=$compose_project docker compose up -d --build"
    fi
  else
    build_binary || true
  fi

  cat <<EOF

------------------------------------------------------------
 Go MMO test environment ready (separate from Next :3000)
------------------------------------------------------------
  Bind/upstream:  ${host}:${port}
  Public:         ${public_url}
  Env:            ${ENV_FILE}
  Health:         curl ${public_url%/}/healthz
  Maps:           curl ${public_url%/}/api/maps
  Sockets:        ${public_url%/}/socket.io/
EOF

  if [[ "$want_docker" -eq 1 ]]; then
    cat <<EOF
  Container:      ${container_name}
  Image:          ${image_name}
  Compose proj:   ${compose_project}
  Compose file:   ${COMPOSE_FILE}

 Start / stop:
   cd ${GO_MMO_DIR} && COMPOSE_PROJECT_NAME=${compose_project} docker compose up -d --build
   cd ${GO_MMO_DIR} && COMPOSE_PROJECT_NAME=${compose_project} docker compose down
EOF
  else
    cat <<EOF

 Start (host binary):
   set -a; source ${ENV_FILE}; set +a
   ${GO_MMO_DIR}/bin/go-mmo
   # or: cd ${GO_MMO_DIR} && go run ./cmd/server
EOF
  fi

  cat <<EOF

 Dev auth: connect with socket.io auth: { token: "dev:<accountId>" }
 This branch must NOT merge to main until you decide.
------------------------------------------------------------
EOF
}

main "$@"
