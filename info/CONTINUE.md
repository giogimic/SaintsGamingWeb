# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-01  
**Point every new session at this file first.**

This folder (`/info/`) and `/logs/` are internal knowledge. Public repo docs are: `README.md`, `CHANGELOG.md`, `docs/TUXEMON_ATTRIBUTION.md`.

---

## Current Focus

**Social actions split landed (v2.1.109).**  
**Back-line:** Discord, FiveM, S3/CDN, heavy AI.

### Recently shipped

| Version | What |
| :--- | :--- |
| 2.1.105–108 | Core `/info` deep docs |
| 2.1.109 | Split `app/actions/social.ts` → domain modules + barrel |

### Suggested next (code / ship)

1. More vitest on permissions / forum / messenger helpers
2. Staging smoke + merge PR #1 (forum, lobby, realtime)

---

## Mandatory Read Order (before coding)

1. **This file**
2. `info/DEVELOPMENT_RULES.md`
3. `info/PROJECT_REPORT.md`
4. Area docs under `info/{…}/`
5. Realtime docs when touching live features
6. `/logs/LOCAL_CHANGELOG.md`
