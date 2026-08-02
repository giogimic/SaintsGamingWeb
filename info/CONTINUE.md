# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

---

## Current Focus

**Game Foundation Systems (PR #4) — Q8 Leather Town + quest gold→credits**

Progress: [`info/game/GAME_FOUNDATION_SYSTEMS.md`](./game/GAME_FOUNDATION_SYSTEMS.md)  
Smoke: [`info/game/SPYDER_SMOKE.md`](./game/SPYDER_SMOKE.md)

### Just shipped

- Quest reward **`gold` → character credits** (shop wallet)
- Route 2 east → **Route 3** → **Leather Town** + Center nurse
- **Q8** Leather arrive (greeter); Guide `node_leather`; tracker clear after Q8
- Offline smoke: **180** checks

### Suggested next

1. Human smoke Q1–Q8 (film buy after quest gold, Leather Center heal)
2. Optional: Leather Scoop / Gym / Shaft hook
3. Densify Leather ambient NPCs from TMX if desired

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
