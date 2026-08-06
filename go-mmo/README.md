# Go MMO backend (branch-only)

Parallel realtime MMO server rewritten in Go from the existing TypeScript
`server.ts` / `GameEngine` / `SocketHandler` ideas. Lives under `go-mmo/`.
**Do not merge to `main` until explicitly approved** (unless you are promoting it).

## Defaults

| | |
|---|---|
| Listen | `0.0.0.0:3001` (Next stays on `:3000`) |
| Caddy | **Additive only** via `./scripts/dev-proxy.sh` (primary site untouched) |
| Docker | `saints-gaming-go-mmo` (+ `1`/`2`/`3`… if name already in use) |
| DB | SQLite (`GO_MMO_DATABASE_URL`) |
| Auth | Auth.js JWT **or** `auth.token = "dev:<accountId>"` when `GO_MMO_DEV_AUTH=true` |

## Quick start

```bash
# Detect existing install → ask → subdomain-only or full parallel setup
./go-mmo/scripts/setup-go-mmo.sh

# Only register a subdomain on the already-running primary Caddy
GO_MMO_SUBDOMAIN=go.example.com ./go-mmo/scripts/setup-go-mmo.sh --proxy-only --non-interactive

# Host CLI (safe reruns — never rewrites primary Caddy site)
./scripts/dev-proxy.sh status
./scripts/dev-proxy.sh add go.example.com 3001
./scripts/dev-proxy.sh ask
```

Caddy integration uses managed markers via `scripts/proxy-caddy.sh` /
`scripts/dev-proxy.sh` so the primary site block is never clobbered.

## Layout

```
go-mmo/
  cmd/server/
  Dockerfile
  docker-compose.base.yml
  scripts/setup-go-mmo.sh
  internal/…
```

## Tests

```bash
cd go-mmo && go test ./...
go build -o bin/go-mmo ./cmd/server
```
