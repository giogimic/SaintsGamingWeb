# Game Foundation Systems — Progress Log

**Branch:** `giogimic/game-foundation-systems-fae4`  
**Started:** 2026-08-02  
**PR:** https://github.com/giogimic/SaintsGamingWeb/pull/4

## Choices

- Combat skill typings level independently; gathering/artisan stay
- Phase 1 first (editors + classes + shinies), then Tuxemon story bridge

## Done

### Phase 1
- [x] Schema: CreatureDef shiny fields, PlayerCreature.isShiny/tagsJson, CharacterClass deltas/classId, GameConfig.globalShinyChancePercent
- [x] Shared: `classCatalog`, `skillTypings`, `shiny`, mappers
- [x] Actions: `character-classes.ts`, creature shiny persist, SkillManager combat curve
- [x] Studio: Classes dock, creature shiny UI, global shiny %, NPC stub banner, gold styling
- [x] Creator: 5 classes from DB (WARRIOR/MAGE/THIEF/RANGER/PRIEST), shared base + deltas
- [x] Runtime: encounter shiny roll + capture persist + battle shiny tag
- [x] Tests: `shiny.test.ts`, `skillTypings.test.ts` (13 tests green with store)

### Phase 2
- [x] Fixed `scripts/import-tuxemon-data.ts` → CreatureTemplate / AbilityDictionary / etc.
- [x] Ran import: 411 species, 274 techniques, 31 encounters
- [x] `sync-tuxemon-to-creature-defs.ts` bridge with Saints element map (skips curated 4)
- [x] Migrated 235 campaign maps; patched empty encounters
- [x] EncounterManager map/EncounterTable weighted pick
- [x] Spyder Tamer hero → `AZURE_TOWN` starting map wired in creator
- [x] npm scripts: `import:tuxemon`, `sync:creatures`, `migrate:campaign`, `ensure:campaign`
- [x] Docs: `info/game/CLASS_SKILLS_SHINY.md`, CREATURE_CATALOG shiny notes, CONTINUE.md

## Verify locally

```bash
npm run setup
npx tsx scripts/import-tuxemon-data.ts
npx tsx scripts/sync-tuxemon-to-creature-defs.ts --wild
npx tsx scripts/ensure-campaign-playable.ts
npm run dev
# Studio Ctrl+E → Classes Seed, Creatures shiny, create 5-class heroes
```

## Remaining / follow-ups

- Full Spyder mission/NPC dialogue fidelity (Npc editor still stub)
- Weighted rates polish + combat XP grants into typings
- Human smoke of DEMO_SMOKE + a campaign map warp
