# 📚 Catalogs & Definition Editors in Studio

Catalog Mode in Saints Studio provides integrated authoring tools for global game definitions. Changes made here persist to the project data files and database.

---

## 1. Creature Definition Editor (`CreatureDefEditorPanel.tsx`)

Author and tune all creature species:
- **Base Attributes:** Base HP, Attack, Defense, Speed, and Special stats.
- **Elemental Typings:** Primary and secondary types (Fire, Water, Nature, Electric, Shadow, Divine).
- **Move Pool:** Level-up learnsets, TM compatibility, and signature abilities.
- **Evolution Paths:** Trigger requirements (level threshold, evolution stones, trade holding items).
- **Sprites & Animation Frames:** Front/back combat battlers and 4-directional overworld sprites.

---

## 2. Item & Loot Manager (`ItemEditorPanel.tsx`, `LootManagerPanel.tsx`)

- **Item Editor:** Define item IDs, names, icons, equipment slots, stat modifiers, and skill level requirements.
- **Loot Table Manager:** Construct drop weight trees, guaranteed drop slots, and rare drop chance tables (`/api/loot/tables`) with live simulation testing.

---

## 3. Class & Starter Hero Editor (`StarterHeroEditorPanel.tsx`, `ClassEditorPanel.tsx`)

- **Starter Hero Configurations:** Design starter character presets with previewable gear, customizable starter creatures, and initial inventory bundles.
- **Archetype Generator:** Generate balanced starting archetypes (Warrior, Mage, Ranger, Paladin, Necromancer) with automatic skill delta distributions.

---

## 4. Quest & Dialogue Editor (`QuestEditorPanel.tsx`, `DialogueEditorPanel.tsx`)

- **Dialogue Tree Node Graph:** Visual branching conversation nodes with player dialogue responses, quest acceptance triggers, and conditional speech branches (e.g. *Has completed Quest X*).
- **Quest Log Designer:** Multi-stage quest chains with objectives (Kill $N$ monsters, Gather $X$ items, Talk to NPC), reward XP, and gold/item payouts.
