# Dual-Grid & Hybrid Freeform Layer Map Authoring

Saints Studio provides a **hybrid dual-grid and freeform authoring pipeline** where discrete tile graphics, logic collision tags, continuous terrain splats, and 2.5D/3D billboard props are authored and synchronized simultaneously.

---

## 1. Layer Hierarchy

A `WorldMap` document stores synchronized discrete and continuous layers:

```
┌────────────────────────────────────────────────────────┐
│ 2.5D Props & Foliage (`freeformLayers.objects`)        │ Freestanding 3D billboards (Trees, Rocks, Decor)
├────────────────────────────────────────────────────────┤
│ Visual Details Layer (Roofs, Canopy, Overlays)         │ GID > 0
├────────────────────────────────────────────────────────┤
│ Terrain Splats (`freeformLayers.splats`)               │ Continuous sub-tile decal splats & blends
├────────────────────────────────────────────────────────┤
│ Visual Ground Layer (Grass, Paths, Water Shallows)     │ GID = 17 (Default Grass)
├────────────────────────────────────────────────────────┤
│ Logic Collision Layer (Layer -1 Grid Array)            │ Tag 0 to 6
└────────────────────────────────────────────────────────┘
```

1. **Visual Tile Layers (`tileLayers`):** Multi-layered 2D tile arrays storing Global Tile IDs (GIDs) mapped to sprite sheet atlas textures.
2. **Logic Layer (`grid` / Layer `-1`):** A flat integer array where each index corresponds to a cell $(r \times \text{Width} + c)$ containing runtime behavioral tags.
3. **Freeform Layers (`freeformLayers`):** Non-destructive continuous sub-tile layers for organic ground splats and 3D billboard prop entities with fractional coordinates $(X, Z)$.

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

Studio offers rich painting and selection tools bound to quick hotkeys:

- **Continuous Vector Selection:** Box, Circle/Ellipse, Lasso/Freehand, and Regular Polygon with mathematical curve retention on mouse release and dynamic rasterization adapters for discrete grid operations.
- **5 Multi-Shape Brushes:** Circle, Square, Diamond, Star, and Polygon shapes with configurable radius ($1\times 1$ to $7\times 7$), angle rotation ($0^\circ$ to $360^\circ$), and centered pivot $(0.5, 0.5)$.
- **Stamp / Brush (`B`):** Applies the active GID, seamless swatch, or logic tag under cursor.
- **Rectangle (`R`):** Drag-and-drop bounding box fill for walls, paths, and clearings.
- **Flood Fill (`F` / `G`):** Replaces all contiguous matching tiles with the selected GID or logic tag.
- **Sheet Slicer (`SheetSlicerPanel.tsx`):** Pixel-precision crop tool generating normalized UV offsets (`uOffset, vOffset, uScale, vScale`) for 1-click export to Terrain Swatches or the Prop Library.
- **Eyedropper (`I`):** Samples the visual GID or logic tag under the cursor directly into the active brush.
- **Magnet Snap (`M`):** Toggles grid-locking on or off for sub-tile precision placement.

---

## 4. Incremental Chunk Remeshing

To maintain 60 FPS in the editor while painting large maps ($128 \times 128$ or larger):
- The map is partitioned into $16 \times 16$ tile chunk meshes (`tileset_mesh_*`).
- Modifying a single cell flags only its containing chunk as dirty.
- Babylon.js rebuilds vertex indices only for the dirty chunk, eliminating whole-scene rebuild hitches.

> [!TIP]
> Use the Tile Selector (`TileSelectorPanel.tsx`) to switch seamlessly between Grid Paint, Terrain Splats, Props & Foliage, the Sheet Slicer, and Smart Auto-Border tools.
