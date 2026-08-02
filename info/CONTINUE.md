# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

This folder (`/info/`) and `/logs/` are internal knowledge. Public repo docs are: `README.md`, `CHANGELOG.md`, `docs/TUXEMON_ATTRIBUTION.md`.

---

## Current Focus

**v2.1.115 — Shop/craft crystals + Rockitten starter for TB+RT**

- Buy/craft Binding Crystals at Village Merchant (server Prisma inventory)
- Claim **Rockitten** starter (`claim_starter` / Party → Open Lab)
- Wild Rockitten for tall-grass TB + roaming RT combat
- No free gather tools / no free capture crystals

Bible: [`info/gameplay-bible/README.md`](./gameplay-bible/README.md)  
Alignment: [`info/gameplay-bible/ALIGNMENT.md`](./gameplay-bible/ALIGNMENT.md)

**Back-line:** Discord, FiveM, S3/CDN, heavy AI.

### Suggested next

1. Starter + capture drafts ready:
   - `info/game/STARTERS_BY_ELEMENT.md` — Agnite / Budaye / Dollfin
   - `info/game/CAPTURE_CAMERA_FILM.md` — Soul Camera + Film tiers
2. Confirm open questions (camera hard-gate, display names, Rockitten nest)
3. Implement film slugs + 3-nest `claim_starter`, then **Quest 1** Vance tools
4. ALIGNMENT slice **D** / **E** when tutorial path is stable

### Smoke path (MPV)

1. Party panel → Claim Rockitten / Open Lab  
2. Step on shop tile → BUY Binding Crystal **or** BUY dust+log → CRAFT  
3. Tall grass → TB battle → weaken → BAG Crystal  
4. Target overworld Rockitten → hotbar Strike  

---

## Mandatory Read Order (before coding)

1. **This file**
2. `info/vision/ECOSYSTEM.md`
3. `info/gameplay-bible/README.md` + `07` constitution
4. `info/gameplay-bible/ALIGNMENT.md`
5. `info/DEVELOPMENT_RULES.md`
6. `/logs/LOCAL_CHANGELOG.md`
