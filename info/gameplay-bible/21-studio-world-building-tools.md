# Saints Studio — Complete World-Building Tools (21)

**Status:** Production world-builder tool contract (audit-backed)  
**Date:** 2026-08-04  
**Scope:** Every world-building tool — terrain, collision, regions, logic, roads, water, rivers, cliffs, vegetation, buildings, furniture, lighting, weather, sound/music regions, decorations, spawn regions, biome painting, terrain rules, auto-tiling, brushes, fill, selection, layer management — plus every workflow from placement through saving.

> **Companions (do not fork)**
> - [`08-world-building-editor-architecture.md`](./08-world-building-editor-architecture.md) — layers 0–3 + Logic (−1) authority
> - [`18-studio-master-architecture.md`](./18-studio-master-architecture.md) — systems / hot-reload
> - [`19-studio-ux-design.md`](./19-studio-ux-design.md) — toolbar, shortcuts, Inspector, Outliner
> - [`20-studio-entity-system.md`](./20-studio-entity-system.md) — placeable objects as entities/prefabs
> - [`17`](./17-studio-world-builder-economy.md) — isolation & map refs

**This document is the world-builder tool master.** Evolve `WorldBuilderPanel`, `TilesetPicker`, `LogicTagPalette`, Babylon paint path, and entity Place — do not ship a second map editor.

---

# 0. Non-Negotiable Rules

1. **Visuals ≠ physics.** Terrain GIDs never imply collision. **Logic (−1)** remains absolute collision/authority (`08`).
2. **Paint tiles vs Place entities.** Continuous surfaces (grass, water, roads) = **tile tools**. Discrete objects (trees-as-nodes, furniture, buildings-as-prefabs, spawners) = **entities/prefabs** (`20`). Decoration may be either (cheap tile stamp vs entity with collision).
3. **One brush pipeline.** All paint tools feed `EditorOp` history (`19`) → mutate `activeMapData` → Save → validate → persist → `admin_reload_map` / `content_reload`.
4. **Regions are first-class.** Music, weather, sound, biome, spawn, lighting volumes are **region layers or zone entities** — not one-off hardcoded map ids.
5. **Auto-tile is data-driven** (tileset bitmask rules), not hardcoded per biome in React.
6. **Minimize clicks** (`19` budgets): sticky brush, `[` `]` size, Shift eyedropper, Ctrl+S save.
7. **Do not rewrite** batched Babylon tileset meshes for v1 tools — extend paint overlays + reload; optimize later.

---

# 1. Audit → Target

| Today | Target |
| :--- | :--- |
| Single-cell GID paint, N visual layers | Full brush suite + layer ops + recommended 0–3 roles |
| Logic (−1) tag paint | Collision + logic tags + region channels (see §4–5) |
| No fill/select/auto-tile/undo | §16–19 tools |
| Furniture/veg = raw tileset GIDs | Tile stamps + entity prefabs |
| No music/weather/biome/lighting tools | Region painters (§11–15) |
| Save Map in World Builder only | Shared save pipeline §22 |

---

# 2. Tool Architecture

## 2.1 Channels (what you paint onto)

| Channel | Storage | Authority |
| :--- | :--- | :--- |
| **Visual layers** `0..N` | `tileLayersData` grids of GIDs | Client render |
| **Logic (−1)** | `grid` / `gridData` MapLogicTile ids | Server movement / interact / step |
| **Region masks** | Additive `regionsData` (or entity zones) | Runtime ambience / spawn / audio |
| **Entities** | `entitiesData` / legacy `npcs`+`gates` | Gameplay objects (`20`) |

Region masks (v1 design):

```ts
type RegionChannelId =
  | "biome"
  | "weather"
  | "music"
  | "sound"
  | "lighting"
  | "spawn"; // soft spawn influence; hard spawners remain entities

type RegionCell = {
  /** Definition id in that channel’s registry (e.g. music track id) */
  defId: string | null;
  /** Optional weight 0–100 for blend */
  weight?: number;
};

type RegionLayer = {
  channel: RegionChannelId;
  /** Same W×H as map; null = inherit / none */
  grid: (RegionCell | null)[][];
};
```

Persist as `WorldMap.regionsData` JSON (additive column). Until column lands, region **entities** (`encounter_zone`-style AABB) are an acceptable Phase WB-2 bridge.

## 2.2 Active tool state (extends `editor-store`)

