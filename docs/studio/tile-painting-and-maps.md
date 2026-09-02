# 🎨 3D Voxel World Authoring & Studio Editing

Saints Studio features an authoritative **Greenfield 3D Voxel World Architecture**: volumetric geometry, material physics, logic tags, and entity instances are stored and edited in true 3D voxel space, while the game renders in an orthographic / 2.5D presentation.

---

## 1. Authoritative 3D Voxel World Architecture

The canonical world representation is structured hierarchically:

```
WORLD ATLAS
    ↓
MAP (`WorldMap`)
    ↓
VOXEL CHUNKS (16 × 16 × 32 cells, RLE-compressed)
    ↓
VOXEL CELLS (32-bit packed VoxelWords)
    ↓
MATERIAL + SHAPE + ORIENTATION + AO/TINT + PHYSICS + LOGIC
```

1. **Voxel World is the Source of Truth**: The world representation is volumetric 3D chunks of 32-bit compact voxel words (`VoxelWorld` / `VoxelWorldDocV3`).
2. **2.5D is Presentation**: The camera perspective (isometric 45°, top-down 90°), UI overlays, minimaps, and billboard sprites are presentation layers—**NOT** a second authoritative world representation.
3. **Unified Spatial Target Resolver (`VoxelTargetResolver`)**: All Studio editing interactions (`Brush`, `Eraser`, `Eyedropper`, `Fill`, `Select`, `Prefab`, `Prop`) route through a single authoritative spatial resolver that converts camera raycasts into exact 3D voxel coordinates `(wx, wy, wz)`, chunk coordinates, and hit face normals.
4. **Separation of Block Scale vs Material Texture**: Block world scale (e.g. 64px = 1 Babylon unit) defines physical geometry; palette material definitions determine visual appearance without dictating grid dimensions.
5. **Transactional Editing (`VoxelTransaction`)**: Edits are grouped into atomic transactions. Only dirty chunks rebuild via `meshDirtyVoxelChunks()`, maintaining 60 FPS without scene reloads.
6. **Operational Lifecycle**: `Save` (persist draft/editor content) $\neq$ `Publish` (create immutable version) $\neq$ `Deploy` (activate runtime version on Gateway).

---

## 2. 32-Bit Compact VoxelWord Bitpacking

Every voxel cell in the 3D world is stored as a high-efficiency 32-bit integer:

| Bits | Field | Description | Values |
| :--- | :--- | :--- | :--- |
| `0..7` (8 bits) | `materialId` | Visual terrain/block material | `0: Air`, `1: Gunmetal`, `2: Grass`, `3: Dirt`, `4: Stone`, `5: Water`, `6: Sand`, `7: Wood`, `8: Snow` |
| `8..12` (5 bits) | `shapeId` | Geometric mesh shape | `0: Air`, `1: Full Cube`, `2: Slope 45°`, `3: Slab Half`, `4: Stairs Straight`, `5: Corner Wedge` |
| `13..15` (3 bits) | `orientation` | Cardinal facing direction | `0: North`, `1: East`, `2: South`, `3: West` |
| `16..19` (4 bits) | `aoTint` | Baked ambient occlusion & tint | `0..15` |
| `20..23` (4 bits) | `physics` | Collision and movement rules | `0: Pass-Through`, `1: Solid Obstacle`, `2: Walkable Slope`, `3: Swimmable Fluid`, `4: Climbable` |
| `24..31` (8 bits) | `logic` | Interactive trigger components | `0: None`, `1: Warp Gate`, `2: Wild Encounter`, `3: Safe Zone`, `4: Hazard Damage`, `5: Spawn Point` |

---

## 3. Spatial Target Resolver (`VoxelTargetResolver.ts`)

When interacting with the 3D viewport, `resolveVoxelTarget` processes camera rays:
- **Normal-Snapped Hit Resolution**: Raycasts landing on chunk meshes (`voxel_chunk_*`) determine the dominant cardinal face normal (`±X, ±Y, ±Z`).
- **Targeted Solid Block**: Stepping inward along $-N \times 0.05$ yields $(wx, wy, wz)$ for erasure, eyedropper sampling, or direct replacement.
- **Adjacent Placement Block**: Stepping outward along $+N \times 0.05$ yields $(adjWx, adjWy, adjWz)$ for building on top or against side faces.
- **Analytical Foundation Raycast**: Rays passing through open air project to the base foundation plane ($Y = 0 \to wy = 16$), ensuring 100% reliable picking from any camera angle.

---

## 4. Studio Editing Tools & World-Space Workflow

- **Brush Tool (`B`):** Places 3D voxels with active `materialId`, `shapeId`, and `orientation`.
- **Eraser Tool (`E`):** Clears targeted voxels directly to `VOXEL_WORD_AIR` $(0)$.
- **Eyedropper Tool (`I`):** Samples exact material, shape, and orientation attributes from any clicked voxel.
- **Volumetric Flood Fill (`F` / `G`):** 3D BFS flood fill across contiguous matching voxel words.
- **3D Voxel Cursor**: Real-time gold/amber wireframe box with glowing edges highlights the targeted or adjacent voxel.
- **Live Voxel HUD**: Displays `Voxel [X: wx, Y: wy, Z: wz]` live in the bottom status bar.
