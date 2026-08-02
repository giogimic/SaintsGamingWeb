# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

---

## Current Focus

**Game Foundation Systems (PR #4) — Q9 Leather Scoop + Gym door**

Progress: [`info/game/GAME_FOUNDATION_SYSTEMS.md`](./game/GAME_FOUNDATION_SYSTEMS.md)  
Smoke: [`info/game/SPYDER_SMOKE.md`](./game/SPYDER_SMOKE.md)

### Just shipped

- **Leather Scoop** film shop + **Q9** visit quest
- Leather plaza ambient densify; **Gym** door + attendant (dialogue only)
- Guide `node_leather_scoop`; tracker clear after Q9
- Offline smoke: **212** checks

### Suggested next

1. Human smoke Q1–Q9 (Leather Scoop buy + Center heal + Gym peek)
2. Optional: Leather Gym trainer challenge / Shaft1 hook
3. TMX ambient import for Leather when `TUXEMON_PATH` available

### Pipeline

```bash
npm run ensure:campaign
npm run seed:campaign-npcs
npm run smoke:spyder
npm run dev
```

---

## Mandatory Read Order

1. **This file**
2. `info/game/GAME_FOUNDATION_SYSTEMS.md`
3. `info/game/SPYDER_SMOKE.md`
4. `info/game/CLASS_SKILLS_SHINY.md`
