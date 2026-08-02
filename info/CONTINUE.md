# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

This folder (`/info/`) and `/logs/` are internal knowledge. Public repo docs are: `README.md`, `CHANGELOG.md`, `docs/TUXEMON_ATTRIBUTION.md`.

---

## Current Focus

**Complete: Lobby player/studio split + mobile + MP (v2.1.113).**  
Vision: [`info/vision/ECOSYSTEM.md`](./vision/ECOSYSTEM.md)  
Verify: [`info/game/LOBBY_VERIFY.md`](./game/LOBBY_VERIFY.md)

**Back-line:** Discord, FiveM, S3/CDN, heavy AI.

### Recently shipped

| Version | What |
| :--- | :--- |
| 2.1.111 | Production build fixes + `scripts/smoke-staging.sh` |
| 2.1.112 | Lobby player/studio split, mobile controls, MP join fix, staff menu |
| 2.1.113 | Base-map persistence, vision doc, mobile launcher polish, verify checklist |

### Suggested next

1. Human two-browser smoke using `info/game/LOBBY_VERIFY.md`
2. Next product work should strengthen ecosystem integration (website ↔ game), not parallel systems
3. Avoid Discord/FiveM/S3/AI unless asked

---

## Mandatory Read Order (before coding)

1. **This file**
2. `info/vision/ECOSYSTEM.md`
3. `info/DEVELOPMENT_RULES.md`
4. `info/PROJECT_REPORT.md`
5. Area docs under `info/{…}/`
6. Realtime docs when touching live features
7. `/logs/LOCAL_CHANGELOG.md`