```ts
activeTool: 'select' | 'brush' | 'eraser' | 'fill' | 'rect' | 'line' | 'eyedropper' | 'place' | 'region';
brushSize: 1 | 3 | 5 | 7;
brushShape: 'square' | 'circle';
paintTarget: { kind: 'visual'; layerIdx: number } | { kind: 'logic' } | { kind: 'region'; channel: RegionChannelId };
activeBrush: { type: 'gid'; gid: number } | { type: 'logic'; tileId: number } | { type: 'region'; defId: string } | { type: 'prefab'; prefabId: string };
autoTileEnabled: boolean;
terrainRulesEnabled: boolean;
layerVisibility: Record<string, boolean>;
layerLocked: Record<string, boolean>;
```

Align with `19` §4.2 shortcuts.

---

# 3. Terrain

## 3.1 Purpose

Paint ground materials: grass, dirt, sand, stone, snow, mud, paths underlay.

## 3.2 Default layer role (bible `08`)

| Layer idx | Role | Solid? |
| :---: | :--- | :--- |
| 0 | Ground / water base | Never (visual) |
| 1 | Fringes / paths / shore transitions | Never |
| 2 | Object bases / wall feet | Visual only — collision via Logic |
| 3 | Canopy / roofs | Never; draw above player |

Studio **recommends** these roles; does not hard-delete extra layers (today allows N). Soft warn if >4 visual layers on official maps.

## 3.3 Workflow — paint terrain

1. Mode **Paint** (`1`)  
2. Select layer 0 (or 1 for paths)  
3. Pick GID from Terrain tileset (or recent)  
4. Optional: enable **Auto-Tile** (§17)  
5. Brush / Fill / Rect  
6. Walk Mode to verify look  
7. `Ctrl+S`  

## 3.4 Terrain materials registry (data)

```ts
type TerrainMaterial = {
  id: string;              // "grass_meadow"
  label: string;
  /** Representative GID or auto-tile set id */
  autoTileSetId?: string;
  sampleGid?: number;
  tags: string[];          // biome affinity
  /** Optional preferred Logic underlay when Terrain Rules on */
  suggestLogicId?: number; // e.g. walkable 0 — NEVER auto-force without Rules toggle
};
```

Creators pick materials in Palette → resolves to GID / auto-tile set.

---

# 4. Collision

## 4.1 Purpose

Walkable / solid / hazard / climbable / water-swim (future).

## 4.2 Storage

Logic (−1) cells whose `MapLogicTile.isSolid` (and future flags) drive movement. **No separate collision bitmap** unless we add `Collision` component on entities for props.

## 4.3 Tools

| Tool | Behaviour |
| :--- | :--- |
| Solid brush | Paint logic id 1 (or registered solid) |
| Walkable brush | Paint 0 |
| Collision overlay | View toggle — red tint solids (`19` overlays) |
| Validate | `validateMapSave` trapped spawn / no walkable |

## 4.4 Workflow

1. Paint Mode → Logic (−1) **or** Script Mode  
2. Solid / Walkable from Logic palette  
3. Toggle Collision overlay  
4. Walk Mode stress-test edges  
5. Save  

**Anti-pattern:** Making layer 2 GIDs automatically solid in code.

---

# 5. Regions (general)

## 5.1 Purpose

Author **spatial influence** without full entity overhead: biome, weather, music, sound, lighting, soft spawn.

## 5.2 Tools

| Tool | Behaviour |
| :--- | :--- |
| Region brush | Paints `defId` into active region channel |
| Region rect | Fill AABB with def |
| Region select | Marquee → Inspector batch set |
| Clear region | Eraser on channel |
| Region overlay | Colorize by defId |

## 5.3 Resolution at runtime

At player cell `(x,y)`:

```
value = regions[channel][y][x]?.defId
     ?? inheritFromBiomeDefaults(biomeCell)
     ?? mapDefaults[channel]
```

Server/client ambience systems subscribe — no per-feature editor.

## 5.4 Workflow

1. Paint Mode → Region channel tab (Music / Weather / …)  
2. Pick definition from channel palette  
3. Brush or Rect  
4. Walk — hear/see change  
5. Save (regionsData in payload)

---

# 6. Logic

## 6.1 Purpose

Tags & components: harvest, shop, heal, craft, encounter, fishing, bramble, base, custom (`logicComponents.ts`).

## 6.2 Tools

