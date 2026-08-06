# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-06 (hybrid scale on main — Go realtime + Next platform)  
**Point every new session at this file first.**

---

## Current Focus

**Game / Studio / lobby only** — do not prioritize marketing site, forum, UCP, Discord, FiveM.

### Hybrid architecture (locked)

| Next | Go (`:3001`) |
|------|----------------|
| Site, Auth.js, forum RealtimeProvider | Lobby/Studio **game sockets** |
| Studio UI + `/api/maps` Prisma writer | Sim/AOI/shards/combat; inventory/quest/position SQLite |
| After map save → `notifyGoMapSynced` | `POST /api/internal/sync-map` + `map_reloaded` |

- Setup: `./scripts/setup.sh` → enable Go (recommended)
- Gate TS engine: automatic when `NEXT_PUBLIC_GO_MMO_URL` / `GO_MMO_INTERNAL_URL` set; force with `ENABLE_TS_GAME_ENGINE=1`
- Docker Next → host Go: `GO_MMO_INTERNAL_URL=http://host.docker.internal:3001`
- Log: `logs/2026-08-06-hybrid-scale-main.md`

### Complete (Phase 1 & 2 Optimizations)

- **Go MMO Feature Parity**: Sockets, character persistence, skills, and dialogue trees are now fully powered by the Go backend on `main`.
- **Production Ready**: JWT authentication hardened for production (`NODE_ENV=production`). Map IO payloads and UI overlays aggressively lazy-loaded.
- **Babylon Canvas**: Incremental remeshing and heavy React overlay extraction is complete, significantly improving FPS and initial bundle size.

### Main / prod track

1. Deploy with Go URL + Caddy `go.` subdomain
2. Confirm `/api/maps` DEMO + peer lobby on Go
3. Studio save → peers get `map_reloaded` without relying only on client `admin_save_map`

| Priority | Issue | Status |
| :--- | :--- | :--- |
| **Hybrid Go** | Persist + server map sync + TS engine gate | **On main / complete** |
| **Go MMO setup** | Setup option + client wire | **On main / complete** |
| **Prod maps** | Lazy DEMO ensure | **On main / complete** |
| **P0–P12 / MP** | Studio + lobby | **On main / complete** |

Strip pause remains lifted. Editor foundation Phase 1–2f is on `main` — do not rebuild it.
Go MMO persistence (inventory/quests/position via SQLite) and `notifyGoMapSynced` are fully wired and functional.

Before coding, read:

1. **This file**
2. **`logs/2026-08-06-hybrid-scale-main.md`**
3. **`logs/2026-08-06-prod-empty-maps-lazy-ensure.md`** if Studio/lobby map 404
4. **`go-mmo/README.md`**
