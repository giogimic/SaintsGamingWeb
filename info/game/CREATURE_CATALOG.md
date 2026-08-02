# Creature Catalog (Studio-editable)

**Mirrors Starter Heroes:** add creatures without code changes once seeded.

## Where to edit

| Layer | Path |
| :--- | :--- |
| Seed / offline fallback | `src/shared/game/creatureCatalog.ts` → `FALLBACK_CREATURE_DEFS` |
| Database | Prisma `CreatureDef` |
| Studio UI | `/studio` → Creatures dock → **Creature Catalog** panel |
| Server actions | `app/actions/creature-defs.ts` |
| Gameplay resolve | `src/server/creatureDefs.ts` |

## Fields (easy add checklist)

- **slug** / **name** / **dexNumber**
- **typePrimary** + **typeSecondary** (`Solar` `Hydro` `Bio` `Volt` `Geo` `Cryo` `Aero` `Cyber` `None`)
- **spriteOverworld** / **spriteBattle** / **spriteBack** (asset picker)
- **Stats:** baseHp, physicalPower/Defense, abilityPower/Defense, combatTempo, catchRate, starterLevel
- **passives[]:** id, name, description, `isDefault` (default + potential pool)
- **worldSkillName** / **worldSkillDescription**
- **abilities[]** TB openers
- **isStarter** / **isWildSpawn** / **isActive** / flavor / tag
- **Shiny:** `shinyEnabled`, `shinyUseGlobalChance`, `shinyChancePercent`, optional `shinySpriteOverworld` / `shinySpriteBattle` / `shinySpriteBack` (empty = default look). Global % lives on GameConfig / Studio Classes panel.

See also: [`CLASS_SKILLS_SHINY.md`](./CLASS_SKILLS_SHINY.md)

## Seed starters

1. Solar — `agnite` (Pyre Drake)  
2. Bio — `budaye` (Thorn Bud)  
3. Hydro — `dollfin` (Current Fin)  
4. Wild Geo — `rockitten`

Studio → **Seed** button upserts missing rows from the fallback catalog.
