# Comprehensive Architectural Plan: Studio Asset Management Mode, Purpose-Driven Workspaces, & Clean Setup

This plan expands the architecture for the dedicated **Studio Asset Management Mode**, detailing its UX layout, focused asset sub-studios (Characters/LPC, Creatures, Tilesets, Items, Audio, Packs, Master Catalog), the clean fresh install flow, and catalog discovery fixes.

---

## 1. Studio Asset Management Mode: Layout & Shell Integration

### Workspace Layout Principle
When entering **Asset Management Mode** (`mode === 'assets'`):
- The central 3D Babylon viewport and map-editing tools are cleanly tucked away.
- The **Top Header Bar** and **Bottom Navigation Dock** remain persistent.
- The entire main workspace becomes a dedicated, full-screen **Asset Management Suite**.
- The Suite features a clean sidebar navigation with dedicated, **purpose-focused sub-studios**. Even though tools like the Slicer, Uploader, and Inspector share underlying engines, each sub-studio customizes the tooling, presets, and metadata specifically for that asset type.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: [Map Switcher ▼]  [Paint] [Populate] [Script] [Catalog] [Atlas] [★ ASSETS ★] [▶ Play]  [Save] [Profile]      │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌───────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │  ASSET WORKSPACES    │ │  ACTIVE WORKSPACE HEADER: 🧙‍♂️ Universal Character & LPC Studio                        │ │
│ │                      │ │  [Browse Characters] [Upload & Unpack ZIP] [LPC Slicer] [Modular Layer Stacker]        │ │
│ │ 🧙‍♂️ Characters / LPC   │ ├───────────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ 🐉 Creatures/Monsters│ │                                                                                           │ │
│ │ 🗺️ Tilesets & World  │ │  ┌──────────────────────────────────────────────┐ ┌────────────────────────────────────┐  │ │
│ │ ⚔️ Items & UI Icons  │ │  │  Focused Library & Quick-Filter View         │ │  Live Interactive Preview & Tool   │  │ │
│ │ 🔊 Audio & SFX       │ │  │  • Filter by Role (Hair, Armor, Body)        │ │  • 9-Frame Walk Cycle Playback     │  │ │
│ │ 📦 Packs & Bundles   │ │  │  • Filter by Body Type (Male, Female, Teen)  │ │  • Layer Stacking Order (Z-Index)  │  │ │
│ │ 🛡️ Master Catalog    │ │  │  • 1-Click "Open in Slicer"                  │ │  • Slicing & Direct Ingest Actions │  │ │
│ │                      │ │  └──────────────────────────────────────────────┘ └────────────────────────────────────┘  │ │
│ └──────────────────────┘ └───────────────────────────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ BOTTOM DOCK: [Properties] [Problems] [World Atlas] [Diagnostics] [Console]                                             │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Dedicated Purpose-Driven Asset Workspaces

To maximize developer ergonomics, we organize the Asset Suite into focused workspaces tailored to specific asset types:

### Workspace 1: 🧙‍♂️ Character & Universal LPC Studio
*Dedicated to Player Avatars, NPCs, Modular Equipment, and LPC Character Generator Exports.*
- **Tailored Ingestion & Slicing**:
  - Direct dropzone for Universal LPC Generator `.zip` packages or `.png` sheets.
  - Automatically extracts composite spritesheet + individual modular layers (hair, torso, pants, shoes, hat, weapon) + author credits.
  - **Slicer Presets**: *"Full 64×64 LPC Suite"*, *"4-Direction Walk Cycle (9-frame)"*, *"Saints 2.5D Retro (3×4 grid)"*, *"Cardinal Standing Idles"*.
- **Modular Layer Inspector**:
  - Live mannequin preview for testing layered equipment composites.
  - Z-Index stacking visualizer and layer hiding rules (e.g. helmets hiding hair).
- **1-Click Entity Export**:
  - *"Send to Starter Heroes"* button to immediately make a character playable.
  - *"Create NPC Def"* button to turn the sprite into a spawnable NPC.

---

