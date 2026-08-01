# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-01  
**Point every new session at this file first.**

This folder (`/info/`) and `/logs/` are internal knowledge. Public repo docs are: `README.md`, `CHANGELOG.md`, `docs/TUXEMON_ATTRIBUTION.md`.

---

## Current Focus

**Optional polish track closed for now (v2.1.103).** Pick a new feature from `info/PROJECT_REPORT.md` or product priorities.

### Done (this branch)

- **M1–M4**: Realtime platform + MMO AOI/binary/Redis scaling
- **Discord bridge (v2.1.99)** · **Achievements (v2.1.99)**
- **Campaign maps → WorldMap (v2.1.100)**
- **FiveM bridge (v2.1.101)**
- **S3/CDN uploads (v2.1.102)**
- **AOI soak tests + WorldMap ops docs + local→S3 migrate script (v2.1.103)**

### Suggested next (open product / tech debt)

1. Live multi-socket AOI soak against a running `server.ts` (manual / staging)
2. Content moderation / recommendations (long-term list)
3. Admin live metrics dashboard beyond `/admin/realtime`
4. Expand other `/info/*` planned sections (frontend, backend, social)

---

## Mandatory Read Order (before coding)

1. **This file** — current task
2. `info/DEVELOPMENT_RULES.md` — constraints + existing solutions
3. `info/PROJECT_REPORT.md` — what exists / broken / order
4. Bridges: `info/discord/BRIDGE.md` · `info/fivem/BRIDGE.md` · `info/uploads/STORAGE.md` · `info/database/WORLDMAP.md`
5. If realtime: `info/realtime/ARCHITECTURE.md` then `info/realtime/EVENTS.md`
6. `/logs/LOCAL_CHANGELOG.md` — recent local work notes
