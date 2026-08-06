# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-06 (setup offers Go MMO for lobby/Studio)  
**Point every new session at this file first.**

---

## Current Focus

**Game / Studio / lobby only** — do not prioritize marketing site, forum, UCP, Discord, FiveM.

### Go MMO (on `main` — setup option)

`go-mmo/` realtime backend is **merged**. **`./scripts/setup.sh` asks to enable it** (recommended) — destination for lobby/Studio game sockets. Next/TS `server.ts` remains the default when you say No / leave `NEXT_PUBLIC_GO_MMO_URL` unset.

| Piece | How |
|------|-----|
| Setup | `./scripts/setup.sh` → **Go MMO Backend** yes/no (then optional `go.` subdomain) |
| Standalone | `./go-mmo/scripts/setup-go-mmo.sh --full` |
| Caddy only | `./scripts/dev-proxy.sh add <sub> 3001` |
| Point lobby | `NEXT_PUBLIC_GO_MMO_URL` (setup writes this when enabled) |
| Studio | **UI + `/api/maps` stay on Next.** Live walk/NPC/reload sync via Go when URL is set (`admin_save_map` after save). |
| Forum sockets | `RealtimeProvider` stays same-origin Next — do not point at Go |

Log: `logs/2026-08-06-setup-go-mmo-option.md`. Optional later: deeper skill/TB formulas, inventory SQLite persistence, Studio UI rewrite in Go.

### Main / prod track

1. **Prod:** custom `server.ts` via Docker/`npm start` — sockets + DemoBootstrap
2. **Maps:** empty WorldMap heals via `ensureStudioMapFoundation` on `/api/maps` (lazy DEMO_SANDBOX)
3. After deploy: `/api/maps` lists `DEMO_SANDBOX`, socket ≠ 404, two-account lobby peers
4. Optional: enable Go with `NEXT_PUBLIC_GO_MMO_URL` + `./scripts/dev-proxy.sh`

| Priority | Issue | Status |
| :--- | :--- | :--- |
| **Go MMO** | Backend + client wire | **On main** — enable via env |
| **Prod maps** | Empty WorldMap after deploy | **On main** — API lazy ensure |
| **Prod deploy** | `next start` skipped Socket.io + DemoBootstrap | Fixed via entrypoint / `npm start` |
| **P0–P12 / MP / entities** | Studio + lobby fixes | **On main** |
| **Caddy / branches** | Additive proxy + cleanup | **On main** — see `logs/2026-08-06-caddy-setup-fail-and-branches.md` |

Strip pause remains lifted. Editor foundation Phase 1–2f is on `main` — do not rebuild it.

Before coding, read:

1. **This file**
2. **`logs/2026-08-06-prod-empty-maps-lazy-ensure.md`** if Studio/lobby map 404 on a deployed host
3. **`logs/2026-08-06-prod-custom-server-404.md`** if lobby is grass-only / socket 404
4. **`logs/2026-08-05-studio-game-priority-plan.md`**
5. **`go-mmo/README.md`** when working on the Go socket path

**Do not** reintroduce deleted ghosts (Pixi battle, Phase-5 ClassEditor/GameConfigManager, CreatureDb, dual TB overlays).