### Workspace 2: 🐉 Creatures & Monsters Studio
*Dedicated to Collection Encounters (Saints Buddies), World Monsters, and Bosses.*
- **Tailored Ingestion & Slicing**:
  - Supports overworld single-frame billboards (`-ow.png`), multi-frame battle sheets, front/back perspectives, and Shiny color palette variants.
  - **Slicer Presets**: *"Battle Sheet Slicer (Front & Back)"*, *"Overworld 1-Frame Crop"*, *"Shiny Alternate Palette Extractor"*.
- **Creature Definition Linking**:
  - 1-click binding of sliced front/back sprites to `CreatureDef` entries.
  - Interactive Shiny chance toggle and live battle pose preview.

---

### Workspace 3: 🗺️ Tilesets & World Art Studio
*Dedicated to Map Tilesets, Terrain Patches, Autotiles, Buildings, and Environment Props.*
- **Tailored Ingestion & Slicing**:
  - Ingestion for terrain sheets (16×16, 32×32, 64×64 cells), autotile Wang brushes, water animations, and decorative objects (trees, boulders, fences).
  - **Slicer Presets**: *"16×16 Grid Matrix"*, *"32×32 Grid Matrix"*, *"Custom Box Prop Extractor"*.
- **Tileset Registration**:
  - Instantly registers new tilesets into the Studio World Builder palette without manual code editing.
  - Collision bitmask paint tool (Solid, Water, High Elevation, Interactable).

---

### Workspace 4: ⚔️ Items, Gear & UI Icons Studio
*Dedicated to Inventory Items, Weapons, Consumables, Skill Badges, and UI Frames.*
- **Tailored Ingestion & Slicing**:
  - Grid slicing for item icon sheets (32×32 and 64×64).
  - Categorization: Weapons, Armor, Resources, Potions, Tools, Quest Items.
- **Item Template Binding**:
  - 1-click binding to `ItemTemplate` and `CraftingRecipe` tables.
  - Visual durability, stat modifier, and rarity border configuration.

---

### Workspace 5: 🔊 Audio & Soundscapes Studio
*Dedicated to Background Music, Ambient Soundscapes, Combat SFX, and Voice Emotes.*
- **Tailored Ingestion**:
  - MP3, WAV, OGG upload with automatic loudness normalization.
  - Classification: BGM (Music), Ambient (Weather/Biomes), SFX (Combat/Footsteps), UI (Menu/Clicks).
- **Interactive Player**:
  - Waveform visualizer, loop point tester, and spatial audio radius preview.
  - 1-click assignment to Map Music or Jukebox tables.

---

### Workspace 6: 📦 Packs & Bundles Manager
*Dedicated to Pre-Packaged Asset Packs, Community Expansions, and Modular Add-Ons.*
- **Pre-Packaged Essentials**:
  - *Base Map Tiles & Terrain* (Essential)
  - *Universal LPC Character Essentials* (Recommended)
  - *Classic Retro 3×4 Sprites* (Optional)
  - *SFX & Soundscape Pack* (Optional)
  - *Demo Quests & Story Maps* (Optional)
- **Pack Operations**:
  - 1-click installation / removal of entire asset bundles.
  - Custom pack exporter for bundling game assets into `.zip` archives with metadata.

---

### Workspace 7: 🛡️ Master Catalog & Moderation
*The Universal Repository for Searching, Auditing, Tagging, and Moderating All Assets.*
- Universal full-text search across all asset types.
- Batch operations: Multi-select reclassification, tag assignment, visibility changes (`Community`, `Project`, `Personal`).
- Moderation queue: Review pending community uploads with Approve / Reject workflows.

---

## 3. Fixing Asset Browser / Catalog Discovery for LPC Imports

### Root Cause Analysis & Concrete Fixes:
1. **Type Search Normalization**:
   - In `app/api/assets/route.ts`, normalize queries so `CHARACTER` automatically matches `type: 'SPRITE'` or `type: 'CHARACTER'`, while filtering by `tags` (`anim:lpc-full`, `anim:lpc-walk`, `profile:character`).
