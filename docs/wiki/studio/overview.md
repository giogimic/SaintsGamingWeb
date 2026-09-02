# World Studio Overview & Architecture

The **Saints World Studio** (`/studio`) is a web-based game engine and authoring suite providing visual map construction, definition catalog editing, NPC placement, and instant playtesting.

---

## 1. Studio Architecture & Shell Layout

The Studio environment is orchestrated by `StudioEditorShell.tsx` and a modular docking layout engine:

```
┌──────────────────────────────────────────────────────────┐
│ Top Toolbar: Mode Switcher, Map Selector, Undo/Redo, PIE │
├───────────────────┬──────────────────────────────────────┤
│ Left Panel        │ Main Babylon.js Viewport             │
│ • Tool Palette    │ • Dual-Grid Visual/Logic Rendering   │
│ • Tile Selector   │ • Continuous Selection & Splats      │
│ • Catalog List    │ • Gizmo Handles & Brush Cursors      │
│                   ├──────────────────────────────────────┤
│                   │ Bottom Panel: Asset Browser, History │
├───────────────────┴──────────────────────────────────────┤
│ Right Panel: Entity Inspector, Properties & Problems     │
└──────────────────────────────────────────────────────────┘
```

- **FlexLayout Docking:** Panels can be resized, stacked, detached into floating windows, or collapsed.
- **`editor-store.ts`:** Zustand store managing active tool selection, brush radius/shapes, continuous selection geometry, history stacks (undo/redo), and dirty state flags.
- **Continuous Geometry Pipeline:** Vector mathematical models (`circle`, `ellipse`, `rectangle`, `regularPolygon`, `polygon`, `freehand`) maintain high visual fidelity across 2D and 3D Babylon viewports.

---

## 2. Core Studio Dock Windows

Every dock is equipped with a `<WindowMenuBar>` application sub-menu ribbon:

| Dock Window | Component | Key Capabilities |
| :--- | :--- | :--- |
| **Tile Selector** | `TileSelectorPanel.tsx` | 5 unified tabs (`Grid Paint`, `Terrain Splat`, `Props & Foliage`, `Sheet Slicer`, `Smart Border`). |
| **Terrain Splat Palette** | `TerrainBrushPalette.tsx` | Seamless ground material swatches with subregion UV sampling, continuous scatter density, opacity falloff, and rotation. |
| **Props & Foliage** | `PropLibraryPanel.tsx` | 2.5D/3D billboard prop placement, scale jitter, rotation steps, category filters (Trees, Rocks, Structures, Decor), and collision modes. |
| **Sheet Slicer** | `SheetSlicerPanel.tsx` | Spritesheet pixel cutter with grid snapping (16px–64px or freeform), normalized UV calculation, and 1-click export to Terrain/Props. |
| **Logic Painter** | `LogicPainterPanel.tsx` | Visual collision, water, warp gate, encounter zone, safe town, and environmental hazard tags. |
| **World Builder & Atlas** | `WorldBuilderPanel.tsx` | Visual & collision layer stack, map topology, chunk streaming, neighbor map linkings. |
| **Camera & View** | `CameraSettingsPanel.tsx` | 2.5D Isometric, Top-Down 90°, Free Orbit 3D presets, FOV, and Creator Camera Authority locking. |
| **Catalog Editor** | `CatalogEditorShell.tsx` | Centralized definition chrome for NPCs, Items, Loot Tables, Monsters, Quests, Dungeons, and Mounts. |
| **Loot Table Manager** | `LootManagerPanel.tsx` | Weighted drop tables, min/max quantity curves, and live drop simulation testers. |
| **Diagnostics & Health** | `StudioProblemsPanel.tsx` | Real-time map topology verification, missing texture validation, and orphan tag detection. |

---

## 3. The 5 Core Studio Modes

```
[🎨 Paint (develop)]  [👾 Populate (npc)]  [📜 Script (script)]  [📚 Catalog (catalog)]  [▶️ Play (Ctrl+E)]
```

| Mode | Identifier | Primary Purpose |
| :--- | :--- | :--- |
| **🎨 Paint** | `develop` | Dual-grid tile painting, GID placement, layer switching, continuous vector selections, terrain splats, collision logic tags. |
| **👾 Populate** | `npc` | Placing NPCs, monster spawners, harvestable nodes, and 2.5D/3D prop obstacles. |
| **📜 Script** | `script` | Dialogue tree node graphs, quest triggers, warp links, and interactive logic. |
| **📚 Catalog** | `catalog` | Managing global game items, creature stats, classes, and loot drop tables. |
| **▶️ Playtest** | `test` (PIE) | Hotkeys **Ctrl+E** to simulate live gameplay directly inside the viewport. |

---

## 4. Omnisearch Palette (`StudioOmnisearch.tsx`)

Pressing **Ctrl+K** opens the Omnisearch command palette, allowing creators to quickly search and execute actions:
- **Map Navigation:** Jump instantly to any map by name or slug (e.g. `saints_village`, `celestial_dungeon`).
- **Entity & Item Search:** Locate specific NPC instances or open item definitions.
- **Fast Commands:** Execute operations such as `Save Map`, `Toggle Grid Lines`, `Export Map JSON`, or `Clear Layer`.

---

## 5. Keybindings & Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| **`Ctrl + S`** | Save Map | Persists map changes to Prisma DB and notifies Go MMO backend. |
| **`Ctrl + E`** | Toggle PIE | Switches between editor mode and live playtest runtime. |
| **`Ctrl + Z` / `Ctrl + Y`** | Undo / Redo | Reverts or reapplies recent map tile, splat, and entity edits. |
| **`B`** | Stamp / Brush | Places tile or splat stamp centered on cursor $(0.5, 0.5)$ pivot. |
| **`R`** | Rect / Rotate | Bounding box fill or rotates active stamp/splat. |
| **`F` / `G`** | Flood Fill | Fills connected region on active visual or logic layer. |
| **`I` / `E`** | Eyedropper / Eraser | Picks tile/logic GID from viewport or erases cell contents. |
| **`[` / `]`** | Brush Radius / Rotate | Adjusts brush radius ($1\times 1$ to $7\times 7$) or 15° step rotation. |
| **`M`** | Snap to Grid | Toggles magnet snapping on or off for continuous sub-tile placement. |

---

## 6. Window Sub-Menu Ribbon Suite (`WindowMenuBar.tsx`)

Every dockable studio window is equipped with a flush application sub-menu ribbon located directly under the window title bar:
- **Modular Window Menus**: Standardized File, Edit, Tools, Presets, and Layers dropdowns on each window.
- **De-cluttered Viewports**: Keeps action controls separate from the main workspace while remaining 1-click accessible.
- **Contextual Badges**: Live state pills displaying current layer mode, validation status, and tool dimensions.

---

## 6. Global 2.5D & 3D Environment Pipeline

The Realm Settings system provides real-time global atmosphere controls:
- **Atmospheric Time of Day**: Day, Golden Hour, Dusk, Midnight, and Fantasy Night lighting tints.
- **Dynamic Weather Simulations**: Gentle Rain, Falling Leaves, Snow Flurries, and Fireflies with wind vector physics.
- **2.5D Tilt-Shift Depth of Field**: Miniature diorama depth blurring with customizable focal distances.
- **Water Shader Dynamics**: Real-time water shimmer and flow speed multipliers (0.5x–3.0x).
- **3D Spatial Audio Acoustics**: Reverb environment simulation (Dry, Open Field, Cavern, Cathedral, Catacomb).

