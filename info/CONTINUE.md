# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

---

## Current Focus

**Game Foundation Systems (PR #4) — combat XP + Spyder NPC path**

Progress: [`info/game/GAME_FOUNDATION_SYSTEMS.md`](./game/GAME_FOUNDATION_SYSTEMS.md)  
Design: [`info/game/CLASS_SKILLS_SHINY.md`](./game/CLASS_SKILLS_SHINY.md)

### Just shipped (continue pass)

- RT combat → combat skill typing XP (`combatSkillXp.ts` + CombatManager / damage-taken)
- TB win/capture → summoning (+ hitpoints / perception)
- Weighted encounter helper used by EncounterManager
- Studio NPC panel **persists** to `WorldMap.npcsData` + dialogue tree
- Vance/Rockitten demo spawns gated to `DEMO_SANDBOX` only
- `npm run seed:azure` → Azure Guide NPC + `quest_azure_welcome` on AZURE_TOWN

### Suggested next

1. Human smoke: Spyder Tamer → talk to Azure Guide → accept quest; RT fight Rockitten on DEMO for skill XP
2. Import more TMX `create_npc` placements into campaign maps
3. Flatten more Spyder mission steps into QuestTemplate stages
4. Combat kill bonus XP (enrich `entityDeath` with attackerId)

### Pipeline

```bash
npm run import:tuxemon
npm run sync:creatures
npm run migrate:campaign
npm run ensure:campaign
npm run seed:azure
npm run dev
```

---

## Mandatory Read Order

1. **This file**
2. `info/game/GAME_FOUNDATION_SYSTEMS.md`
3. `info/game/CLASS_SKILLS_SHINY.md`
4. `info/gameplay-bible/ALIGNMENT.md`
