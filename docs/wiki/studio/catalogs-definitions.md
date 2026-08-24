# Catalogs & Game Definition Editors

**Catalog Mode** (`Catalog`) in Saints Studio provides full-screen definition editors for tuning global game data without writing boilerplate code or manual JSON.

---

## 1. Creature Definition Editor (`CreatureDefEditorPanel.tsx`)

Authors species blueprints for companion beasts and overworld monsters:

```
┌──────────────────────────────────────────────────────────┐
│ Species: Ignifox [ID: beast_ignifox]                     │
├──────────────────────────────────────────────────────────┤
│ Elements: [Fire] / [None]       Catch Rate: 45 / 255     │
│ Base Stats: HP: 65 | ATK: 75 | DEF: 50 | SPD: 90 | SPC: 80│
│ Evolution: Ignifox ──► Infernofox (Level 28)             │
│ Move Learnset:                                           │
│  • Lv 1: Scratch (Normal)      • Lv 7: Ember (Fire)      │
│  • Lv 15: Flame Wheel (Fire)   • Lv 28: Fire Blast (Fire)│
└──────────────────────────────────────────────────────────┘
```

- **Base Attributes:** Tunes HP, Attack, Defense, Speed, and Special power points.
- **Elemental Typings:** Sets primary and optional secondary elemental typings.
- **Evolution Paths:** Configures level triggers, evolution stone requirements, or trade items.

---

## 2. Item & Loot Table Managers (`ItemEditorPanel.tsx`, `LootManagerPanel.tsx`)

- **Item Editor:** Manage equipment slots (`head`, `body`, `mainhand`), stat bonuses (`strengthBonus`, `hpBonus`), required skill proficiencies, and gold values.
- **Loot Table Manager:** Construct multi-tier weighted drop pools. Supports guaranteed drops, common tiers, and $1/512$ ultra-rare relic drops.

```typescript
// Loot Table Definition Example
export const GoblinLootTable = {
  id: 'loot_goblin_warrior',
  guaranteed: [{ itemId: 'bones', quantity: 1 }],
  rolls: [
    { itemId: 'coins', weight: 60, minQty: 5, maxQty: 25 },
    { itemId: 'bronze_dagger', weight: 25, minQty: 1, maxQty: 1 },
    { itemId: 'ruby_uncut', weight: 2, minQty: 1, maxQty: 1 }
  ]
};
```

---

## 3. Class & Starter Hero Editor (`StarterHeroEditorPanel.tsx`)

- **Starter Archetypes:** Create and balance starting character templates (Warrior, Mage, Ranger, Paladin, Necromancer).
- **Starting Bundles:** Package beginner weapons, armor pieces, potions, and a starter companion beast.

---

## 4. Quest & Dialogue Node Graph (`QuestEditorPanel.tsx`, `DialogueEditorPanel.tsx`)

- **Dialogue Trees:** Visual node graph connecting NPC dialog prompts to player response choices, conditional flags (e.g. *Has item X*), and script events.
- **Quest Chains:** Configure multi-stage objectives (Kill $N$ monsters, Gather $X$ materials, Deliver item), dialogue checkpoints, and rewards (XP, Gold, Items).
