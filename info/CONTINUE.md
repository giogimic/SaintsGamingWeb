# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-01  
**Point every new session at this file first.**

This folder (`/info/`) and `/logs/` are internal knowledge. Public repo docs are: `README.md`, `CHANGELOG.md`, `docs/TUXEMON_ATTRIBUTION.md`.

---

## Current Focus

**Deepening `/info` for core backend + admin (v2.1.106).**  
**Back-line (skip unless asked):** Discord, FiveM, S3/CDN, heavy AI / local models.

### Done (recent)

- System overviews (v2.1.105): frontend, backend, auth, social, admin, game, forum
- **v2.1.106:** `info/backend/API_CATALOG.md`, `info/admin/PERMISSIONS.md`
- Live platform track through v2.1.104 on PR #1

### Suggested next

1. Deepen another area (social action map, game socket event list, frontend route map)
2. Core code: split `social.ts` / canvas debt, or more vitest
3. Staging smoke of PR #1 (forum, lobby, realtime) when ready to merge

---

## Mandatory Read Order (before coding)

1. **This file**
2. `info/DEVELOPMENT_RULES.md`
3. `info/PROJECT_REPORT.md`
4. Area docs under `info/{frontend,backend,auth,social,admin,game,forum}/`
5. Realtime: `info/realtime/ARCHITECTURE.md` → `EVENTS.md` when touching live features
6. `/logs/LOCAL_CHANGELOG.md`
