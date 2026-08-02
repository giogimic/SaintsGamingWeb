# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

This folder (`/info/`) and `/logs/` are internal knowledge. Public repo docs are: `README.md`, `CHANGELOG.md`, `docs/TUXEMON_ATTRIBUTION.md`.

---

## Current Focus

**v2.1.114 — ALIGNMENT slices A→B→C landed** (capture TB-only, RT combat authority, TB encounter→capture loop).

Bible index: [`info/gameplay-bible/README.md`](./gameplay-bible/README.md)  
Alignment status: [`info/gameplay-bible/ALIGNMENT.md`](./gameplay-bible/ALIGNMENT.md)  
Vision: [`info/vision/ECOSYSTEM.md`](./vision/ECOSYSTEM.md)

**Lobby client split (v2.1.113)** — `/lobby` player, `/studio` Dev, Staff FAB Mod/Admin.  
Verify: [`info/game/LOBBY_VERIFY.md`](./game/LOBBY_VERIFY.md)

**Back-line:** Discord, FiveM, S3/CDN, heavy AI.

### Recently shipped

| Version | What |
| :--- | :--- |
| 2.1.114 | Capture TB-only hardening; RT combat math/LoS/loot despawn; TB encounter directMessage + PlayerCreature capture |
| 2.1.112–113 | Lobby/studio split, mobile controls, MP shard fix, vision doc |
| docs | Full Gameplay Bible `info/gameplay-bible/01`–`16` + ALIGNMENT |

### Suggested next

1. Human smoke: tall-grass encounter → weaken → Binding Crystal → Creature Box; RT monster kill → loot pickup
2. Two-browser lobby smoke (`LOBBY_VERIFY.md`)
3. ALIGNMENT slice **D** (Studio creator UX) or **E** (website ↔ game bridge) — product pick
4. Ask product only when bible does not cover a decision

---

## Mandatory Read Order (before coding)

1. **This file**
2. `info/vision/ECOSYSTEM.md`
3. `info/gameplay-bible/README.md` + relevant bible pages (`07` constitution always)
4. `info/gameplay-bible/ALIGNMENT.md`
5. `info/DEVELOPMENT_RULES.md`
6. Area docs under `info/{…}/`
7. `/logs/LOCAL_CHANGELOG.md`
