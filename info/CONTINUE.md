# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

---

## Current Focus

**Game Foundation Systems (PR #4) — Q10 Leather Gym (Rook) + Shaft1**

Progress: [`info/game/GAME_FOUNDATION_SYSTEMS.md`](./game/GAME_FOUNDATION_SYSTEMS.md)  
Smoke: [`info/game/SPYDER_SMOKE.md`](./game/SPYDER_SMOKE.md)

### Just shipped

- **Rook** Gym trainer: Rockitten → Aardorn + post-battle dialogue
- **Q10** Leather Gym (TALK + BATTLE); Q9 auto-advances
- **Shaft1** east of Leather Town (scout + tall grass)
- Offline smoke: **231** checks

### Suggested next

1. Human smoke Q1–Q10 (Rook fight, Center heal rematch, shaft)
2. Optional: Shaft2 link / second Gym foe roster expand
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
