# 🎨 Dual-Grid Tile Painting & Map Building

Saints Studio features a **dual-grid map authoring pipeline**: visual graphics and functional gameplay logic are stored and edited together.

---

## 1. Hybrid Grid & Freeform Layer Architecture

A map document (`WorldMap`) supports both discrete dual-grid layers and continuous freeform layers:
1. **Visual Tile Layers (`tileLayers`):** Multi-layered discrete tiles (Ground, Details, Overhead) referenced by Global Tile IDs (GIDs) mapped to sprite sheet tilesets.
2. **Logic Layer (`grid` / Layer `-1`):** A single integer array where each cell contains a logic tag ID defining collision, warps, water, ice, safe zones, or interaction components.
3. **Freeform Layers (`freeformLayers`):** Continuous sub-tile mathematical layers for organic terrain splats and 3D billboard props/foliage.
   - `splats`: Smooth ground decals with scatter distributions, opacity falloff, and subregion UV offsets.
   - `objects`: 2.5D/3D billboard entities (Props, Foliage) with continuous $(X, Y, Z)$ positions, custom scaling, jitter, and collision tags.

```
┌────────────────────────────────────────────────────────┐
│ 2.5D Props & Foliage (`freeformLayers.objects`)        │ Freestanding 3D billboards
├────────────────────────────────────────────────────────┤
│ Visual Details Layer (Trees, Roofs)                    │ GID > 0
├────────────────────────────────────────────────────────┤
│ Terrain Splats (`freeformLayers.splats`)               │ Continuous sub-tile texture blends
├────────────────────────────────────────────────────────┤
│ Visual Ground Layer (Grass, Paths)                     │ GID = 17 (Default Solid Grass)
├────────────────────────────────────────────────────────┤
│ Logic Collision Layer (Layer -1)                       │ Solid=1, Water=2, Warp=3, etc.
└────────────────────────────────────────────────────────┘
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

## 3. Painting & Authoring Suites

- **Continuous Selection Tools:** Supports Box, Circle, Lasso (Freehand), and Regular Polygon. Previews are rendered as smooth vector paths in WebGL (`setContinuousSelectionPreview`) and retain mathematical shape fidelity upon mouse release.
- **5 Multi-Shape Brushes:** Circle, Square, Diamond, Star, and Polygon brush footprints with dynamic radius scaling ($1\times 1$ to $7\times 7$) and angle rotation ($0^\circ$ to $360^\circ$).
- **Stamp / Brush (`B`):** Paints single or multi-cell patches centered on cursor $(0.5, 0.5)$ pivot.
- **Rectangle (`R`):** Drag-and-drop bounding box fill for large rooms and fields.
- **Flood Fill (`F` / `G`):** 4-way BFS flood fill algorithm supporting visual and logic layers with selection boundary clipping (`MAX_FILL_CELLS = 4096`).
- **Sheet Slicer & Precision Cutter (`SheetSlicerPanel.tsx`):** Pixel cutter for slicing custom tileset subregions with normalized UV coordinates (`uOffset, vOffset, uScale, vScale`) for 1-click export to Terrain or Props.
- **Eyedropper (`I`):** Click any cell in the viewport to immediately select its GID or Logic Tag.
- **Incremental Remeshing:** When visual tiles or splats are painted, only affected chunk meshes (`tileset_mesh_*` / `splat_mesh_*`) rebuild in Babylon.js, maintaining real-time 60 FPS performance during painting.
