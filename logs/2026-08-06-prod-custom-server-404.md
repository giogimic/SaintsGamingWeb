# Production grass-only lobby — custom server not running (2026-08-06)

## Symptom (saintsgaming.net)

Console on `/lobby`:

- `GET /api/maps/DEMO_SANDBOX` → **404** (`Error loading map DEMO_SANDBOX`)
- `GET /socket.io?EIO=4&transport=polling` → **404**
- Avatar/NPC/peers missing; client falls back to empty grass map
- Browser-extension noise (`contentscript.js` MaxListeners / ObjectMultiplex) is unrelated

Live probe before fix:

```text
GET /api/maps/DEMO_SANDBOX → 404 {"error":"Map not found"}
GET /api/maps → 200 {"maps":[],"count":0}
```

## Root cause

Docker/`entrypoint.sh` ran **`npm run start` → `next start`**, which:

1. Does **not** attach Socket.io → `/socket.io` 404
2. Does **not** run `bootstrapDemoContent()` → empty WorldMap/GameMap tables
3. Background `node game-server.js` referenced a **removed** legacy process

Local cloud/`npm run dev` was fine (runs `server.ts`). Client MP/entity PRs (#38–#40) could not help production while those APIs were dead.

## Fix

| File | Change |
| :--- | :--- |
| `package.json` | `"start": "npx tsx server.ts"`; `start:next` kept for plain Next; `tsx` moved to `dependencies` |
| `entrypoint.sh` | Drop legacy game-server; `exec npm run start` (custom server) |
| `server.ts` | Bind `HOSTNAME` / `0.0.0.0` in production |
| `docker-compose.base.yml` | Remove obsolete `game-server` service; longer health `start_period` |
| `ecosystem.config.js` | Single fork app = `tsx server.ts` |
| `scripts/update.sh` | Stop resurrecting `:3001` / `game-server.js` |
| `AGENTS.md` | Document prod start = custom server |

## After deploy checklist

```bash
curl -sS https://saintsgaming.net/api/maps | head
# expect DEMO_SANDBOX in list, count > 0

curl -sS -o /dev/null -w '%{http_code}\n' \
  'https://saintsgaming.net/socket.io/?EIO=4&transport=polling'
# expect 200 (Engine.IO handshake), not 404

# Proxy must forward /socket.io (WebSocket upgrade) to the same :3000 process
```

Then hard-refresh `/lobby`: grass + avatar + DEMO NPCs; two accounts → peers.

## Related

- `logs/2026-08-06-lobby-entities-visible.md` — client entity visibility (local OK)
- `AGENTS.md` — process model