| Tool | Behaviour |
| :--- | :--- |
| Logic tag brush | Paint MapLogicTile id |
| Component preset chips | Set brush + default payloads |
| Register component | Advanced dialog → POST logic-tiles |
| Logic overlay | Colored planes (use **DB colors**, not only hardcoded 0–4) |
| Inspect cell | Select tool → Inspector shows tile def + payloads |

## 6.3 Dual path with entities (`20`)

| Prefer Logic paint | Prefer Entity |
| :--- | :--- |
| Cheap carpet behaviours (tall grass carpet) | Unique trees with loot refs |
| Map-wide shop floor marker | Vendor NPC |
| Quick blockout | Production content |

Optional Studio setting: “Painting harvest also upserts ResourceNode entity” (`LogicBinding`).

## 6.4 Workflow

1. Script or Paint → Logic (−1)  
2. Pick tag  
3. Paint  
4. If encounter — also set pool (§ spawn / encounter)  
5. Save · Walk · step/interact  

---

# 7. Roads

## 7.1 Purpose

Path ribbons with clean transitions onto terrain (auto-tile edges).

## 7.2 Tool: Road brush

| Setting | Spec |
| :--- | :--- |
| Target layer | Default **1** (fringe) |
| Material | Path / cobble / dirt track auto-tile set |
| Width | 1 / 2 / 3 tiles (brush size maps to width) |
| Auto-tile | On by default for road sets |
| Optional Logic | Terrain Rules may paint walkable under road |

## 7.3 Workflow

1. Select Road tool (or Brush + road material + auto-tile)  
2. Stroke path  
3. Auto-tile resolves neighbors  
4. Save  

---

# 8. Water

## 8.1 Purpose

Open water bodies on ground layer with shore auto-tiling.

## 8.2 Tool: Water brush / Water bucket

| Setting | Spec |
| :--- | :--- |
| Visual | Layer 0 water GIDs / water auto-tile set |
| Logic | Optional Terrain Rules → non-solid water logic id (future swim) or keep walkable void |
| Animated | Runtime may animate water tileset frames (engine concern) |
| Shore | Auto-tile transitions to adjacent land materials |

## 8.3 Workflow

1. Layer 0 · Water material · Auto-tile on  
2. Fill inland lake or brush coastline  
3. Verify shores  
4. Save · Walk (ensure collision intent via Logic)

---

# 9. Rivers

## 9.1 Purpose

Directed water courses — narrower, flowing, connectable.

## 9.2 Tool: River tool

| Mode | Behaviour |
| :--- | :--- |
| Polyline | Click waypoints → rasterize river corridor width 1–2 |
| Brush | Freehand with river auto-tile (bitmask includes flow direction bits if tileset supports) |
| Source/mouth | Markers (editor meta) for VFX later |

Rivers write **visual layer 0/1** + optional region `biome=riverine`. Collision: usually walkable banks; water cells per Water rules.

## 9.3 Workflow

1. River tool → click source → click bends → Enter commit  
2. Auto-tile river set  
3. Save  

---

# 10. Cliffs

## 10.1 Purpose

Elevation storytelling in 2.5D: cliff faces, tops, bases — **visual + solid Logic**.

## 10.2 Tool: Cliff stamp / Cliff brush

| Part | Layer | Logic |
| :--- | :--- | :--- |
| Cliff top | 0/1 | Walkable or solid edge |
| Cliff face | 2 | **Solid** |
| Cliff shadow/decal | 1 | None |

Cliff auto-tile set encodes facing (N/E/S/W). Brush paints face GIDs; Terrain Rules paints solid on face cells.

## 10.3 Workflow

1. Block land height with cliff material  
2. Rules on → auto solid faces  
3. Place canopy/rock entities if needed  
4. Walk — cannot walk through face  
5. Save  

---

# 11. Vegetation

## 11.1 Two modes

| Mode | When | Tool |
| :--- | :--- | :--- |
| **Tile canopy** | Cheap forests, undergrowth carpets | Brush GIDs on layer 2/3 from Vegetation tileset |
| **Entity trees/plants** | Harvest, collision fidelity, loot | Place prefab `resource_node` / decoration (`20`) |

## 11.2 Scatter brush (entity)

| Setting | Spec |
| :--- | :--- |
| Prefab set | Weighted list of tree/bush prefabs |
| Density | % of cells in stroke |
| Avoid solid | Skip Logic solid / water |
| Jitter | None (grid snap) for v1 |

## 11.3 Workflow — harvestable oak

