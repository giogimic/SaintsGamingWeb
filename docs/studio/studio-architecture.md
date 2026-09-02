# 🖥️ Studio Architecture & Editor Modes

The **Saints Studio** (`src/web/components/the-lobby/editor/`) is a comprehensive web-based game development environment. It provides visual world building, definition catalogs, entity management, and instant playtesting.

---

## 1. Studio Architecture & State Management

Studio state is coordinated across dedicated stores, docking containers, and Babylon.js WebGL:
- **`StudioEditorShell.tsx`**: The main viewport, top menu bar, and docking container wrapping the Babylon.js canvas.
- **`editor-store.ts`**: Zustand store managing active tool selection, brush radius/shape, active layer, continuous selection geometry, history stack (undo/redo), and unsaved changes flags.
- **Continuous Geometry Pipeline (`continuousGeometry.ts`)**: Mathematical shapes (`circle`, `ellipse`, `rectangle`, `regularPolygon`, `polygon`, `freehand`) serve as the source of truth, dynamically rendered in WebGL via `setContinuousSelectionPreview` and rasterized downstream for discrete grid operations.
- **FlexLayout Dock Panels**: Draggable, dockable dark glass windows (`DraggablePanel.tsx`) allowing creators to arrange custom layouts.

---

## 2. Core Studio Dock Windows

Every dock is equipped with a `<WindowMenuBar>` application sub-menu ribbon:

| Dock Window | Component | Key Capabilities |
| :--- | :--- | :--- |
| **Voxel & Terrain Palette** | `TerrainBrushPalette.tsx` | 3D Voxel materials (Grass, Dirt, Stone, Water, Sand, Wood, Snow), geometry shapes (`FULL_CUBE`, `SLOPE_45`, `SLAB`, `STAIRS`, `CORNER_WEDGE`), and cardinal orientations. |
| **Props & Foliage** | `PropLibraryPanel.tsx` | 3D world-anchored prop placement, scale jitter, rotation steps, category filters (Trees, Rocks, Structures, Decor), and collision modes. |
| **Sheet Slicer** | `SheetSlicerPanel.tsx` | Spritesheet pixel cutter with grid snapping (16px–64px or freeform), normalized UV calculation, and 1-click export to Terrain/Props. |
| **Logic & Trigger Painter** | `LogicPainterPanel.tsx` | 3D Voxel physics and logic tags (Collision, Water, Warp Gate, Encounter Zone, Safe Town, Hazard Damage). |
| **World Builder & Atlas** | `WorldBuilderPanel.tsx` | 3D Voxel chunk management, world volume dimensions, chunk streaming, neighbor map linkings. |
| **Camera & View** | `CameraSettingsPanel.tsx` | 2.5D Isometric, Top-Down 90°, Free Orbit 3D presets, FOV, and Creator Camera Authority locking. |
| **Catalog Editor** | `CatalogEditorShell.tsx` | Centralized definition chrome for NPCs, Items, Loot Tables, Monsters, Quests, Dungeons, and Mounts. |
| **Loot Table Manager** | `LootManagerPanel.tsx` | Weighted drop tables, min/max quantity curves, and live drop simulation testers. |
| **Diagnostics & Health** | `StudioProblemsPanel.tsx` | Real-time map topology verification, missing texture validation, and orphan tag detection. |

---

## 3. The 5 Core Studio Modes

```
┌──────────────────────────────────────────────────────────┐
│  [🎨 Paint]  [👾 Populate]  [📜 Script]  [📚 Catalog]    │  [▶️ Play (Ctrl+E)]
└──────────────────────────────────────────────────────────┘
```

1. **🎨 Paint Mode (`develop`):** Focuses on volumetric 3D voxel terrain layout. Operates through `VoxelTargetResolver` on 32-bit compact voxel words, greedy meshing, and dirty chunk rebuilds.
2. **👾 Populate Mode (`npc`):** Focuses on placing entities into the 3D scene. Place NPCs, monster spawners, harvestable nodes, and world-anchored 3D prop obstacles.
3. **📜 Script Mode (`script`):** Focuses on narrative and mechanics. Edit dialogue trees, assign quest triggers, link warp destinations, and set up event triggers.
4. **📚 Catalog Mode (`catalog`):** Full-screen or docked definition management. Create and modify global game data: Items, Creatures, Loot Tables, Classes, and Starter Heroes.
5. **▶️ Playtest Mode (`test` - PIE):** Hit **Ctrl+E** to instantly test the map with full player movement, physics, combat, and interactions without leaving the browser tab.

---

## 4. Studio Omnisearch & Hotkeys

### 🔍 Studio Omnisearch (`StudioOmnisearch.tsx`)
Pressing **Ctrl+K** or clicking the search bar brings up the global search palette:
- Jump directly to maps by name or ID.
- Search for NPCs, Items, Creatures, and Quests.
- Execute quick actions (e.g. *Toggle Grid*, *Save Map*, *Switch to Logic Layer*).

### ⌨️ Standard Keybindings
- **`Ctrl + S`**: Save Map to database and sync to Go MMO backend.
- **`Ctrl + E`**: Toggle Playtest Mode (PIE).
- **`Ctrl + Z` / `Ctrl + Y`**: Undo / Redo map edits.
- **`B`**: Brush Tool (Stamp).
- **`R`**: Rect Fill Tool / Rotate Stamp.
- **`F` / `G`**: Flood Fill Bucket Tool.
- **`E`**: Eraser Tool.
- **`I`**: Eyedropper (Pick Tile/Tag).
- **`[` / `]`**: Decrease / Increase Brush Radius (or 15° rotation).
- **`M`**: Toggle Magnet (Snap to Grid).

---

## 5. Window Sub-Menu Ribbon Suite (`WindowMenuBar.tsx`)

Every dockable studio window is equipped with a flush application ribbon directly beneath its title bar:
- **Separation of Concerns**: File, tool, and layer controls are separated from the main viewport, preventing clutter.
- **Unified Actions**: Direct access to `New`, `Save`, `Undo`, `Redo`, layer mode toggles, and contextual telemetry badges.

---

## 6. Global 2.5D & 3D Environment Engine

Saints Studio provides real-time global atmosphere and visual customization:
- **Time of Day Presets**: Day, Golden Hour, Dusk, Midnight, and Fantasy Night with dynamic ambient sun/moon lighting tints.
- **Dynamic Weather Particle Simulations**: GPU/CPU particle systems for Gentle Rain, Falling Autumn Leaves, Snow Flurries, and Glowing Fireflies with directional wind vectors.
- **2.5D Tilt-Shift Depth of Field**: Miniature diorama blurring with customizable focal distances.
- **Water Shader Dynamics**: Real-time water shimmer and flow speed multipliers (0.5x–3.0x).
- **3D Spatial Audio Acoustics**: Reverb environment simulation (Dry, Open Field, Cavern, Cathedral, Catacomb) and distance rolloff factors.

