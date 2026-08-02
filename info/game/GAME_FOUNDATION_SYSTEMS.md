# Game Foundation Systems — Progress Log

**Branch:** `giogimic/game-foundation-systems-fae4`  
**PR:** https://github.com/giogimic/SaintsGamingWeb/pull/4  
**Updated:** 2026-08-02 (continue pass)

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

### Continue pass
- [x] Combat XP grants into typings (RT hit/utility + damage taken + TB summoning)
- [x] Weighted encounter selection helper
- [x] NPC Studio persist (`placeMapNpc`)
- [x] Azure Guide + `quest_azure_welcome` seed script
- [x] Demo Vance/wilds only on DEMO_SANDBOX
- [x] Tests: 21 passing (combatSkillXp, encounterWeights, shiny, skillTypings)

## Pipeline

```bash
npm run import:tuxemon && npm run sync:creatures
npm run migrate:campaign && npm run ensure:campaign
npm run seed:azure
npm run dev
```

## Remaining

- Kill-bonus XP (entityDeath + attackerId)
- Bulk TMX NPC placement import for campaign
- Deeper Spyder mission step graph → QuestTemplate
- Human smoke DEMO_SMOKE + Azure Guide talk
