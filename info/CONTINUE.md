# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

This folder (`/info/`) and `/logs/` are internal knowledge. Public repo docs are: `README.md`, `CHANGELOG.md`, `docs/TUXEMON_ATTRIBUTION.md`.

---

## Current Focus

**Shipped v2.1.112:** Game/Studio client split + mobile controls + multiplayer join fix.  
Plan: [`info/game/CLIENT_SPLIT_MOBILE_MP_PLAN.md`](./game/CLIENT_SPLIT_MOBILE_MP_PLAN.md)  
Manual verify: two browser accounts same map (see each other + chat); mobile one pad + fullscreen; `/studio` Dev-only; Staff menu Mod+.

**Back-line:** Discord, FiveM, S3/CDN, heavy AI.

### Recently shipped

| Version | What |
| :--- | :--- |
| 2.1.109 | Social actions domain split |
| 2.1.110 | Helper vitest suite |
| 2.1.111 | Production build fixes + `scripts/smoke-staging.sh` |
| 2.1.112 | Lobby player/studio split, mobile controls, MP join fix, staff menu |

### Suggested next

1. Human two-browser MP smoke on same map after deploy
2. Avoid Discord/FiveM/S3/AI unless asked

---

## Mandatory Read Order (before coding)

1. **This file**
2. `info/DEVELOPMENT_RULES.md`
3. `info/PROJECT_REPORT.md`
4. Area docs under `info/{…}/`
5. Realtime docs when touching live features
6. `/logs/LOCAL_CHANGELOG.md`