1. Place Mode → prefab Oak T2  
2. Click cell (or scatter)  
3. Inspector loot ref  
4. Optional: paint canopy tile above for look  
5. Save · entity reload · Walk · gather  

---

# 12. Buildings

## 12.1 Purpose

Structures players recognize: houses, shops, barns.

## 12.2 Composition

| Part | Channel |
| :--- | :--- |
| Floor / walls / roof tiles | Visual layers 0–3 stamps |
| Door | Entity `door` or warp entity |
| Interior exit | Warp entity |
| Collision | Logic solid under walls |
| Shop/NPC | Vendor / NPC entities inside |

## 12.3 Tool: Building prefab stamp

Multi-cell prefab:

```ts
type BuildingPrefab = {
  id: string;
  footprint: { w: number; h: number };
  /** Relative tile stamps per layer */
  tiles: Array<{ layer: number; dx: number; dy: number; gid: number }>;
  logic: Array<{ dx: number; dy: number; tileId: number }>;
  entities: Array<{ dx: number; dy: number; prefabId: string }>;
};
```

Stamp is one click → many `EditorOp`s in one undo group.

## 12.4 Workflow

1. Place → Buildings pack → House A  
2. Ghost footprint · click  
3. Tweak door warp in Inspector  
4. Save · Walk in/out  

---

# 13. Furniture

## 13.1 Purpose

Interior props: tables, beds, counters.

## 13.2 Modes

| Mode | Tool |
| :--- | :--- |
| Tile furniture (George Furniture tileset) | Brush / stamp single GID on layer 2 |
| Entity furniture | Prefab with Collision + Interact (search chest, sit — future) |

## 13.3 Workflow

1. Interior map · Place or Paint furniture  
2. If blocking — ensure Logic solid or entity Collision  
3. Save  

---

# 14. Lighting regions

## 14.1 Purpose

Mood: dusk tint, cave dark, shrine glow — **region channel `lighting`**.

## 14.2 Definition

```ts
type LightingDef = {
  id: string;
  label: string;
  ambient: { r: number; g: number; b: number; intensity: number };
  fog?: { color: string; density: number };
  // Future: point lights as entities, not region cells
};
```

## 14.3 Tool

Region brush on Lighting channel; overlay shows tint preview in Studio (editor-only approximation).

## 14.4 Workflow

1. Region → Lighting → “Cave Dark”  
2. Rect fill cave interior  
3. Walk — client applies ambient mix  
4. Save  

Point lights / torches = **entities** with future `Light` component — not painted cells.

---

# 15. Weather & Sound & Music regions

## 15.1 Weather (`weather` channel)

```ts
type WeatherDef = {
  id: string;
  label: string;
  preset: "clear" | "rain" | "storm" | "snow" | "fog" | "sandstorm";
  intensity: number; // 0–1
  particle?: string;
};
```

Brush/rect; runtime WeatherManager (or client FX) samples cell.

## 15.2 Sound (`sound` channel)

Ambient loops: river, market, cave drip.

```ts
type SoundRegionDef = {
  id: string;
  label: string;
  assetId: string;   // audio registry
  volume: number;
  fadeTiles: number; // edge crossfade width
};
```

## 15.3 Music (`music` channel)

```ts
type MusicRegionDef = {
  id: string;
  label: string;
  trackId: string;
  crossfadeMs: number;
  priority: number; // higher wins when overlapping
};
```

Overlap rule: highest priority wins; tie → largest weight → map default.

## 15.4 Shared workflow

1. Open Region channel  
2. Pick def from palette (searchable)  
3. Brush / Fill / Rect  
4. Walk to audition (Walk Mode enables audio)  
5. Save  

---

# 16. Decorations

| Kind | Tool |
| :--- | :--- |
| Ground decals (cracks, litter) | Layer 1 brush |
| Non-interactive props | Decoration entity prefab |
| Particle deco (fireflies) | Future entity / region FX |

Scatter brush supports decoration prefab sets (same as vegetation scatter with different packs).

---

# 17. Spawn regions

## 17.1 Soft vs hard

| Type | Mechanism |
| :--- | :--- |
| **Hard spawner** | Entity with `Spawner` component (`20`) — population authority |
| **Soft spawn region** | `spawn` region channel biasing random encounters / which spawner presets are allowed |
| **Encounter carpet** | Logic tall grass + EncounterZone entity / map pool |

## 17.2 Tooling

* Place Spawner prefab (invisible + radius gizmo)  
* Paint Spawn region def (“forest_wildlife_tier1”)  
* Paint Encounter logic + configure pool in Inspector  

