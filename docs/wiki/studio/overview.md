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
│ • Tile Selector  │ • Gizmo Handles & Brush Cursors      │
│ • Catalog List    ├──────────────────────────────────────┤
│                   │ Bottom Panel: Asset Browser, History │
├───────────────────┴──────────────────────────────────────┤
│ Right Panel: Entity Inspector, Properties & Problems     │
└──────────────────────────────────────────────────────────┘
```

- **FlexLayout Docking:** Panels can be resized, stacked, detached into floating windows, or collapsed.
- **`editor-store.ts`:** Zustand store managing active tool selection, brush radius, active layer, history stacks (undo/redo), and dirty state flags.

---

## 2. The 5 Core Studio Modes

```
[🎨 Paint (develop)]  [👾 Populate (npc)]  [📜 Script (script)]  [📚 Catalog (catalog)]  [▶️ Play (Ctrl+E)]
```

| Mode | Identifier | Primary Purpose |
| :--- | :--- | :--- |
| **🎨 Paint** | `develop` | Dual-grid tile painting, GID placement, layer switching, collision logic tags. |
| **👾 Populate** | `npc` | Placing NPCs, monster spawners, harvestable nodes, and prop obstacles. |
| **📜 Script** | `script` | Dialogue tree node graphs, quest triggers, warp links, and interactive logic. |
| **📚 Catalog** | `catalog` | Managing global game items, creature stats, classes, and loot drop tables. |
| **▶️ Playtest** | `test` (PIE) | Hotkeys **Ctrl+E** to simulate live gameplay directly inside the viewport. |

---

## 3. Omnisearch Palette (`StudioOmnisearch.tsx`)

Pressing **Ctrl+K** opens the Omnisearch command palette, allowing creators to quickly search and execute actions:
- **Map Navigation:** Jump instantly to any map by name or slug (e.g. `saints_village`, `celestial_dungeon`).
- **Entity & Item Search:** Locate specific NPC instances or open item definitions.
- **Fast Commands:** Execute operations such as `Save Map`, `Toggle Grid Lines`, `Export Map JSON`, or `Clear Layer`.

---

## 4. Keybindings & Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| **`Ctrl + S`** | Save Map | Persists map changes to Prisma DB and notifies Go MMO backend. |
| **`Ctrl + E`** | Toggle PIE | Switches between editor mode and live playtest runtime. |
| **`Ctrl + Z` / `Ctrl + Y`** | Undo / Redo | Reverts or reapplies recent map tile and entity edits. |
| **`B` / `R` / `G`** | Stamp / Rect / Fill | Switches active painting tool (Brush, Bounding Box, Bucket). |
| **`I` / `E`** | Eyedropper / Eraser | Picks tile/logic GID from viewport or erases cell contents. |
| **`[` / `]`** | Brush Radius | Decreases or increases brush radius from $1\times 1$ up to $7\times 7$. |

---

## 5. Window Sub-Menu Ribbon Suite (`WindowMenuBar.tsx`)

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

