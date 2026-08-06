# 2026-08-06 — Hybrid scale on main (Go realtime + Next platform)

## Verdict

Go owns lobby/Studio **realtime**; Next owns site, Auth, forum RealtimeProvider,
Studio UI, and map **authoring** (`/api/maps`). Not a full Go rewrite.

## Delivered on `main`

| Phase | Change |
|-------|--------|
| 0 | Setup already offers Go; docs treat Go as destination path |
| 1 | SQLite persist: inventory, credits, quests, player seat (`GoPlayerState` / `GoInventory` / `GoQuestProgress`) |
| 1 | Socket event contract test (`protocol_contract_test.go`) |
| 2 | Next `POST /api/maps` → `notifyGoMapSynced` → Go `POST /api/internal/sync-map` + `map_reloaded` |
| 2 | `ensureStudioMapFoundation` single-flight (stampede-proof) |
| 3 | `server.ts` gates TS GameEngine when Go URL set (`ENABLE_TS_GAME_ENGINE=1` to force TS) |
| 4 | Client `admin_save_map` remains as backup; server sync is primary |

## Ops

```bash
# .env
NEXT_PUBLIC_GO_MMO_URL=https://go.yourdomain
GO_MMO_INTERNAL_URL=http://host.docker.internal:3001   # Next-in-Docker → Go on host
# AUTH_SECRET shared with Go for sync-map Bearer

./go-mmo/scripts/setup-go-mmo.sh --full
./scripts/update.sh   # or npm run dev
```

## Not in this slice (later)

- Full TB/skill formula bible parity
- Full dialogue tree DB load from Prisma
- Babylon remesh / map delta payloads (client IO phase)
