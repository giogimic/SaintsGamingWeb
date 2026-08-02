# Classes, Combat Skills & Shinies

**Updated:** 2026-08-02  
**Studio:** Classes dock · Creatures panel · GameConfig global shiny

## Classes (shared base + deltas)

| Class ID | Role |
| :--- | :--- |
| `WARRIOR` | +Attack / Strength / HP; −Agility |
| `MAGE` | +Intelligence / Wisdom; −Defence / HP |
| `THIEF` | +Agility / Perception / Attack; −Defence |
| `RANGER` | +Ranged / Agility / Perception; −Defence |
| `PRIEST` | +Wisdom / Intelligence / HP; −Attack / Strength |

- Shared base: `SHARED_BASE_STATS` in `src/shared/game/classCatalog.ts`
- Skills are **not** class-locked — deltas only change starting levels
- Persist via Studio → **Classes** → Seed / Save (`app/actions/character-classes.ts`)

## Combat skill typings

`attack`, `strength`, `defence`, `hitpoints`, `ranged`, `agility`, `perception`, `wisdom`, `intelligence`

- Curve: `Level = floor(sqrt(XP/50)) + 1`, max 50
- Gathering / artisan matrix unchanged (woodcutting, mining, crafting, …)

## Shinies

Per `CreatureDef`:

- `shinyEnabled`, `shinyUseGlobalChance`, `shinyChancePercent`
- Optional `shinySprite*` (empty → default look)
- Instance: `PlayerCreature.isShiny` + `tagsJson` includes `shiny`

Global: `GameConfig.globalShinyChancePercent` (Studio Classes panel)

## Tuxemon bridge

```bash
npx tsx scripts/import-tuxemon-data.ts
npx tsx scripts/sync-tuxemon-to-creature-defs.ts --wild
npx tsx scripts/ensure-campaign-playable.ts
```
