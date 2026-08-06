# 2026-08-06 — Go MMO backend (branch-only)

**Branch:** `giogimic/go-mmo-backend-2d3d`  
**Do not merge to `main` until explicitly approved.**

## Goal

Remake the heavy realtime MMO backend in Go using existing TypeScript
ideas/contracts (Socket.IO events, DEMO_SANDBOX shards, Auth.js JWT), as a
**parallel test environment** on alternate ports with Caddy subdomain wiring.

## Done this pass

- Scaffold `go-mmo/` module (`github.com/giogimic/SaintsGamingWeb/go-mmo`)
- Config default `:3100`, SQLite via `modernc.org/sqlite`
- World shards (`DEMO_SANDBOX_chN`, private, PIE), walkability, demo map seed
- Player seats, input queue, move cooldown, occupancy, AOI room helpers
- Engine sim 20 Hz / net 10 Hz with `move_ack` / `position_correction` / `player_moved`
- Socket.IO hub (`zishang520/socket.io`) — join_map, input, chat, party stubs, NPC dialogue toast
- REST `/healthz`, `/api/maps`, `/api/maps/:id` with lazy DEMO ensure
- Auth.js JWT parse + `GO_MMO_DEV_AUTH` token bypass
- `scripts/setup-go-mmo.sh` — detect Caddy, prompt subdomain, call `scripts/proxy-caddy.sh`
- Tests green: `go test ./...` · binary builds

## Run

```bash
./go-mmo/scripts/setup-go-mmo.sh
set -a; source go-mmo/.env; set +a
./go-mmo/bin/go-mmo
```

## Next continues (parity backlog)

1. Full combat / encounter / TB battle parity with TS managers
2. Inventory, shop buy/sell, craft, GTC listings
3. Quest + dialogue trees (Saints Trail)
4. Studio admin_save_map / reload + NPC spawn over sockets
5. Point lobby client optionally at Go socket URL for A/B
6. Studio editor surface in Go (optional later)

## Smoke checked

- `GET /healthz` → ok
- `GET /api/maps` → DEMO_SANDBOX
- Engine.IO polling handshake on `/socket.io/`

## Pass 2 — gameplay managers

- Wired combat (RT hit/flee), inventory buy/sell, shop catalog, grass encounter rolls
- Tests: combat + inventory
- Socket events: combat_action, encounter_check, shop_buy/sell, claim_starter loot
