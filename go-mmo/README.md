# Go MMO backend (branch-only)

Parallel realtime MMO server rewritten in Go from the existing TypeScript
`server.ts` / `GameEngine` / `SocketHandler` ideas. Lives under `go-mmo/` on
branch `giogimic/go-mmo-backend-2d3d`. **Do not merge to `main` until explicitly approved.**

## Defaults

| | |
|---|---|
| Listen | `0.0.0.0:3100` (Next stays on `:3000`) |
| DB | SQLite (`GO_MMO_DATABASE_URL`, default `file:../prisma/db/dev.db` or setup creates `go-mmo-dev.db`) |
| Sim / net | 20 TPS / 10 TPS |
| Auth | Auth.js JWT cookie **or** `auth.token = "dev:<accountId>"` when `GO_MMO_DEV_AUTH=true` |

## Quick start

```bash
# Interactive: detect Caddy, ask subdomain, write .env, build binary
./go-mmo/scripts/setup-go-mmo.sh

# Non-interactive example
GO_MMO_SUBDOMAIN=go.saintsgaming.net GO_MMO_PORT=3100 \
  ./go-mmo/scripts/setup-go-mmo.sh --non-interactive

set -a; source go-mmo/.env; set +a
./go-mmo/bin/go-mmo
```

Caddy integration reuses `scripts/proxy-caddy.sh` markers
`# SAINTS_PROXY_LIST_BEGIN` / `# SAINTS_PROXY_LIST_END` so the primary site
block is never clobbered.

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
  internal/
    config/ auth/ db/ protocol/
    world/ player/ aoi/ creature/ engine/
    socket/ httpapi/ bootstrap/
    party/ combat/ …   (stubs for full parity)
  scripts/setup-go-mmo.sh
```

## Tests

```bash
cd go-mmo && go test ./...
go build -o bin/go-mmo ./cmd/server
```
