# CONTINUE HERE — AI / Dev Handoff

**Last updated:** 2026-08-01  
**Point every new agent session at this file first.**

This folder (`/info/`) and `/logs/` are internal knowledge. Public repo docs are: `README.md`, `CHANGELOG.md`, `docs/TUXEMON_ATTRIBUTION.md`.

---

## Current Focus

**Optional S3/CDN uploads landed (v2.1.102).** Remaining optional polish: AOI soak / database docs.

### Done

- **M1–M4**: Realtime platform + MMO AOI/binary/Redis scaling
- **Discord bridge (v2.1.99)**: `POST /api/discord/events` + `info/discord/BRIDGE.md`
- **Achievement automation (v2.1.99)**
- **Campaign maps → WorldMap (v2.1.100)**
- **FiveM bridge (v2.1.101)**: `POST /api/fivem/events` + `info/fivem/BRIDGE.md`
- **S3/CDN uploads (v2.1.102)**:
  - Env-gated in `upload.ts` / `s3-storage.ts`
  - Docs: `info/uploads/STORAGE.md`
  - Local fallback when S3 unset or PutObject fails

### Next concrete steps (in order)

1. Optional: deeper multi-client AOI soak test
2. Optional: expand `/info/database/` docs for WorldMap ops
3. Optional: migrate existing local `/uploads` objects to the bucket (ops script)

---

## Mandatory Read Order (before coding)

1. **This file** — current task
2. `info/AI_DEVELOPMENT_RULES.md` — constraints + existing solutions
3. `info/PROJECT_REPORT.md` — what exists / broken / order
4. Discord: `info/discord/BRIDGE.md` · FiveM: `info/fivem/BRIDGE.md` · Uploads: `info/uploads/STORAGE.md`
5. If realtime: `info/realtime/ARCHITECTURE.md` then `info/realtime/EVENTS.md`
6. `/logs/LOCAL_CHANGELOG.md` — recent local work notes
