# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

This folder (`/info/`) and `/logs/` are internal knowledge. Public repo docs are: `README.md`, `CHANGELOG.md`, `docs/TUXEMON_ATTRIBUTION.md`.

---

## Current Focus

**PR #1 merged to `main` (through v2.1.111).**  
Core site + MMO lobby are the active product surface.

### Back-line (do not prioritize)

| Area | Why |
| :--- | :--- |
| **UCP** (`/ucp/*`) | Uncertain if we ship it; needs a planned FiveM plugin first — likely much later |
| Discord bot bridge | Ecosystem nice-to-have |
| FiveM bridges / UCP depth | Same lane as UCP — wait for plugin design |
| S3/CDN as default | Optional path exists; local uploads fine |
| Heavy AI | Forum enhance exists; don’t expand |

### Suggested next (core site)

1. Support ticket live updates (if still missing emits)
2. Logged-in forum / messenger / notification smoke
3. Email (Resend / `FROM_EMAIL` verification)
4. More tests on forum/messenger/API helpers
5. Product work as requested

---

## Mandatory Read Order (before coding)

1. **This file**
2. `info/DEVELOPMENT_RULES.md`
3. `info/PROJECT_REPORT.md`
4. Area docs under `info/{…}/`
5. Realtime docs when touching live features
6. `/logs/LOCAL_CHANGELOG.md`
