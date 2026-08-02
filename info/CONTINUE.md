# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

---

## Current Focus

**Game Foundation Systems (PR #4) — Spyder Q5 + path smoke**

Progress: [`info/game/GAME_FOUNDATION_SYSTEMS.md`](./game/GAME_FOUNDATION_SYSTEMS.md)  
Smoke: [`info/game/SPYDER_SMOKE.md`](./game/SPYDER_SMOKE.md)

### Just shipped

- Q5 Cotton Locals (Scoop Clerk + Café Host on plaza)
- Guide nodes for cotton locals / done
- `npm run smoke:spyder` — offline path integrity (gates, corridors, NPCs, quests)

### Suggested next

1. Human smoke per `SPYDER_SMOKE.md`
2. Indoor Cotton warps (Scoop / Café maps) if desired
3. TMX bulk NPC import when Tuxemon checkout available

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
