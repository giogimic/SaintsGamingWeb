# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-06 (Go MMO **on main** — lobby/Studio can target it)  
**Point every new session at this file first.**

---

## Current Focus

**Game / Studio / lobby only** — do not prioritize marketing site, forum, UCP, Discord, FiveM.

### Go MMO (on `main`)

`go-mmo/` realtime backend is **merged**. Next/TS `server.ts` remains the default socket when unset.

| Piece | How |
|------|-----|
| Run Go | `./go-mmo/scripts/setup-go-mmo.sh` then `./go-mmo/bin/go-mmo` (or Docker) |
| Caddy | `./scripts/dev-proxy.sh add <sub> 3001` (additive only) |
| Point lobby | Set `NEXT_PUBLIC_GO_MMO_URL=http://127.0.0.1:3001` (setup can write this) |
| Studio | **UI + `/api/maps` stay on Next.** Live walk/NPC/reload sync via Go when URL is set (`admin_save_map` after save). |
| Forum sockets | `RealtimeProvider` stays same-origin Next — do not point at Go |

Log: `logs/2026-08-06-go-mmo-client-wire.md`. Optional later (not blocking): deeper skill/TB formulas, inventory SQLite persistence, Studio UI rewrite in Go.

### Main / prod track

1. **Prod:** confirm custom `server.ts` in Docker (`npm start`) — maps + socket.io
2. After deploy: `/api/maps` has `DEMO_SANDBOX`, socket ≠ 404, two-account lobby peers
3. Optional: enable Go on a host with `NEXT_PUBLIC_GO_MMO_URL` + `dev-proxy`

| Priority | Issue | Status |
| :--- | :--- | :--- |
| **Go MMO** | Backend + client wire on main | **On main** — enable via env |
| **Prod deploy** | `next start` skipped Socket.io + DemoBootstrap | Fixed via entrypoint / `npm start` |
| **P0–P12 / MP / entities** | Studio + lobby fixes | **On main** |

Strip pause remains lifted. Editor foundation Phase 1–2f is on `main` — do not rebuild it.

Before coding, read:

1. **This file**
2. **`logs/2026-08-06-prod-custom-server-404.md`** if lobby is grass-only on a deployed host
3. **`logs/2026-08-05-studio-game-priority-plan.md`**
4. **`go-mmo/README.md`** when working on the Go socket path
