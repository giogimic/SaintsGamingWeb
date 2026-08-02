# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

---

## Current Focus

**Game Foundation Systems (PR #4) — Azure→Route1→Cotton walkable**

Progress: [`info/game/GAME_FOUNDATION_SYSTEMS.md`](./game/GAME_FOUNDATION_SYSTEMS.md)  
Smoke: [`info/game/SPYDER_SMOKE.md`](./game/SPYDER_SMOKE.md)

### Just shipped (path continuity)

- Campaign warps + tall grass + route encounters (`seed:campaign-path` / `ensure:campaign`)
- Gate normalize (array + spawn aliases) for client warps
- Lobby allowlist includes Spyder maps (Spyder Tamer no longer forced to DEMO)
- Q4 Cotton arrive; film grant on Guide accept
- Spyder smoke doc

### Suggested next

1. Human smoke per `SPYDER_SMOKE.md`
2. State-aware Guide dialogue (accept vs report vs done)
3. TMX bulk NPC import when Tuxemon checkout available
4. Deeper Spyder graph (gyms / story flags)

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
