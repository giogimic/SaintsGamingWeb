# Creator Guide: Designing Custom Character Archetypes

This tutorial guides creators through building custom starter character presets, configuring modular sprite composites, balancing 27-skill proficiency deltas, and packaging beginner equipment.

---

## 1. Character Archetype Overview

In Saints Gaming, all characters can ultimately train all 27 skills to the max level cap of 2,232. Starting archetypes provide initial thematic flavor, starter equipment, and baseline skill bonuses without locking out any future progression paths.

---

## 2. Modular Sprite Customization & Layering

When creating an archetype in the Starter Hero Editor (`StarterHeroEditorPanel.tsx`), define the visual composition:

```
Base Body ──► Hair (Style & Tint) ──► Outfit / Platebody ──► Mainhand Weapon
```

1. **Base Body:** Select standard gender / skin tone variant (e.g. `body_light_male`).
2. **Hair & Details:** Choose hairstyle slug and hex tint (e.g. `hair_messy_brown`).
3. **Apparel:** Equip beginner class armor (e.g. `novice_robe_top`, `leather_jerkin`, `bronze_chest`).
4. **Primary Weapon:** Assign an initial weapon mesh (e.g. `bronze_sword`, `shortbow`, `wooden_staff`).

---

## 3. Starting Class Skill Distributions

Archetypes allocate up to **20 bonus starting skill points** across the 27 skills:

| Archetype | Key Combat Skills | Key Artisan / Gathering | Support Proficiencies |
| :--- | :--- | :--- | :--- |
| **Warrior** | Attack: +5, Strength: +5, Defence: +4 | Mining: +2, Smithing: +2 | Prayer: +2 |
| **Mage** | Intelligence: +6, Wisdom: +4, Hitpoints: +2 | Herblore: +2, Runecrafting: +2 | Magic: +4 |
| **Ranger** | Ranged: +6, Agility: +4, Perception: +4 | Woodcutting: +2, Fletching: +2 | Hunter: +2 |
| **Paladin** | Defence: +5, Strength: +4, Hitpoints: +3 | Construction: +2, Cooking: +2 | Prayer: +4 |
| **Necromancer** | Intelligence: +5, Wisdom: +3, Hitpoints: +2 | Crafting: +2, Firemaking: +2 | Necromancy: +6 |

> [!NOTE]
> All unlisted skills default to Level 1 ($0\text{ XP}$). The maximum single starting skill cap is Level 10.

---

## 4. Authoring Starter Inventory Bundles

Define the starting package in `starterHeroData.ts` or Studio:

```typescript
export const WarriorStarterBundle = {
  classId: 'warrior',
  name: 'Vanguard Warrior',
  description: 'Frontline fighter resilient in close-quarters melee combat.',
  starterItems: [
    { itemId: 'bronze_sword', quantity: 1, equip: true },
    { itemId: 'bronze_shield', quantity: 1, equip: true },
    { itemId: 'cooked_meat', quantity: 5 },
    { itemId: 'bronze_pickaxe', quantity: 1 },
    { itemId: 'coins', quantity: 100 }
  ],
  starterCompanionId: 'beast_rockpup'
};
```

Creators can export the configuration directly to the database or embed it into a modpack package.
