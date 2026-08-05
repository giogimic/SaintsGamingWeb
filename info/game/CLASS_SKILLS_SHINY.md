# Classes, Combat Skills & Shinies

**Updated:** 2026-08-02  
**Studio:** Classes dock Â· Creatures panel Â· GameConfig global shiny

## Classes (shared base + deltas)

| Class ID | Role |
| :--- | :--- |
| `WARRIOR` | +Attack / Strength / HP; âˆ’Agility |
| `MAGE` | +Intelligence / Wisdom; âˆ’Defence / HP |
| `THIEF` | +Agility / Perception / Attack; âˆ’Defence |
| `RANGER` | +Ranged / Agility / Perception; âˆ’Defence |
| `PRIEST` | +Wisdom / Intelligence / HP; âˆ’Attack / Strength |

- Shared base: `SHARED_BASE_STATS` in `src/shared/game/classCatalog.ts`
- Skills are **not** class-locked â€” deltas only change starting levels
- Persist via Studio â†’ **Classes** â†’ Seed / Save (`app/actions/character-classes.ts`)

## Combat skill typings

`attack`, `strength`, `defence`, `hitpoints`, `ranged`, `agility`, `perception`, `wisdom`, `intelligence`

- Curve: `Level = floor(sqrt(XP/50)) + 1`, max 50
- Gathering / artisan matrix unchanged (woodcutting, mining, crafting, â€¦)

## Shinies

Per `CreatureDef`:

- `shinyEnabled`, `shinyUseGlobalChance`, `shinyChancePercent`
- Optional `shinySprite*` (empty â†’ default look)
- Instance: `PlayerCreature.isShiny` + `tagsJson` includes `shiny`

Global: `GameConfig.globalShinyChancePercent` (Studio Classes panel)

## Tuxemon bridge

The old `scripts/import-tuxemon-*` / `scripts/sync-tuxemon-*` scripts were removed from this repo.

For shiny sprite testing, ensure the campaign and creature seed data exists. `server.ts` boot runs `bootstrapDemoContent()` which upserts fallback `CreatureDef` rows.

