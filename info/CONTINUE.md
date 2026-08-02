# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

This folder (`/info/`) and `/logs/` are internal knowledge. Public repo docs are: `README.md`, `CHANGELOG.md`, `docs/TUXEMON_ATTRIBUTION.md`.

---

## Current Focus

**Planning:** Game/Studio client split + mobile controls + multiplayer visibility.  
Plan: [`info/game/CLIENT_SPLIT_MOBILE_MP_PLAN.md`](./game/CLIENT_SPLIT_MOBILE_MP_PLAN.md) (mirror also in gitignored `/logs/`).  
**Blocked on** user answers to open questions in that plan (route, Studio entry tier, touch style, MP test method).

**Back-line:** Discord, FiveM, S3/CDN, heavy AI.

### Recently shipped

| Version | What |
| :--- | :--- |
| 2.1.109 | Social actions domain split |
| 2.1.110 | Helper vitest suite |
| 2.1.111 | Production build fixes + `scripts/smoke-staging.sh` |

### Suggested next

1. Confirm plan open questions, then implement Phase 1 (mobile) → Phase 2 (MP) → Phase 3 (client split)
2. Avoid Discord/FiveM/S3/AI unless asked

---

## Mandatory Read Order (before coding)

1. **This file**
2. `info/DEVELOPMENT_RULES.md`
3. `info/PROJECT_REPORT.md`
4. Area docs under `info/{…}/`
5. Realtime docs when touching live features
6. `/logs/LOCAL_CHANGELOG.md`