## 17.3 Workflow — forest wildlife

1. Place Mode → Area Spawner → set creature pool + max pop  
2. Optional: paint spawn region around it  
3. Paint tall grass for TB encounters if needed  
4. Save · entity reload · Walk  

---

# 18. Biome painting

## 18.1 Purpose

Macro material + default ambience affinity.

```ts
type BiomeDef = {
  id: string;
  label: string;
  defaultTerrainMaterialId: string;
  defaults: Partial<Record<RegionChannelId, string>>; // weather/music/…
  paletteHint: string; // UI color
};
```

Painting biome:

1. Writes `biome` region channel  
2. Optionally (Terrain Rules) offers “Apply biome defaults to weather/music where empty”  
3. Does **not** wipe hand-authored region cells unless “Force apply”

## 18.2 Workflow

1. Region → Biome → Forest  
2. Fill map quadrant  
3. Rules → Apply defaults to empty music/weather  
4. Detail-paint terrain  
5. Save  

---

# 19. Terrain rules

Toggle **Terrain Rules** in toolbar (off by default — fun-first; power users enable).

| Rule | Effect |
| :--- | :--- |
| Water → suggest logic | Optionally paint water logic id under water GIDs |
| Cliff face → solid | Auto solid on cliff-face autotile results |
| Road → walkable | Ensure walkable under road strokes |
| Canopy layer lock | Prevent brush on layer 3 unless held Alt |
| Biome affinity warn | Warn when painting desert tiles inside ocean biome (soft) |

Rules emit the same `EditorOp`s as manual Logic paint — never hidden side channel.

---

# 20. Auto-tiling

## 20.1 Data

```ts
type AutoTileSet = {
  id: string;
  /** Blob / bitmask → GID (Wang / 16-tile / 47-tile — start with 16 blob) */
  mode: "blob16" | "blob47" | "edge";
  tiles: Record<string, number>; // mask key → gid
  /** Which neighbor materials count as “same” */
  joinsWith: string[]; // material ids
};
```

## 20.2 Behaviour

On each painted cell (and optionally 8-neighbors):

1. Read neighbor materials / GIDs in set  
2. Compute bitmask  
3. Assign GID from set  
4. Record ops for center + updated neighbors (one undo group)

## 20.3 UI

* Checkbox **Auto-Tile** on Palette when material has `autoTileSetId`  
* Road / Water / Cliff enable by default for their sets  

## 20.4 Workflow

1. Enable Auto-Tile · pick Grass set  
2. Fill area  
3. Neighbors resolve edges  
4. Disable to place hero accent tiles manually  

---

# 21. Brushes, Fill, Selection

## 21.1 Brush

| Property | Values |
| :--- | :--- |
| Size | 1,3,5,7 (`[` `]`) |
| Shape | square / circle |
| Opacity | N/A for discrete tiles (always replace) |
| Stroke | Mouse down drag paints continuous cells |

## 21.2 Eraser

Writes GID 0 on visual; walkable/clear on logic; null on region. Same sizes.

## 21.3 Fill (bucket)

Flood fill 4-connected equal value → new brush value. Cap cells (e.g. 4096) with confirm if larger.

## 21.4 Rect / Line

Drag rectangle or line of brush. Shift constrains square/line axis.

## 21.5 Eyedropper

Sample under cursor → set brush (Shift temporary).

## 21.6 Selection tools

| Tool | Behaviour |
| :--- | :--- |
| Select | Click cell/entity |
| Marquee | Tile multi-select |
| Move selection | Drag (tiles copy/move; entities move) |
| Copy/Cut/Paste | Clipboard (`19`) |
| Delete | Clear tiles / delete entities |

Paint tools ignore selection unless “Paint inside selection only” toggle on.

---

# 22. Layer management

## 22.1 Operations (Outliner + World Builder)

| Op | Spec |
| :--- | :--- |
| Add layer | Append zero grid; name `Layer N` |
| Rename | Inline Outliner |
| Delete | Confirm; forbid delete if only layer |
| Reorder | Drag; redraw order = array order |
| Visibility | Eye — editor hide (client render skip) |
| Lock | Prevent paint |
| Duplicate | Clone grid |
| Role badge | Ground/Fringe/Object/Canopy suggestion |

Logic (−1) and Region channels appear as **sibling channel roots** in Outliner, not as visual layers.

## 22.2 Active target

