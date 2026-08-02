# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

---

## Current Focus

**Game Foundation Systems (PR #4) — Cotton indoor Scoop/Café**

Progress: [`info/game/GAME_FOUNDATION_SYSTEMS.md`](./game/GAME_FOUNDATION_SYSTEMS.md)  
Smoke: [`info/game/SPYDER_SMOKE.md`](./game/SPYDER_SMOKE.md)

### Just shipped

- Plaza doors → `COTTON_SCOOP` / `COTTON_CAFE` with return warps
- Q5 NPCs moved indoors; greeter points to doors
- Lobby allowlist + `smoke:spyder` cover indoor maps

### Suggested next

1. Human smoke through Scoop + Café (Q5)
2. TMX bulk NPC import when Tuxemon checkout available
3. Optional: Cotton tunnel / next story beat

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
