# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

This folder (`/info/`) and `/logs/` are internal knowledge. Public repo docs are: `README.md`, `CHANGELOG.md`, `docs/TUXEMON_ATTRIBUTION.md`.

---

## Current Focus

**Helper vitest coverage landed (v2.1.110).**  
**Back-line:** Discord, FiveM, S3/CDN, heavy AI.

### Recently shipped

| Version | What |
| :--- | :--- |
| 2.1.105–108 | Core `/info` deep docs |
| 2.1.109 | Split `app/actions/social.ts` → domain modules + barrel |
| 2.1.110 | Vitest: permissions, forum access/slug/validators/mentions, messenger crypto |

### Suggested next (code / ship)

1. Staging smoke + merge PR #1 (forum, lobby, realtime)
2. More product work as requested (avoid Discord/FiveM/S3/AI unless asked)

---

## Mandatory Read Order (before coding)

1. **This file**
2. `info/DEVELOPMENT_RULES.md`
3. `info/PROJECT_REPORT.md`
4. Area docs under `info/{…}/`
5. Realtime docs when touching live features
6. `/logs/LOCAL_CHANGELOG.md`