Layer chips in Palette; locked layers reject paint with toast.

---

# 23. End-to-end workflows (placement → save)

## 23.1 Universal save pipeline

```
EditorOps mutate activeMapData (tiles, grid, regions, entities, gates, encounterPool, tilesets)
    → dirty = true (status bar)
    → Ctrl+S / Save
    → stripEntityEditorMeta + stripEditorOverlays
    → POST /api/maps/:slug
    → validateMapSave (+ future validateRegions, validateEntities)
    → Prisma WorldMap (+ legacy GameMap mirror)
    → invalidate cache
    → admin_reload_map / content_reload
    → clients map_reloaded
    → dirty = false
```

**Create map:** dialog → POST empty + bootstrap tilesets/GID ground → reload → Paint.

**Autosave (optional Phase WB-4):** draft to localStorage only — never silent live publish.

## 23.2 Greenfield zone (checklist)

1. New Map (30×30)  
2. Biome paint Forest  
3. Apply biome defaults (music/weather)  
4. Terrain auto-tile ground  
5. Rivers / water  
6. Roads  
7. Cliffs at ridge  
8. Collision pass (Logic solid)  
9. Vegetation scatter + a few harvest entities  
10. Building stamp + warps  
11. Spawners + encounter grass  
12. Lighting cave pocket  
13. Validate · Save · Walk entire loop  

## 23.3 Click budgets (world tools)

| Task | Budget |
| :--- | ---: |
| Paint one brush stroke | 0 mode switches if already Paint |
| Fill lake | 2 (Fill tool + click) |
| Stamp building | 2 (pick prefab + click) |
| Audition music region | 1 Walk after paint |
| Save | 1 (`Ctrl+S`) |

---

# 24. Palette IA (World Builder dock)

```
[ Map IO: Open · Save · New ]
[ Target: Visual layers | Logic | Regions▼ ]
[ Tools mirrored from toolbar ]
[ Materials / Tags / Region defs / Prefabs ]
[ Tileset grid OR Logic list OR Region defs ]
[ Recent (8) ]
[ Auto-Tile  Terrain Rules  Paint-in-selection ]
```

Properties/Inspector never doubles as primary brush palette (`19`).

---

# 25. Validation extensions

| Check | Level |
| :--- | :--- |
| Existing logic/NPC checks | Hard |
| Unknown region defId | Hard on publish |
| Empty music + huge map | Soft |
| Water visual without shore auto-tile | Soft |
| Building footprint OOB | Hard |
| Layer count > 8 | Soft official / Hard Creator claims |
| All-zero visual ground | Hard (black void guard — bootstrap) |

---

# 26. Phased delivery

| Phase | Ship | Reuse |
| :--- | :--- | :--- |
| **WB0 Docs** ✅ | This bible | — |
| **WB1 Tools core** | Select/Brush/Eraser/Fill/Rect/Eyedropper, brush size, undo paint, layer lock/vis, Ctrl+S dirty | Canvas paint path, editor-store |
| **WB2 Auto-tile + roads/water** | AutoTileSet data, road/water materials | TilesetPicker |
| **WB3 Regions** | regionsData + music/weather/sound/lighting/biome painters | New column + overlays |
| **WB4 Cliffs/rivers/scatter** | Cliff sets, river polyline, vegetation scatter | Prefabs `20` |
| **WB5 Buildings** | Multi-cell building prefabs | Entity+tile stamp |
| **WB6 Terrain rules polish** | Rules toggles + validation popover | mapSaveValidation |

**Non-goals:** Replacing Logic (−1); Unity-style terrain heightmaps; separate desktop TMX editor for live authoring.

---

# 27. Anti-Patterns

1. Collision from visual GID heuristics in production  
2. New parallel “region editor app” outside Studio  
3. Hardcoding biome→music in React instead of region defs  
4. Auto-tile without undo grouping neighbor updates  
5. Building tools that only paint pixels with no door/warp entities  
6. Silent Terrain Rules overwriting author Logic  
7. Fill without cell cap  
8. Saving without strip of editor overlays / entity editor meta  
9. Ignoring DEMO ground GID bootstrap (black void)  
10. Per-feature paint systems that bypass `EditorOp` / dirty flag  

---

# Final Rule

**Paint the world in channels. Place what acts. Rules assist — they never own authority.**  
Logic (−1) decides feet. Entities decide verbs. Regions decide atmosphere. Auto-tile decides edges. One save pipeline ships truth to players.
