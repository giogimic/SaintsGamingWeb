# 💰 Economy, Items & Loot Systems

This document covers item schemas, equipment configurations, gathering resources, crafting tables, and the in-game economy.

---

## 1. Item Database Schema (`src/shared/game/items.ts`)

Every item in Saints Gaming is identified by a unique slug and contains metadata:
- **`id` / `slug`**: Unique string identifier (e.g. `bronze_sword`, `celestial_ore`).
- **`name` / `description`**: Display metadata for tooltips.
- **`type`**: `weapon`, `armor`, `tool`, `consumable`, `material`, `quest`, `cosmetic`, `currency`.
- **`slot`**: `head`, `cape`, `neck`, `body`, `legs`, `hands`, `feet`, `mainhand`, `offhand`, `ring`, `relic`.
- **`reqSkill` & `reqLevel`**: Level requirements to equip or use the item.
- **`stats`**: Flat modifiers (`attackBonus`, `strengthBonus`, `defenceBonus`, `hpBonus`, `magicBonus`).
- **`value`**: Base gold price for shops and high alchemy values.

---

## 2. Equipment Slots & Armor Tiers

### Melee / Metal Tier Progression
1. **Bronze (Lv 1)**
2. **Iron (Lv 10)**
3. **Steel (Lv 20)**
4. **Mithril (Lv 30)**
5. **Adamant (Lv 40)**
6. **Rune (Lv 50)**
7. **Dragon (Lv 60)**
8. **Masterwork Alloy (Lv 80)**
9. **Celestial / Singularity (Lv 99)**

Similar tier progressions exist for **Ranged** (Leather → Dragonhide → Celestial Stalkers) and **Magic** (Apprentice → Mystic → Zarosian → Archmage Singularity).

---

## 3. Gathering Nodes & Crafting Matrices

- **Mining:** Rocks contain finite resource charges that deplete upon harvest and respawn on a configurable timer.
- **Woodcutting:** Trees yield logs and experience, leaving behind a temporary stump mesh.
- **Smithing & Forging:** Bars smelted at furnaces can be hammered at anvils to produce tools, weapons, and heavy plate armor.
- **Cooking & Alchemy:** Raw meats and herbs combine to produce recovery items and temporary combat stimulants.

---

## 4. Loot Tables & Drop Weights (`lootRefs.ts`)

Monsters, resource nodes, and treasure chests reference structured loot tables:
- **Drop Tables:** Feature guaranteed drops (e.g. bones/ashes), standard common drops, uncommon equipment, rare drops, and very rare Grandmaster relics.
- **Dynamic Weight Calculation:** Rolls an RNG seed against cumulative table weights.
- **Loot Manager API (`/api/loot/tables`):** Accessible via Studio for live tweaking of drop rates without server rebuilds.
