# 2026-08-06 — Go MMO backend

**Status:** **On `main`** (via go-mmo PRs through #48).

## Goal

Remake the heavy realtime MMO backend in Go using existing TypeScript
ideas/contracts (Socket.IO events, DEMO_SANDBOX shards, Auth.js JWT), as a
**parallel test environment** on alternate ports with Caddy subdomain wiring.

## Status: BACKEND CONVERSION COMPLETE (parity pass)

All `SocketHandler.ts` client events are implemented on the Go hub. Heavy
sim/net path runs in Go on `:3001` (existing Caddy → subdomain). Studio map save/reload/NPC spawn work
over sockets + REST. Full Studio UI rewrite in Go remains **optional / later**.

### Socket event parity (TS → Go)

join_map, input, combat_action, combat_cast, encounter_check,
battle_submit_action, admin_save_map, admin_reload_map, studio_spawn_npc,
studio_despawn_npc, npc_interact, dialogue_select, gather_interact,
gtc_create_listing, gtc_purchase_listing, pickup_loot, party_*, global_chat,
chat_message, staff_announce, staff_kick, craft_item, shop_*, claim_starter,
force_disconnect.

### Systems

| Area | Package |
|------|---------|
| Shards / walk / studio NPCs / loot | `internal/world` |
| Players / AOI / input | `internal/player`, `aoi` |
| Engine 20/10 Hz | `internal/engine` |
| RT + TB combat | `internal/combat` |
| Encounters | `internal/encounter` |
| Dialogue + Saints Trail quests | `internal/dialogue`, `quest` |
| Inventory / shop / craft / GTC | `inventory`, `shop`, `craft`, `economy` |
| Skills XP | `internal/skill` |
| HTTP maps CRUD + health | `internal/httpapi` |
| Auth.js JWT + dev token | `internal/auth` |
| Caddy setup | `scripts/setup-go-mmo.sh` |

## Run

```bash
./go-mmo/scripts/setup-go-mmo.sh
set -a; source go-mmo/.env; set +a
./go-mmo/bin/go-mmo
```

## Optional later (not blocking “backend conversion”)

1. Point lobby/studio client `NEXT_PUBLIC_GO_MMO_URL` at Go socket for A/B
2. Studio editor UI rewritten in Go (user said maybe)
3. Deeper 27-skill / TB formula parity with bible numbers
4. Persist inventory/quests to SQLite (currently hot memory + maps in DB)

## Smoke

- `GET /healthz` → ok
- `GET /api/maps` → DEMO_SANDBOX
- `PUT /api/maps/DEMO_SANDBOX` → persist
- Engine.IO polling `/socket.io/` → 200
- `go test ./...` green
