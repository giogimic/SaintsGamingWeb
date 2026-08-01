# CONTINUE HERE — AI / Dev Handoff

**Last updated:** 2026-08-01  
**Point every new agent session at this file first.**

This folder (`/info/`) and `/logs/` are internal knowledge. Public repo docs are: `README.md`, `CHANGELOG.md`, `docs/TUXEMON_ATTRIBUTION.md`.

---

## Current Focus

**FiveM character/stats bridge landed (v2.1.101).** Optional S3/CDN / AOI soak next.

### Done

- **M1–M4**: Realtime platform + MMO AOI/binary/Redis scaling
- **Discord bridge (v2.1.99)**: `POST /api/discord/events` + `info/discord/BRIDGE.md`
- **Achievement automation (v2.1.99)**: `first_reply`, `social_starter`, `tipper` + live notify
- **Campaign maps → WorldMap (v2.1.100)**: seed under `scripts/data/`; migrate + verify scripts
- **FiveM bridge (v2.1.101)**:
  - `POST /api/fivem/events` — join/leave/sync/bank/link
  - Events: `fivem.player.*`, `fivem.character.updated`, `fivem.bank.updated`
  - Docs: `info/fivem/BRIDGE.md`
  - UCP live refresh via realtime store

### Next concrete steps (in order)

1. Optional: S3/CDN for uploads
2. Optional: deeper multi-client AOI soak test
3. Optional: expand `/info/database/` docs for WorldMap ops

---

## Mandatory Read Order (before coding)

1. **This file** — current task
2. `info/AI_DEVELOPMENT_RULES.md` — constraints + existing solutions
3. `info/PROJECT_REPORT.md` — what exists / broken / order
4. Discord: `info/discord/BRIDGE.md` · FiveM: `info/fivem/BRIDGE.md`
5. If realtime: `info/realtime/ARCHITECTURE.md` then `info/realtime/EVENTS.md`
6. `/logs/LOCAL_CHANGELOG.md` — recent local work notes
