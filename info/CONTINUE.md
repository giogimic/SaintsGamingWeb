# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-01  
**Point every new session at this file first.**

This folder (`/info/`) and `/logs/` are internal knowledge. Public repo docs are: `README.md`, `CHANGELOG.md`, `docs/TUXEMON_ATTRIBUTION.md`.

---

## Current Focus

**Expanding `/info` documentation (v2.1.105).**  
Treat **Discord / FiveM / S3 / heavy AI** as **back-line** — do not prioritize unless asked.

### Done (recent)

- Realtime M1–M4 + maps + ops polish (through v2.1.103)
- Forum Settings text enhance (v2.1.104) — back-line for local models
- **System overviews (v2.1.105):** frontend, backend, auth, social, admin, game, forum

### Suggested next

1. Deepen docs as needed (per-area API catalogs, diagrams)
2. Point `docs/TODO.md` readers to `/info/` (stale)
3. Product/tech work that is **not** back-line: e.g. split large files (`social.ts`, canvas), more tests, UX polish
4. Staging smokes for core site (forum, lobby, realtime) when deploying PR #1

---

## Mandatory Read Order (before coding)

1. **This file** — current task
2. `info/DEVELOPMENT_RULES.md`
3. `info/PROJECT_REPORT.md`
4. Area overview under `info/{frontend,backend,auth,social,admin,game,forum}/`
5. If realtime: `info/realtime/ARCHITECTURE.md` then `EVENTS.md`
6. `/logs/LOCAL_CHANGELOG.md`
