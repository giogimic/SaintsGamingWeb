# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

---

## Current Focus

**v2.1.118 — Demo vertical slice playable**

Smoke checklist: [`info/game/DEMO_SMOKE.md`](./game/DEMO_SMOKE.md)

Shipped for demo:
- Walkable `DEMO_SANDBOX` seeded on boot (logic tiles 0/2/5/6/7/9/11)
- Gather wood/ore on tiles 5/6; shop/craft tiles; CLEAR_BRAMBLE (Q4)
- Warden Vance (E or click) → tools + film + lab + quest report
- Formal Q1–Q4 QuestTemplate chain with tracker HUD
- Soul **Film** capture (TB EXPOSE FILM); shop buy/craft film
- RT Rockitten spawns for hotbar combat
- Creature Catalog (Studio) + 3 elemental starters + Rockitten wild

Bible: [`info/gameplay-bible/README.md`](./gameplay-bible/README.md)

**Back-line:** Discord, FiveM, S3/CDN, heavy AI.

### Suggested next

1. Human run `DEMO_SMOKE.md` and file gaps
2. Persist bramble-cleared as PlayerWorldFlag (per-character) if multi-shard needs it
3. ALIGNMENT D (Studio UX) / E (website bridge)

---

## Mandatory Read Order

1. **This file**
2. `info/game/DEMO_SMOKE.md`
3. `info/gameplay-bible/ALIGNMENT.md`
4. `/logs/LOCAL_CHANGELOG.md`
