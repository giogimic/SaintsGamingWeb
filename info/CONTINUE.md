# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

---

## Current Focus

**Game Foundation Systems (PR #4) — ambient NPCs + Carlos 2-foe + tracker clear**

Progress: [`info/game/GAME_FOUNDATION_SYSTEMS.md`](./game/GAME_FOUNDATION_SYSTEMS.md)  
Smoke: [`info/game/SPYDER_SMOKE.md`](./game/SPYDER_SMOKE.md)

### Just shipped

- Ambient dialogue seed + wall prune (`npm run seed:ambient`, also via `seed:campaign-npcs`)
- Azure plaza densify (3 hand-placed ambient NPCs)
- Carlos trainer party: **Dragarbor → Pairagrin**
- Post-Q6 Spyder tracker copy when campaign complete
- Offline smoke: **127** checks (incl. ambient walls/dialogue)

### Suggested next

1. Human smoke Q1–Q6 (note 2-foe Carlos + rematch)
2. Confirm tracker shows “Spyder Trail Clear” after Q6
3. Optional: more Azure ambient flavor / next Spyder chapter hook

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
