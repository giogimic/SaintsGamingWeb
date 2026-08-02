# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

---

## Current Focus

**Game Foundation Systems (PR #4) — Spyder on-ramp playable**

Progress: [`info/game/GAME_FOUNDATION_SYSTEMS.md`](./game/GAME_FOUNDATION_SYSTEMS.md)  
Design: [`info/game/CLASS_SKILLS_SHINY.md`](./game/CLASS_SKILLS_SHINY.md)

### Just shipped (Spyder path)

- Curated campaign NPCs + 3-quest Spyder chain (`spyderQuests.ts`, `seed:campaign-npcs`)
- Dialogue → quest TALK via engine `dialogue_start` + stable NPC ids
- Capture → CLAIM `capture_any` via `creatureCaptured`
- Kill-blow combat XP + `monsterKilled` for KILL objectives
- TMX NPC import script (`import:map-npcs`) when `TUXEMON_PATH` is set

### Suggested next

1. Human smoke: Spyder Tamer → Azure Guide accept → townsfolk → Route 1 capture → report
2. Expand Spyder chain past quest 3 (Cotton Town / gyms)
3. Run TMX import against a local Tuxemon checkout for denser NPC placements

### Pipeline

```bash
npm run import:tuxemon
npm run sync:creatures
npm run migrate:campaign
npm run ensure:campaign
npm run seed:campaign-npcs
npm run dev
```

---

## Mandatory Read Order

1. **This file**
2. `info/game/GAME_FOUNDATION_SYSTEMS.md`
3. `info/game/CLASS_SKILLS_SHINY.md`
4. `info/gameplay-bible/ALIGNMENT.md`
