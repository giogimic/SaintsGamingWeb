# 🖥️ Studio Architecture & Editor Modes

The **Saints Studio** (`src/web/components/the-lobby/editor/`) is a comprehensive web-based game development environment. It provides visual world building, definition catalogs, entity management, and instant playtesting.

---

## 1. Studio Architecture & State Management

Studio state is coordinated across dedicated stores and UI shells:
- **`StudioEditorShell.tsx`**: The main viewport and docking container wrapping the Babylon.js canvas.
- **`editor-store.ts`**: Zustand store managing active tool selection, brush radius, active layer, selected entity/cell, history stack (undo/redo), and unsaved changes flags.
- **FlexLayout Dock Panels**: Draggable, tabbed docking panels allowing creators to arrange their workspace (World Builder, Inspector, Asset Browser, Problems, Catalogs, Server Controls).

---

## 2. The 5 Core Studio Modes

```
┌──────────────────────────────────────────────────────────┐
│  [🎨 Paint]  [👾 Populate]  [📜 Script]  [📚 Catalog]    │  [▶️ Play (Ctrl+E)]
└──────────────────────────────────────────────────────────┘
```

1. **🎨 Paint Mode (`develop`):** Focuses on map layout. Enables dual-grid painting (visual tiles and collision logic), brush radii, fills, tileset selection, and terrain styling.
2. **👾 Populate Mode (`npc`):** Focuses on placing entities into the scene. Place NPCs, monster spawners, resource nodes, harvestable trees/rocks, and prop blockers.
3. **📜 Script Mode (`script`):** Focuses on narrative and mechanics. Edit dialogue trees, assign quest triggers, link warp destinations, and set up event triggers.
4. **📚 Catalog Mode (`catalog`):** Full-screen or docked definition management. Create and modify global game data: Items, Creatures, Loot Tables, Classes, and Starter Heroes.
5. **▶️ Playtest Mode (`test` - PIE):** Hit **Ctrl+E** to instantly test the map with full player movement, physics, combat, and interactions without leaving the browser tab.

---

## 3. Studio Omnisearch & Hotkeys

### 🔍 Studio Omnisearch (`StudioOmnisearch.tsx`)
Pressing **Ctrl+K** or clicking the search bar brings up the global search palette:
- Jump directly to maps by name or ID.
- Search for NPCs, Items, Creatures, and Quests.
- Execute quick actions (e.g. *Toggle Grid*, *Save Map*, *Switch to Logic Layer*).

### ⌨️ Standard Keybindings
- **`Ctrl + S`**: Save Map to database and sync to Go MMO.
- **`Ctrl + E`**: Toggle Playtest Mode (PIE).
- **`Ctrl + Z` / `Ctrl + Y`**: Undo / Redo map edits.
- **`B`**: Brush Tool (Stamp).
- **`R`**: Rect Fill Tool.
- **`G`**: Bucket Fill Tool.
- **`E`**: Eraser Tool.
- **`I`**: Eyedropper (Pick Tile/Tag).
- **`[` / `]`**: Decrease / Increase Brush Radius.
