# 🎨 Dual-Grid Tile Painting & Map Building

Saints Studio features a **dual-grid map authoring pipeline**: visual graphics and functional gameplay logic are stored and edited together.

---

## 1. Dual-Grid Architecture

A map document (`WorldMap`) consists of two primary grid layers:
1. **Visual Layers (`tileLayers`):** Multi-layered visual tiles (Ground, Details, Overhead) referenced by Global Tile IDs (GIDs) mapped to sprite sheet tilesets.
2. **Logic Layer (`grid` / Layer `-1`):** A single integer array where each cell contains a logic tag ID defining collision, warps, water, ice, safe zones, or interaction components.

```
┌────────────────────────────────────────┐
│ Visual Details Layer (Trees, Roofs)    │ GID > 0
├────────────────────────────────────────┤
│ Visual Ground Layer (Grass, Paths)     │ GID = 17 (Default Solid Grass)
├────────────────────────────────────────┤
│ Logic Collision Layer (Layer -1)       │ Solid=1, Water=2, Warp=3, etc.
└────────────────────────────────────────┘
```

---

## 2. Logic Tag Palette (`LogicTagPalette.tsx`)

Logic tags define functional tile properties at runtime:
- **`0: Clear / Walkable`**: Passable ground with no special behavior.
- **`1: Solid / Collision`**: Blocks character and projectile movement.
- **`2: Water`**: Impassable unless swimming/surfing or using water familiars.
- **`3: Warp Gate`**: Teleports player to target map and coordinates ($X/Y$).
- **`4: Tall Grass / Encounter Zone`**: Steps trigger wild creature encounter rolls.
- **`5: Safe Zone / Town`**: Disables PvP and hostile monster aggro.
- **`6: Damage / Hazard`**: Periodically ticks damage or applies environmental status effects (lava, spikes, poison gas).

---

## 3. Painting Tools & Features

- **Stamp / Brush (`B`):** Paints single or multi-cell patches based on active brush radius.
- **Rectangle (`R`):** Drag-and-drop bounding box fill for large rooms and fields.
- **Flood Fill (`G`):** Replaces all connected identical tiles/tags.
- **Eyedropper (`I`):** Click any cell in the viewport to immediately select its GID or Logic Tag.
- **Tile Selector Panel (`TileSelectorPanel.tsx` / `TilesetPicker.tsx`):** Standalone dockable window for choosing tiles from loaded sprite atlas sheets. Features dynamic window scaling, custom grid slicing (W x H), quick presets, and context-aware menus (Logic tags are only shown when in Logic Layer).
- **Incremental Remeshing:** When edits are painted, only the affected chunk mesh (`tileset_mesh_*`) rebuilds in Babylon.js, maintaining real-time 60 FPS performance during painting.
