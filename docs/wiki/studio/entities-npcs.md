# Entities, NPCs & Spawners in Studio

In **Populate Mode** (`Populate`), creators place interactive characters, monster spawners, resource gathering nodes, and interactive map triggers directly into the game world.

---

## 1. NPC Placement & Configuration (`EntityEditorPanel.tsx`)

Placing an NPC establishes an entity instance on specific map coordinates $(X, Y)$:

```
┌──────────────────────────────────────────────────────────┐
│                   NPC Inspector Panel                    │
├──────────────────────────────────────────────────────────┤
│ ID: npc_blacksmith_01        Name: Master Forgemaster    │
│ Sprite: npc_dwarf_smith      Facing: South (0, 1)        │
│ Wander Radius: 3 tiles       Speed: 1.2 tiles/sec        │
│ Interaction: Merchant Shop   Catalog: shop_iron_weapons  │
└──────────────────────────────────────────────────────────┘
```

- **Sprite & Facing:** Assigns 4-directional modular sprite sheets and initial facing direction (North, South, East, West).
- **Wander Radius:** Defines the patrol boundary ($0 = \text{stationary}$, $>0 = \text{autonomous wander within } N \text{ tiles}$).

---

## 2. NPC Interaction Types

Every NPC supports one or more interaction behaviors:

| Interaction Type | Functionality | Configuration Parameters |
| :--- | :--- | :--- |
| **Dialogue** | Initiates a branching conversation tree. | `dialogueTreeId`, `defaultGreeting` |
| **Merchant** | Opens an inventory shop window. | `shopCatalogId`, `buybackDiscount`, `currencyType` |
| **Quest Giver** | Offers quests or evaluates completion. | `questId`, `dialogStart`, `dialogComplete` |
| **Trainer Battle**| Triggers turn-based Saints Buddy Battle. | `creatureTeam`, `rewardXP`, `rewardGold` |

---

## 3. Monster Spawners (`MonsterSpawnerPanel.tsx`)

Spawners govern overworld enemy populations and wild creature density:
- **Encounter Tables:** Define allowed creature IDs with relative drop weights (e.g. $70\%$ Forest Wolf, $30\%$ Dire Bear).
- **Level Range:** Sets minimum and maximum level bounds ($L_{\text{min}} \le \text{Level} \le L_{\text{max}}$).
- **Max Alive Count:** Restricts active concurrent monsters within the spawner zone.
- **Respawn Delay:** Milliseconds to wait after an entity is defeated before spawning a replacement.
- **Aggro Range:** Proximity radius in tiles before hostile mobs initiate chase behaviors.

---

## 4. Interactive Logic Components (`PropertiesPanel.tsx`)

Map cells can be augmented with specialized interaction components:

- **`WarpComponent`:** Defines `targetMapId`, `targetX`, and `targetY` coordinates for map portals.
- **`DoorComponent`:** Restricts passage until a player possesses a specific key item, quest state, or skill level.
- **`ChestComponent`:** Spawns interactive loot chests linking to loot tables with one-time or daily cooldown rules.
- **`TriggerComponent`:** Fires custom client-side script events when stepped on or activated.
