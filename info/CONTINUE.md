# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

---

## Current Focus

**Game Foundation Systems (PR #4) — Carlos trainer battle**

Progress: [`info/game/GAME_FOUNDATION_SYSTEMS.md`](./game/GAME_FOUNDATION_SYSTEMS.md)  
Smoke: [`info/game/SPYDER_SMOKE.md`](./game/SPYDER_SMOKE.md)

### Just shipped

- `START_TRAINER_BATTLE` → 1v1 TB (Carlos / Dragarbor)
- No flee/capture in trainer battles; win → `trainerDefeated` / Q6 `BATTLE`
- Q6: TALK then defeat Carlos

### Suggested next

1. Human smoke Q1–Q6 including Carlos fight
2. Multi-monster trainer parties / post-battle dialogue branches
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
