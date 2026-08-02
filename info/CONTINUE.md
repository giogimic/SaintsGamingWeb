# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

---

## Current Focus

**Game Foundation Systems (PR #4) — Q11 Leather Shafts (Shaft1→2)**

Progress: [`info/game/GAME_FOUNDATION_SYSTEMS.md`](./game/GAME_FOUNDATION_SYSTEMS.md)  
Smoke: [`info/game/SPYDER_SMOKE.md`](./game/SPYDER_SMOKE.md)

### Just shipped

- **Shaft2** linked east of Shaft1 (miner + tall grass)
- **Q11** Leather Shafts (scout → Deep Miner); Q10 auto-advances
- Guide `node_leather_shaft`; tracker clear after Q11
- Offline smoke: **245** checks

### Suggested next

1. Human smoke Q1–Q11 (Rook → shafts → Shaft2 miner)
2. Optional: Shaft2 trainer / next Spyder region hook
3. TMX Leather ambient import when `TUXEMON_PATH` available

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
