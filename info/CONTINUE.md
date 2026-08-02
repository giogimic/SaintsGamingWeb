# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

---

## Current Focus

**Game Foundation Systems (PR #4) — Spyder path corridors + client sync**

Progress: [`info/game/GAME_FOUNDATION_SYSTEMS.md`](./game/GAME_FOUNDATION_SYSTEMS.md)  
Smoke: [`info/game/SPYDER_SMOKE.md`](./game/SPYDER_SMOKE.md)

### Just shipped

- Carved walkable corridors on SPYDER_ROUTE1 / Cotton / ROUTE1 (spawn→grass→gates)
- Moved scout + Cotton greeter onto walkable tiles
- Lobby `accountId` = session User.id (battle toast/CAPTURE filters)
- Spyder-aware empty quest tracker copy

### Suggested next

1. Human smoke per `SPYDER_SMOKE.md`
2. TMX bulk NPC import when Tuxemon checkout available
3. Deeper Spyder graph (Cotton scoop/café / tunnel)

### Pipeline

```bash
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
