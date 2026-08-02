# Staging Smoke Checklist

Companion to PR merge readiness for forum / lobby / realtime.

## Automated (this repo)

```bash
npm test
npm run lint
npm run build
# with custom server running (npx tsx server.ts or production start):
PORT=3010 ./scripts/smoke-staging.sh
# or: BASE_URL=https://your-staging-host ./scripts/smoke-staging.sh
```

`scripts/smoke-staging.sh` checks:

| Path | Expected |
| :--- | :--- |
| `/api/game/server-status` | 200 + `{ status: "online" }` |
| `/home`, `/forum`, `/lobby`, `/login`, `/servers` | 200 |
| `/api/realtime/sync` | 401 when unauthenticated |
| `/socket.io/?EIO=4&transport=polling` | 200 |

## Manual (after deploy)

1. Forum: open a board, create/reply if credentials available
2. Lobby: `/lobby` loads title screen; socket connects (Network → WS)
3. Realtime: logged-in notification bell / messenger without hard refresh after a tip/like (if seeded users exist)
4. Admin realtime dashboard (`/admin/realtime`) as Developer — metrics page loads

## Build notes (v2.1.111)

- Social actions barrel must **not** use `"use server"` (re-exports only); domain modules keep `"use server"`.
- Client UI imports achievement defs from `achievements-catalog.ts` so Redis/custom server stay out of the browser bundle.
