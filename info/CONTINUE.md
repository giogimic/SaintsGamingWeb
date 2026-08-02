# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

This folder (`/info/`) and `/logs/` are internal knowledge. Public repo docs are: `README.md`, `CHANGELOG.md`, `docs/TUXEMON_ATTRIBUTION.md`.

---

## Current Focus

**v2.1.116 — Creature Catalog (hero-like editor)**

- Studio → **Creatures** panel / Prisma `CreatureDef` / `creatureCatalog.ts` seed
- Lab offers Solar/Bio/Hydro starters from catalog; wilds from `isWildSpawn`
- Docs: `info/game/CREATURE_CATALOG.md`, Camera/Film + Aethervale drafts still pending code

Bible: [`info/gameplay-bible/README.md`](./gameplay-bible/README.md)

**Back-line:** Discord, FiveM, S3/CDN, heavy AI.

### Suggested next

1. Studio Seed creatures on real `DATABASE_URL` deploy
2. Wire **Film** capture slugs (see `CAPTURE_CAMERA_FILM.md`)
3. Quest 1 Vance tool grant
4. Confirm Soul Camera hard-gate

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