2. **Instant Cache Busting & Cross-Component Sync**:
   - `AssetManager.getInstance().clearCache()` will execute immediately following every single upload, ZIP unpack, or slicer submit.
   - Fire `window.dispatchEvent(new CustomEvent('assets:refreshed'))` so every open asset view re-fetches its listing instantly.
3. **Representative Frame Thumbnails**:
   - Multi-frame LPC sheets (832×1344) will render using `getThumbnailFrameRect()` configured to Row 10 (South-facing walk/idle frame) so character assets display clean, high-resolution single-character portraits instead of squashed full sheets.
4. **Moderation Status Toggle**:
   - Provide a status chip in the browser (`All | Approved | My Uploads / Pending`) ensuring users immediately see newly ingested files.

---

## 4. Clean Fresh Install & Developer-First Lobby Setup Flow

### Current Problem
- `DemoBootstrap.ts` automatically forces `DEMO_SANDBOX` and demo quests on every clean startup.
- Players logging into `/lobby` automatically load `DEMO_SANDBOX` even if the developer wanted a custom blank world.

### Proposed Architecture

```
                                Fresh Instance Boot
                                        │
                                        ▼
                         [ Empty WorldMap Database ]
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
             [ Admin User ]                          [ Player User ]
                    │                                       │
                    ▼                                       ▼
       [ Lands directly in Studio ]            [ /lobby Access Gated ]
     • Fresh canvas                          • Character creation disabled
     • Setup Wizard offers optional packs    • Screen: "Realm Under Construction"
     • Builds Lobby Map                      • Awaits developer publishing
     • Toggles: "Set as Active Lobby"
```

### Key Changes:
1. **Empty WorldMap by Default**:
   - `server.ts` and `ensureStudioMapFoundation()` will NOT auto-create `DEMO_SANDBOX` when `WorldMap` is empty.
   - The database starts 100% clean. Demo maps and quests are available as an **optional installation pack** in the Setup Wizard.
2. **Lobby Gating**:
   - In `/lobby`, if no map in `WorldMap` has `isLobby: true` and `isOpen: true`:
     * Regular players see a stylish screen: *"Realm Under Construction — The world developer is preparing the lobby. Please check back soon!"*
     * Character creation is disabled until an active lobby exists.
     * Admin users see a direct action: *"Open Saints Studio to create your Lobby Map"*.
3. **World Builder "Active Lobby" Setting**:
   - In Studio -> **World Builder** -> **Map Properties**, add an explicit toggle:
     * `[x] Set as Primary World Lobby`
     * `[x] Open to Public / Players`

---

## 5. Implementation Roadmap (Phases for Execution)

| Phase | Description | Key Modules |
| :--- | :--- | :--- |
| **Phase 1** | **Studio Asset Management Mode & Shell UI**<br>Add `assets` mode to top switcher, hide viewport, render full-screen Asset Management Suite with sidebar. | `studioModes.ts`, `StudioEditorShell.tsx`, `AssetStudioSuite.tsx` |
| **Phase 2** | **Purpose-Driven Sub-Studios**<br>Build the 7 specialized workspaces (Character/LPC, Creatures, Tilesets, Items, Audio, Packs, Master Catalog). | `panels/assets/*` sub-components |
| **Phase 3** | **Asset Catalog Discovery & Cache Sync**<br>Normalize API search queries, instant cache invalidation, frame-aware LPC thumbnails. | `AssetManager.ts`, `/api/assets/route.ts`, `SpriteThumbnail.tsx` |
| **Phase 4** | **Clean Fresh Install & Lobby Gate**<br>Disable auto-seeding of demo maps, gate `/lobby` character creation until developer publishes a lobby map. | `DemoBootstrap.ts`, `GameCanvasBabylon.tsx`, `TheLobby.tsx`, `WorldBuilderPanel.tsx` |
| **Phase 5** | **Modular Setup Wizard & LPC-First Defaults**<br>Update pack installer with modular checkboxes, wire LPC characters into Starter Heroes & NPCs. | `setupDetection.ts`, `prepackagedPacks.ts`, `StarterHeroEditorPanel.tsx` |
