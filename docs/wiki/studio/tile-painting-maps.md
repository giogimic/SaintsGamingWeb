# Dual-Grid Tile Painting & Map Authoring

Saints Studio provides a **dual-grid map authoring pipeline** where visual graphics layers and gameplay logic collision tags are authored and synchronized simultaneously.

---

## 1. Dual-Grid Architecture

A `WorldMap` document stores two synchronized grid structures:

```
┌────────────────────────────────────────────────────────┐
│ Visual Details Layer (Roofs, Canopy, Foliage)          │ GID > 0
├────────────────────────────────────────────────────────┤
│ Visual Ground Layer (Grass, Paths, Water Shallows)     │ GID = 17 (Default Grass)
├────────────────────────────────────────────────────────┤
│ Logic Collision Layer (Layer -1 Grid Array)            │ Tag 0 to 6
└────────────────────────────────────────────────────────┘
```

1. **Visual Layers (`tileLayers`):** Multi-layered 2D tile arrays storing Global Tile IDs (GIDs) mapped to sprite sheet atlas textures.
2. **Logic Layer (`grid` / Layer `-1`):** A flat integer array where each index corresponds to a cell $(r \times \text{Width} + c)$ containing runtime behavioral tags.

---

## 2. Logic Tag Matrix (Layer -1)

Logic tags define functional tile properties at runtime:

| Tag ID | Name | Behavior |
| :--- | :--- | :--- |
| **`0`** | **Clear / Walkable** | Normal passable terrain with no movement constraints. |
| **`1`** | **Solid / Wall** | Impassable barrier; blocks character movement and line-of-sight. |
| **`2`** | **Water** | Impassable unless riding an aquatic creature or swimming. |
| **`3`** | **Warp Gate** | Triggers instant teleportation to a target map coordinate $(X, Y)$. |
| **`4`** | **Encounter Grass** | Walking steps roll random wild creature battle encounters. |
| **`5`** | **Safe Zone** | Disables PvP player attacks and monster aggro behaviors. |
| **`6`** | **Hazard / Damage** | Applies periodic environmental damage ticks (e.g. lava, spikes). |

---

## 3. Painting Tools & Workflow

Studio offers four specialized painting tools bound to quick hotkeys:

- **Stamp / Brush (`B`):** Applies the active GID or Logic Tag to the cell under the cursor. Brush radius can be expanded up to $7\times 7$ tiles using `[` and `]`.
- **Rectangle (`R`):** Click and drag to create rectangular fills for walls, paths, and clearings.
- **Flood Fill (`G`):** Replaces all contiguous matching tiles with the selected GID or logic tag.
- **Eyedropper (`I`):** Samples the visual GID or logic tag under the cursor directly into the active brush.

---

## 4. Incremental Chunk Remeshing

To maintain 60 FPS in the editor while painting large maps ($128 \times 128$ or larger):
- The map is partitioned into $16 \times 16$ tile chunk meshes (`tileset_mesh_*`).
- Modifying a single cell flags only its containing chunk as dirty.
- Babylon.js rebuilds vertex indices only for the dirty chunk, eliminating whole-scene rebuild hitches.

> [!TIP]
> Use the Tile Selector (`TilesetPicker.tsx`) to switch between ground, architectural, and nature sprite sheets without losing your active layer selection.
