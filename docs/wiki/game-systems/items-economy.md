# Items, Equipment Tiers & Economy

This document details the item definitions, equipment tier progression, resource node lifecycles, and dynamic loot drop weight systems in Saints Gaming.

---

## 1. Item Data Schema & Properties

Every item is defined in `src/shared/game/items.ts` with typed metadata:

```typescript
export interface GameItem {
  id: string;              // e.g. "bronze_sword"
  slug: string;            // Canonical URI slug
  name: string;            // Display title
  description?: string;    // Tooltip narrative
  type: 'weapon' | 'armor' | 'tool' | 'consumable' | 'material' | 'currency';
  slot?: 'head' | 'cape' | 'neck' | 'body' | 'legs' | 'hands' | 'feet' | 'mainhand' | 'offhand';
  reqSkill?: string;       // e.g. "attack", "defence", "mining"
  reqLevel?: number;       // Level requirement (1-99)
  stats?: {
    attackBonus?: number;
    strengthBonus?: number;
    defenceBonus?: number;
    magicBonus?: number;
    hpBonus?: number;
  };
  value: number;           // Base gold and High Alchemy coin value
}
```

---

## 2. Equipment Progression Tiers

Equipment tiers progress across 9 primary tiers spanning Levels 1 to 99:

| Tier | Level Req | Metal / Melee | Ranged Leather | Magic Vestments |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Lv 1 | Bronze | Rawhide Leather | Novice Robes |
| **2** | Lv 10 | Iron | Hardened Leather | Apprentice Robes |
| **3** | Lv 20 | Steel | Studded Leather | Mystic Vestments |
| **4** | Lv 30 | Mithril | Green Dragonhide | Astral Vestments |
| **5** | Lv 40 | Adamant | Blue Dragonhide | Zarosian Vestments |
| **6** | Lv 50 | Rune | Red Dragonhide | Archmage Robes |
| **7** | Lv 60 | Dragon | Black Dragonhide | Elder Void Robes |
| **8** | Lv 80 | Masterwork | Royal Stalker Hide | Celestial Silk |
| **9** | Lv 99 | Celestial | Singularity Stalker | Singularity Raiment |

---

## 3. Gathering Nodes & Crafting Matrices

Resource extraction is linked to specific map objects and artisan stations:
- **Mining Nodes:** Rocks contain finite charge counts ($3\text{--}8$ ores). Upon depletion, the node turns into a depleted rock mesh and starts a respawn timer ($15\text{--}120\text{s}$).
- **Woodcutting Trees:** Trees grant logs and experience per chop tick, converting into a temporary tree stump upon falling.
- **Smithing Furnaces & Anvils:** Smelt ores into metal bars at furnaces, then hammer bars with a hammer tool at anvils to craft armor and weapons.
- **Cooking Fires & Ranges:** Raw fish and meats combine with seasoning to produce restorative foods that restore HP in or out of combat.

---

## 4. Dynamic Loot Tables & Drop Rates

Loot tables (`lootRefs.ts`, `/api/loot/tables`) use cumulative weighted rolls:

$$\text{Drop Chance}(i) = \frac{\text{Weight}_i}{\sum_{j=1}^{N} \text{Weight}_j}$$

```
[Defeated Enemy] ──► Roll Guaranteed Drops (Bones/Coins)
                 ──► Roll Primary Loot Table (RNG Seed 1..TotalWeight)
                 ──► Roll Rare Drop Table (1/512 Capstone / Relic Check)
```

> [!TIP]
> The Loot Manager in Studio (`LootManagerPanel.tsx`) allows creators to simulate 10,000 drop rolls in real-time to verify drop balance before deploying changes to live shards.
