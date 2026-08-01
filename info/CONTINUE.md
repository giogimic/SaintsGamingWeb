# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-01  
**Point every new session at this file first.**

This folder (`/info/`) and `/logs/` are internal knowledge. Public repo docs are: `README.md`, `CHANGELOG.md`, `docs/TUXEMON_ATTRIBUTION.md`.

---

## Current Focus

**Core `/info` deep docs landed (v2.1.108).**  
**Back-line:** Discord, FiveM, S3/CDN, heavy AI.

### Docs track complete (for now)

| Version | What |
| :--- | :--- |
| 2.1.105 | System overviews |
| 2.1.106 | Backend API catalog + admin permissions |
| 2.1.107 | Social actions + game sockets |
| 2.1.108 | Frontend routes map |

### Suggested next (code / ship)

1. Split `app/actions/social.ts` by domain (keep export names stable)
2. More vitest on permissions / forum / messenger helpers
3. Staging smoke + merge PR #1 (forum, lobby, realtime)

---

## Mandatory Read Order (before coding)

1. **This file**
2. `info/DEVELOPMENT_RULES.md`
3. `info/PROJECT_REPORT.md`
4. Area docs under `info/{…}/`
5. Realtime docs when touching live features
6. `/logs/LOCAL_CHANGELOG.md`
