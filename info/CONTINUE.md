# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

This folder (`/info/`) and `/logs/` are internal knowledge. Public repo docs are: `README.md`, `CHANGELOG.md`, `docs/TUXEMON_ATTRIBUTION.md`.

---

## Current Focus

**Gameplay Bible ingested (16 pages).**  
Index: [`info/gameplay-bible/README.md`](./gameplay-bible/README.md)  
Honest gaps: [`info/gameplay-bible/ALIGNMENT.md`](./gameplay-bible/ALIGNMENT.md)  
Vision: [`info/vision/ECOSYSTEM.md`](./vision/ECOSYSTEM.md)

**Lobby client split shipped (v2.1.113)** — `/lobby` player, `/studio` Dev, Staff FAB Mod/Admin.  
Verify: [`info/game/LOBBY_VERIFY.md`](./game/LOBBY_VERIFY.md)

**Blocked on product pick:** next implementation slice A–E in ALIGNMENT (default A → B → C).

**Back-line:** Discord, FiveM, S3/CDN, heavy AI.

### Recently shipped

| Version | What |
| :--- | :--- |
| 2.1.112–113 | Lobby/studio split, mobile controls, MP shard fix, vision doc |
| docs | Full Gameplay Bible `info/gameplay-bible/01`–`16` + ALIGNMENT |

### Suggested next

1. Human two-browser smoke (`LOBBY_VERIFY.md`)
2. Choose ALIGNMENT slice **A** (constitution: capture TB-only audit) or **B** (RT combat math/loot)
3. Avoid Discord/FiveM/S3/AI unless asked

---

## Mandatory Read Order (before coding)

1. **This file**
2. `info/vision/ECOSYSTEM.md`
3. `info/gameplay-bible/README.md` + relevant bible pages (`07` constitution always)
4. `info/gameplay-bible/ALIGNMENT.md`
5. `info/DEVELOPMENT_RULES.md`
6. Area docs under `info/{…}/`
7. `/logs/LOCAL_CHANGELOG.md`
