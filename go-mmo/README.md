# Go MMO backend (branch-only)

Parallel realtime MMO server rewritten in Go from the existing TypeScript
`server.ts` / `GameEngine` / `SocketHandler` ideas. Lives under `go-mmo/` on
the go-mmo feature branch. **Do not merge to `main` until explicitly approved.**

## Defaults

| | |
|---|---|
| Listen | `0.0.0.0:3001` (Next stays on `:3000`) |
| Caddy | Existing install detected; subdomain → `127.0.0.1:3001` |
| Docker | `saints-gaming-go-mmo` (+ `1`/`2`/`3`… if name already in use) |
| DB | SQLite (`GO_MMO_DATABASE_URL`) |
| Sim / net | 20 TPS / 10 TPS |
| Auth | Auth.js JWT cookie **or** `auth.token = "dev:<accountId>"` when `GO_MMO_DEV_AUTH=true` |

## Quick start

```bash
# Interactive: detect existing Caddy, ask subdomain, allocate free
# container name (base → base1 → base2…), write .env, optional docker up
./go-mmo/scripts/setup-go-mmo.sh

# Non-interactive example (port 3001 + existing Caddy)
GO_MMO_SUBDOMAIN=go.saintsgaming.net GO_MMO_PORT=3001 \
  ./go-mmo/scripts/setup-go-mmo.sh --non-interactive --docker

# Host binary (no Docker)
./go-mmo/scripts/setup-go-mmo.sh --no-docker
set -a; source go-mmo/.env; set +a
./go-mmo/bin/go-mmo
```

Caddy integration reuses `scripts/proxy-caddy.sh` markers
`# SAINTS_PROXY_LIST_BEGIN` / `# SAINTS_PROXY_LIST_END` so the primary site
block is never clobbered.

Container names: if `saints-gaming-go-mmo` exists, setup picks
`saints-gaming-go-mmo1`, then `2`, `3`, etc. Same for compose project.

## Wire protocol (client-compatible)

Client → server: `join_map`, `input`, party/chat/shop/NPC events (see `internal/protocol`).

Server → client: `map_joined` → `map_players` → `player_joined`; movement via
`move_ack` / `position_correction` / AOI `player_moved`.

Lobby joins force base `DEMO_SANDBOX` and public shards `DEMO_SANDBOX_chN`.
Studio private / PIE: `{base}_{accountId}` / `studio_pie_{accountId}`.

## Layout

```
go-mmo/
  cmd/server/          HTTP + Socket.IO entry
  Dockerfile           container image (EXPOSE 3001)
  docker-compose.base.yml
  scripts/setup-go-mmo.sh
  internal/…
```

## Tests

```bash
cd go-mmo && go test ./...
go build -o bin/go-mmo ./cmd/server
```
