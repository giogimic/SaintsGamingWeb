# CONTINUE HERE — AI / Dev Handoff

**Last updated:** 2026-08-01  
**Point every new agent session at this file first.**

This folder (`/info/`) and `/logs/` are internal knowledge. Public repo docs are: `README.md`, `CHANGELOG.md`, `docs/TUXEMON_ATTRIBUTION.md`.

---

## Current Focus

**Campaign map DB migration complete (v2.1.100).** Optional ecosystem bridges next.

### Done

- **M1–M4**: Realtime platform + MMO AOI/binary/Redis scaling
- **Discord bridge (v2.1.99)**: `POST /api/discord/events` + `info/discord/BRIDGE.md`
- **Achievement automation (v2.1.99)**: `first_reply`, `social_starter`, `tipper` + live notify
- **Campaign maps → WorldMap (v2.1.100)**:
  - Seed dump: `scripts/data/campaign-maps.generated.ts` (do **not** import from app/)
  - App stub: `src/web/components/the-lobby/data/campaign-maps.ts`
  - Migrate: `npx tsx scripts/migrate-campaign-maps-to-db.ts` → 235 `WorldMap` rows (`gameId=tuxemon`)
  - Verify: `npx tsx scripts/verify-campaign-maps.ts`
  - Loaders: `/api/maps`, `/api/maps/[slug]`, `loadMap()` / `listMaps()`, server `map-loader.js`

### Next concrete steps (in order)

1. Optional: FiveM → `/api/internal/events` character/stats bridge
2. Optional: S3/CDN for uploads; deeper multi-client AOI soak test
3. Optional: expand `/info/database/` docs for WorldMap ops

---

## Mandatory Read Order (before coding)

1. **This file** — current task
2. `info/AI_DEVELOPMENT_RULES.md` — constraints + existing solutions
3. `info/PROJECT_REPORT.md` — what exists / broken / order
4. Discord bot: `info/discord/BRIDGE.md`
5. If realtime: `info/realtime/ARCHITECTURE.md` then `info/realtime/EVENTS.md`
6. `/logs/LOCAL_CHANGELOG.md` — recent local work notes
