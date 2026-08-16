# 👾 Entities, Spawners & NPCs in Studio

Populate Mode (`Populate`) in Saints Studio provides full control over game entities, including non-player characters (NPCs), monster spawners, resource gathering nodes, and interactive map objects.

---

## 1. Placing & Configuring NPCs (`EntityEditorPanel.tsx`)

NPCs can be placed on any map coordinate:
- **Sprite Selection:** Choose from LPC sprite bases, hair styles, outfits, or custom sprite sheets.
- **Facing Direction:** North, South, East, West default orientations.
- **Wander Radius:** Set patrol boundaries ($0$ = stationary, $>0$ = autonomous roaming within $N$ tiles).
- **Interaction Behaviors:**
  - **Dialogue Trigger:** Links to a branching dialogue tree ID.
  - **Merchant Shop:** Opens a shop inventory (`shopCatalog.ts`) for buying/selling items.
  - **Quest Giver:** Offers new quests or checks completion conditions.
  - **Trainer Battle:** Triggers a Keeper creature battle upon interaction or line-of-sight.

---

## 2. Monster Spawners (`MonsterSpawnerPanel.tsx`)

Spawners govern overworld enemy populations:
- **Encounter Tables:** Define which creature IDs can spawn and their relative weight probabilities.
- **Level Range:** Minimum and maximum level roll (e.g. Lv 12–15).
- **Max Alive Count:** Concurrency limit for active creatures within the spawner's zone.
- **Respawn Delay:** Timer in seconds before a defeated monster respawns.
- **Aggro Range:** Distance in tiles before roaming monsters target nearby players.

---

## 3. Interactive Logic Components (`PropertiesPanel.tsx`)

Map cells can be augmented with custom components:
- **`WarpComponent`**: Target map ID, target $X/Y$, and optional entrance transition animation.
- **`DoorComponent`**: Requires specific keys, quest states, or skill levels to pass.
- **`ChestComponent`**: Opens one-time or recurring loot containers referencing loot tables.
- **`TriggerComponent`**: Executes custom scripts when stepped on or activated via `E` / touch interact.
