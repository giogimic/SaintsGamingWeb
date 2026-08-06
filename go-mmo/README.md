# Go MMO backend (on `main`)

Parallel realtime MMO server in Go. Lives under `go-mmo/`. Next.js + Studio UI
remain TypeScript; set `NEXT_PUBLIC_GO_MMO_URL` to point the lobby game socket here.

## Will Studio still work?

**Yes.** Studio editor chrome and map **save/load** use Next `/api/maps` (Prisma).
When Go is enabled, save also emits `admin_save_map` so the Go live world matches
paint/collision. NPC live spawn/despawn sockets go to Go. Forum `RealtimeProvider`
stays on Next.

## Defaults

| | |
|---|---|
| Listen | `0.0.0.0:3001` |
| Client | `NEXT_PUBLIC_GO_MMO_URL` (optional) |
| Caddy | `./scripts/dev-proxy.sh` (additive) |
| Auth | `auth.token` = account id when `GO_MMO_DEV_AUTH=true` |

## Quick start

```bash
./go-mmo/scripts/setup-go-mmo.sh
# restart Next so NEXT_PUBLIC_GO_MMO_URL is picked up
./go-mmo/bin/go-mmo
```

Unset `NEXT_PUBLIC_GO_MMO_URL` to fall back to TypeScript `server.ts` sockets.
