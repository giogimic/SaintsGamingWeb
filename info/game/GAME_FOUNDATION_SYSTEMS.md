# Game Foundation Systems — Progress Log

**Branch:** `giogimic/game-foundation-systems-fae4`  
**PR:** https://github.com/giogimic/SaintsGamingWeb/pull/4  
**Updated:** 2026-08-02 (Spyder NPC path + kill XP)

## Choices

- Combat skill typings level independently; gathering/artisan stay
- Phase 1 editors/classes/shinies first; Tuxemon story as playtest bed

## Done

### Phase 1
- [x] Schema + shared catalogs (classes, skill typings, shiny)
- [x] Studio Classes dock, creature shiny, creator 5 classes
- [x] Encounter shiny roll + capture persist + battle tag

### Phase 2
- [x] Tuxemon import → CreatureTemplate (411)
- [x] Sync → CreatureDef; 235 campaign maps
- [x] Spyder Tamer → AZURE_TOWN

### Continue / Spyder path
- [x] Combat XP (RT + damage taken + TB + **kill blow**)
- [x] Weighted encounter selection
- [x] NPC Studio persist
- [x] Demo Vance/wilds only on DEMO_SANDBOX
- [x] Campaign NPC seeds + Spyder quest chain (welcome → townsfolk → first capture)
- [x] Quest wiring: TALK on NPC interact, CLAIM on capture
- [x] TMX import script (optional external maps)

## Pipeline

```bash
npm run import:tuxemon && npm run sync:creatures
npm run migrate:campaign && npm run ensure:campaign
npm run seed:campaign-npcs
npm run dev
```

## Remaining

- Human smoke DEMO + Azure Guide path
- Deeper Spyder mission graph
- TMX bulk NPC import when checkout available
