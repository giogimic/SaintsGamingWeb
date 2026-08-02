# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

---

## Current Focus

**Game Foundation Systems (PR #4) — classes / skills / shinies / Tuxemon bridge**

Progress log: [`logs/GAME_FOUNDATION_SYSTEMS.md`](../logs/GAME_FOUNDATION_SYSTEMS.md)  
Design notes: [`info/game/CLASS_SKILLS_SHINY.md`](./game/CLASS_SKILLS_SHINY.md)

### Shipped on branch `giogimic/game-foundation-systems-fae4`

- Five playable classes (shared base + deltas); Studio Classes dock persists to DB
- Combat skill typings (Attack…Intelligence) + gathering matrix retained
- Creature shinies (global + per-species, optional sprites, capture persist)
- Tuxemon import fixed → 411 `CreatureTemplate`; sync → `CreatureDef`
- 235 campaign maps in `WorldMap` (`gameId: tuxemon`); Spyder Tamer hero → `AZURE_TOWN`

### Suggested next

1. Human smoke: Studio Seed Classes/Creatures → create each class → tall grass shiny (raise global %)
2. Pick Spyder Tamer hero → walk AZURE_TOWN; file gaps in NPC/mission fidelity
3. Wire mission/dialogue packs from `tuxemon-db/mission` + `npc` (Npc editor still stub)
4. Combat XP grants into combat typings; weighted encounter polish

### Pipeline

```bash
npm run import:tuxemon
npm run sync:creatures
npm run migrate:campaign
npm run ensure:campaign
npm run dev
```

Smoke checklist (demo): [`info/game/DEMO_SMOKE.md`](./game/DEMO_SMOKE.md)

Bible: [`info/gameplay-bible/README.md`](./gameplay-bible/README.md)

---

## Mandatory Read Order

1. **This file**
2. `logs/GAME_FOUNDATION_SYSTEMS.md`
3. `info/game/CLASS_SKILLS_SHINY.md`
4. `info/gameplay-bible/ALIGNMENT.md`
