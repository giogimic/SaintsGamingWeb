# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

---

## Current Focus

**Game Foundation Systems (PR #4) — Azure→Route1→Cotton walkable**

Progress: [`info/game/GAME_FOUNDATION_SYSTEMS.md`](./game/GAME_FOUNDATION_SYSTEMS.md)  
Smoke: [`info/game/SPYDER_SMOKE.md`](./game/SPYDER_SMOKE.md)

### Just shipped (Guide continuity)

- State-aware Azure Guide dialogue (`spyderGuideDialogue.ts`)
- Guide accept grants film **+ Budaye** party starter (Route TB unblocked)
- `GRANT_SPYDER_STARTER` / Lab options on Guide tree
- Path warps/grass + smoke doc from prior pass

### Suggested next

1. Human smoke per `SPYDER_SMOKE.md`
2. TMX bulk NPC import when Tuxemon checkout available
3. Deeper Spyder graph (gyms / story flags)
4. Optional: quest tracker UI polish for multi-stage Spyder chain

### Pipeline

```bash
npm run migrate:campaign
npm run ensure:campaign
npm run seed:campaign-npcs
npm run dev
```

---

## Mandatory Read Order

1. **This file**
2. `info/game/GAME_FOUNDATION_SYSTEMS.md`
3. `info/game/SPYDER_SMOKE.md`
4. `info/game/CLASS_SKILLS_SHINY.md`
