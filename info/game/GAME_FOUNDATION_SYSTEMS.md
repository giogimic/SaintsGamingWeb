# Game Foundation Systems — Progress Log

**Branch:** `giogimic/game-foundation-systems-fae4`  
**PR:** https://github.com/giogimic/SaintsGamingWeb/pull/4  
**Updated:** 2026-08-02 (path continuity)

## Choices

- Combat skill typings level independently; gathering/artisan stay
- Phase 1 editors/classes/shinies first; Tuxemon story as playtest bed

## Done

### Phase 1–2
- [x] Classes, shinies, Tuxemon import, campaign maps, Spyder Tamer → AZURE_TOWN

### Spyder on-ramp
- [x] NPCs + 4-quest chain (welcome → townsfolk → capture → Cotton)
- [x] TALK / CLAIM / kill XP wiring
- [x] **Gates Azure ↔ Spyder Route 1 ↔ Cotton** + tall grass + yaml-ish encounters
- [x] Gate normalize (`mapGates.ts`) + lobby campaign allowlist
- [x] Film grant on Guide accept
- [x] Smoke: `info/game/SPYDER_SMOKE.md`

## Pipeline

```bash
npm run migrate:campaign && npm run ensure:campaign
npm run seed:campaign-npcs
npm run dev
```

## Remaining

- Human smoke of full path
- State-aware Guide dialogue
- Deeper Spyder mission graph / TMX NPC densify
