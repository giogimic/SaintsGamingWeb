# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

---

## Current Focus

**Game Foundation Systems (PR #4) — Q7 Route 2 + Scoop support**

Progress: [`info/game/GAME_FOUNDATION_SYSTEMS.md`](./game/GAME_FOUNDATION_SYSTEMS.md)  
Smoke: [`info/game/SPYDER_SMOKE.md`](./game/SPYDER_SMOKE.md)

### Just shipped

- **Q7** Beyond the Tunnel: Cotton Tunnel east → `SPYDER_ROUTE2` scout
- Scoop **film shop** (`OPEN_SHOP`) + **nurse** (`HEAL_PARTY`)
- Trainer soft-heal + nurse heal sync via `party_creatures_hp`
- Tracker “Spyder Trail Clear” after Q7; Guide `node_route2` / `node_done`
- Offline smoke: **145** checks

### Suggested next

1. Human smoke Q1–Q7 (Carlos rematch via Scoop nurse, Route 2 scout)
2. Optional: extend Route 2 east / Leather Town hook
3. Confirm shop purchases grant film in live session

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
