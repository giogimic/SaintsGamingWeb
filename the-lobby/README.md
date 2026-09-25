# The Lobby Go MMO Backend (on `main`)

Parallel realtime MMO server in Go. Lives under `the-lobby/`. Next.js + Studio UI
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
| Listen | `0.0.0.0:24011` |
| Client | `NEXT_PUBLIC_GO_MMO_URL` (required) |
| Caddy | `./scripts/dev-proxy.sh` (additive) |
| Auth | `auth.token` = account id when `GO_MMO_DEV_AUTH=true` |

## Quick start

```bash
# Run the main setup to install and configure everything including Go MMO
./saints.sh setup

# Or to update a running instance to ensure Go MMO is active
./saints.sh update --full

# Add a Caddy subdomain manually if you skipped it during setup
./saints.sh proxy add go.saintsgaming.net 127.0.0.1 24011
```

Unset `NEXT_PUBLIC_GO_MMO_URL` and set `ENABLE_TS_GAME_ENGINE=1` to fall back to the emergency TypeScript `server.ts` sockets.
