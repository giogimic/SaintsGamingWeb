# Go MMO backend (on `main`)

Parallel realtime MMO server in Go. Lives under `go-mmo/`. Next.js + Studio UI
remain TypeScript; set `NEXT_PUBLIC_GO_MMO_URL` to point the lobby game socket here.

## Will Studio still work?

**Yes.** Studio editor chrome and map **save/load** use Next `/api/maps` (Prisma).
After save, Next also calls Go `POST /api/internal/sync-map` (Bearer `AUTH_SECRET`)
so live shards reload without relying only on the client. When Go is enabled,
Next skips the TS `GameEngine` tick unless `ENABLE_TS_GAME_ENGINE=1`.
Forum `RealtimeProvider` stays on Next.

Inventory / quests / last seat persist in Go SQLite (`GoInventory`, `GoQuestProgress`, `GoPlayerState`).

## Defaults

| | |
|---|---|
| Listen | `0.0.0.0:3001` |
| Client | `NEXT_PUBLIC_GO_MMO_URL` (optional) |
| Caddy | `./scripts/dev-proxy.sh` (additive) |
| Auth | `auth.token` = account id when `GO_MMO_DEV_AUTH=true` |

## Quick start

```bash
# During main install (recommended): say YES to Go MMO in ./scripts/setup.sh

# Standalone full setup (env + docker + optional Caddy subdomain)
./go-mmo/scripts/setup-go-mmo.sh --full

# Subdomain only on existing Caddy
./go-mmo/scripts/setup-go-mmo.sh --proxy-only
```

Unset `NEXT_PUBLIC_GO_MMO_URL` to fall back to TypeScript `server.ts` sockets.
