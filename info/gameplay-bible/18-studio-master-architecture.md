# Saints Studio — Master Architecture (18)

**Status:** Design contract (audit-backed)  
**Date:** 2026-08-04  
**Scope:** Unify every Studio editor system into one coherent ecosystem for a 2D MMORPG creator suite (Unreal / Unity / Godot / Roblox Studio depth — without rewriting working runtime).

> **Companions (do not fork)**
> - [`08-world-building-editor-architecture.md`](./08-world-building-editor-architecture.md) — visual layers 0–3, Logic (−1) authority, map JSON
> - [`16-studio-editor-philosophy.md`](./16-studio-editor-philosophy.md) — creator UX, five modes, docks, fun-first
> - [`17-studio-world-builder-economy.md`](./17-studio-world-builder-economy.md) — Phase 1 isolation, entity/loot contracts, phased delivery
> - [`ALIGNMENT.md`](./ALIGNMENT.md) — engineering truth vs bible intent

**This document is the master.** `08` owns layer physics truth. `16` owns feel. `17` owns Phase 1 contracts. `18` owns **system inventory, unification rules, subsystem specs, and how every future feature plugs in**. [`19`](./19-studio-ux-design.md) owns authoring chrome. [`20`](./20-studio-entity-system.md) owns entities/prefabs. [`21`](./21-studio-world-building-tools.md) owns **every world-building tool and paint→save workflow**.

---

# 0. Non-Negotiable Rules

1. **Do not rewrite working code** (Babylon paint path, WorldMap save, DEMO bootstrap, Quest/Dialogue/Creature/Loot docks, Logic −1 authority) unless it is broken or blocks the unified model.
2. **Do not create parallel systems.** Extend registries, schemas, and docks that already exist.
3. **Maps store references. Servers own behavior. Studio authors configuration.**
4. **Every new editor feature** must declare: which **kernel** API it uses, which **definition registry** it writes, which **map instance** fields it places, and which **hot-reload channel** it emits.
5. Prefer **schema-driven panels** (`entitySchemas` + `SchemaFieldRenderer`) over new hardcoded forms.
6. Prefer **WorldMap** as map source of truth; treat `GameMap` as legacy mirror; do not revive `SaintsMap`.

---

# 1. Complete Audit (as of 2026-08-04)

## 1.1 Existing systems (keep)

| System | Paths | Maturity | Role in master |
| :--- | :--- | :--- | :--- |
| Studio entry | `StudioClient.tsx`, `index.tsx` `mode="studio"`, `StudioEditorShell.tsx` | Working | **Kernel shell** |
| Editor store | `editor-store.ts` | Working | Modes, docks, brush, selection |
| Panel layout | `studioPanelLayout.ts` | Working | Persist dock geometry |
| Session gates | `studioSession.ts` | Working | `isEditorMode`, soft suppress |
| Permissions | `studioPermissions.ts` | Working | Dock / write / server / engine gates |
| World Builder | `WorldBuilderPanel`, `TilesetPicker`, `LogicTagPalette`, `studioTilesetBootstrap` | Working | Paint terrain + Logic |
| Properties | `PropertiesPanel` | Working / overlap | Must become **selection inspector** |
| Asset Manager | `AssetBrowserPanel`, `AssetEditor`, sprites | Working | Asset registry dock |
| NPC place | `NpcEditorPanel`, `map-npcs.ts` | Partial | Entity place → needs live push |
| Quest Editor | `QuestEditorPanel`, `quest-templates.ts` | Working | Definition registry |
| Dialogue Editor | `DialogueEditorPanel`, `npc-dialogue.ts` | Working | Definition registry (mode default gap) |
| Creature Catalog | `CreatureDefEditorPanel`, catalogs | Working | Definition registry |
| Loot Manager | `LootManagerPanel`, `/api/loot/tables`, `lootRefs.ts` | Working | Economy definition registry |
| Classes / Heroes | `ClassEditorPanel`, `StarterHeroEditorPanel` | Working | Progression registries |
| Dev Tools | `DevToolsPanel`, `ServerControl` | Partial | Ops dock (retire nested duplicates) |
| Logic components | `logicComponents.ts` | Working | Tag → paint payload registry |
| Entity schemas | `entitySchemas.ts` | Partial | **Canonical property contracts** |
| SchemaFieldRenderer | `components/SchemaFieldRenderer.tsx` | **Orphaned** | Wire in Phase 2 — do not rebuild |
| Map layer contract | `mapLayers.ts` | Contract ready | Vocabulary + overlay strip |
| Map validation | `mapSaveValidation.ts` | Working | Pre-save guards |
| DEMO bootstrap | `DemoBootstrap`, `demoMapSeed`, tileset GID fill | Working | Keep; extend carefully |
| Map API | `/api/maps`, WorldMap Prisma | Working | Map SoT |
| Live map reload | `admin_reload_map` / `map_reloaded` | Partial | Seed of hot-reload bus |
| World profiles | `WorldProfileBar`, `worldProfiles.ts` | Working | `activeGameId` scoping |

## 1.2 Missing systems (design here; implement in phases)

| Gap | Bible | Design owner in this doc |
| :--- | :--- | :--- |
| Place mode (objects as entities) | 16 Mode 3 | §6.4 Object / Place |
| Script mode (gates / conditions UI) | 16 Mode 5 | §6.7 Logic & Script |
| Schema-bound Properties / NPC | 17 Phase 2 | §5 Schema pipeline |
| Spawner entities + save column | 17 | §6.5 Spawn |
| Resource nodes via schema + loot ref | 17 | §6.9 Resource nodes |
| Item Creator dock | 17 Phase 3 | §6.11 Items |
| Live NPC / content push | 16 fun-first | §7 Hot-reload bus |
| Avatar-free Studio session | 17 Phase 4 | §3.4 Isolation |
| Undo/redo, multi-select, templates | 16/17 UX | §8 Editor chrome |
| Publish private→live | 16 | §9 Permissions & publish |
| Creator permission tier | 16 | §9 |
| Drop-group UI in Loot Manager | 17 | §6.10 Loot |

## 1.3 Duplicate / parallel systems (merge — do not add a third)

| Cluster | Keep | Deprecate / demote | Rule |
| :--- | :--- | :--- | :--- |
| Map persistence | **WorldMap** | GameMap (read-only mirror → retire), SaintsMap (unused) | One SoT; fix map-loader comments |
| Class authoring | **ClassEditorPanel** + ClassDef catalog | `ClassEditor.tsx` + `CharacterClassSystem` / GameConfig CharacterClass | One dock, one table |
| Loot CRUD | **`/api/loot/tables` + LootManager** | GameConfigManager loot writers (or thin-wrap only) | One write path |
| Items | **ItemTemplate** (Prisma) + future Item Creator | Client `ITEM_DB` as hydrate cache only; shop hardcoded lists → ID refs | One ID space |
| Crafting | **CraftingRecipe** Prisma | Duplicate arrays in `shopCatalog` / `data/items` | Recipes reference item IDs |
| Quests | **QuestTemplate** (Studio) | Admin `GameQuest` / client `QUEST_DB` as legacy | Studio SoT |
| Gather nodes | Schema `resource_node` + Logic harvest presets → server resolve | Hardcoded `RESOURCE_NODE_MAP` magic IDs | Config over magic |
| Shops | Vendor entity `shopId` + DB catalog | Hardcoded `shopCatalog` listings + dual OPEN_SHOP paths | One open path |
| Logic paint UX | Build = brush; Properties = inspect | Properties “Components (paint)” duplicate | Split responsibilities |
| Admin game-dev pages | Studio docks | Parallel admin quests/assets as thin deep-links | Prefer Studio |
| DraggablePanel ×2 | Keep both jobs | Rename only (`StudioDock` vs HUD drag) | Different concerns — do not merge code |

## 1.4 Technical debt & inconsistencies

| Issue | Fix direction |
| :--- | :--- |
| Bible “Developer = Studio” vs code `ADMIN=400` entry | Document current levels in ALIGNMENT; add Creator tier later; do not silently lower gates |
| Mode names (`build/npc/…`) ≠ bible (`Paint/Place/…`) | Alias map in store + UI labels; keep internal ids stable |
| Dialogue dock missing from mode defaults | Add to Populate defaults |
| `Ctrl+E` vs bare `e` vs canvas interact | Studio: creation toggle = Ctrl+E only; bare `e` = interact |
| SchemaFieldRenderer unimported | Wire — do not rewrite |
| NPC place without `admin_reload_map` | Emit content-reload channel |
| TileRegistry vs map `tilesetsData` | Studio paint uses map tilesets; TileRegistry = metadata registry later |
| Overlay strip only on known keys | Keep `stripEditorOverlaysFromMapPayload` as export gate |

## 1.5 Generalization opportunities

| Pattern | Shared module |
| :--- | :--- |
| Catalog CRUD docks | `CatalogEditorShell` (list / form / seed / import-export) |
| Entity properties | `getEntitySchema` → `SchemaFieldRenderer` → selection store |
| Logic tags | Single registry: tag → default tile + payload schema + server handler |
| Content reload | Typed `content_reload` bus |
| Mode plugins | Mode → default docks + active tool + selection filter |
| Definition refs | `{ kind, id }` references everywhere on maps |

---

# 2. Master Ecosystem Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SAINTS STUDIO KERNEL                             │
│  /studio → isEditorMode · ModeRouter · DockHost · Selection · History   │
│  Permissions · HotReloadBus · AdvancedTier · WorldProfile (gameId)      │
└─────────────┬───────────────────────────────┬───────────────────────────┘
              │                               │
              ▼                               ▼
┌──────────────────────────┐    ┌─────────────────────────────────────────┐
│   DEFINITION REGISTRIES  │    │         MAP DOCUMENT (instances)        │
│  (global / per gameId)   │    │  WorldMap columns → StudioMapDocumentV1 │
│  ItemTemplate            │◄───│  terrain / collision / objects          │
│  LootTable + LootRef     │ refs│  entities / spawners / encounters      │
│  CreatureDef             │    │  logic (−1) / editor_overlay (no export)│
│  QuestTemplate           │    └─────────────────────────────────────────┘
│  NpcDialogueTree         │                    │
│  ClassDef / StarterHero  │                    ▼
│  GameAsset / tilesets    │    ┌─────────────────────────────────────────┐
│  ShopCatalog (future DB) │    │              GAME SERVER                │
│  LogicComponent registry │    │  Resolve refs → behavior · authority    │
└──────────────────────────┘    │  Hot-reload consumers · no map embeds   │
                                └─────────────────────────────────────────┘
```

**Rule:** Registries never store world positions. Maps never store full item/loot/quest bodies.

---

# 3. Studio Kernel (detailed)

## 3.1 Process model

| Concern | Implementation | Notes |
| :--- | :--- | :--- |
| Entry | `/studio` → `StudioClient` → `TheLobby mode="studio"` | Same Babylon world as lobby |
| Flag | `setEditorMode(true)` in lobby mount | `studioSession.ts` |
| Shell | `StudioEditorShell` | Mode chip + dock host + Walk chip |
| Store | `useEditorStore` (zustand) | Single UI state owner |
| Layout | `studioPanelLayout` → localStorage | Per-user workspace |

**Do not** create a second editor React tree or a second canvas.

## 3.2 Mode system (unify bible ↔ code)

Internal ids stay stable for layout persistence. **UI labels** map to bible names:

| Internal `StudioMode` | Bible name | Default docks | Active tool |
| :--- | :--- | :--- | :--- |
| `test` | **Walk** | (none / minimal) | Play — combat/HUD on |
| `build` | **Paint** | build, properties | Terrain + Logic brush |
| `place` (**add**) | **Place** | build, properties, assets | Place object/entity prefab |
| `npc` | **Populate** (NPCs) | npc, dialogue, properties | Place/select NPC |
| `quest` | **Populate** (quests) | quest, dialogue, npc | Quest wiring |
| `creature` | **Populate** (creatures) | creature, loot, properties | Creature / encounter |
| `script` (**add**) | **Script** | properties, quest | Logic components / conditions |

Phase delivery: add `place` and `script` as aliases of tools first (same store), then first-class modes. Until then, document Build as Paint+partial Script via Logic tags.

**Mode plugin contract** (future code shape — extend store, do not fork):

```ts
type ModePlugin = {
  id: StudioMode;
  bibleName: string;
  defaultDocks: PanelId[];
  selectionFilter: EntitySchemaKind[] | "tiles" | "any";
  showsGameplayHud: boolean; // false except Walk
  tool: "brush" | "place" | "select" | "none";
};
```

## 3.3 Dock host

| Dock `PanelId` | Registry / concern | Min level (today) |
| :--- | :--- | :--- |
| `build` | Terrain + Logic paint | ADMIN 400 |
| `properties` | Selection inspector (schema) | 400 |
| `assets` | GameAsset / sprites | 400 |
| `npc` | Map NPC instances + def refs | 400 |
| `quest` | QuestTemplate | 400 |
| `dialogue` | NpcDialogueTree | 400 |
| `creature` | CreatureDef | 400 |
| `loot` | LootTable | 400 |
| `characters` | StarterHero | 400 |
| `classes` | ClassDef | 400 |
| `items` (**add Phase 3**) | ItemTemplate | 400 |
| `dev` | Server / engine | 400 / 1000 for engine |

**Rules**

* Closing a dock ≠ exit creation mode.
* Dialogue must appear in Populate mode defaults.
* New docks register in: `PanelId`, `STUDIO_DOCK_MIN_LEVEL`, `DEFAULT_PANELS`, shell switch, permissions type — **one checklist, no orphan panels**.

## 3.4 Isolation (`isEditorMode`)

| State | Combat / encounters | Gameplay HUD | Paint / docks | Avatar |
| :--- | :---: | :---: | :---: | :---: |
| Create tools open | Soft-off (Phase 1) | Off | On | Present (today) |
| Walk Mode | On | On | Off | Present |
| Avatar-free (Phase 4) | Off unless Walk | Off | On | Optional ghost / none |

**Never** export `editor_overlay` / Studio-only keys into player map payloads (`stripEditorOverlaysFromMapPayload`).

## 3.5 Selection & history (target)

Extend `editor-store` — do not add a parallel selection store:

```ts
selection: {
  kind: "none" | "tile" | "entity" | "multi";
  mapId: string;
  tiles?: Array<{ x: number; y: number; layer: number }>;
  entityIds?: string[];
};
history: { undoStack: EditorOp[]; redoStack: EditorOp[] }; // Phase 2+
```

`EditorOp` is a tagged union: `paintTiles`, `placeEntity`, `patchEntity`, `deleteEntity`, `patchLogic`, `patchMapMeta`. Undo applies inverse ops against the same WorldMap draft buffer the brush already uses.

---

# 4. Document & Persistence Model

## 4.1 Source of truth

| Data | SoT | Legacy |
| :--- | :--- | :--- |
| Maps | **WorldMap** (`grid`, `tileLayersData`, `tilesetsData`, `npcsData`, `encountersData`, …) | GameMap mirror; SaintsMap unused → remove or archive |
| Logic collision | Logic layer −1 + `MapLogicTile` defs | — |
| Definitions | Prisma tables per registry | Client static DBs = hydrate/fallback only |

## 4.2 Target additive document (`StudioMapDocumentV1`)

Already defined in `mapLayers.ts`. **Serialization strategy:**

1. Keep writing current WorldMap columns (no big-bang migration).
2. Add nullable JSON columns when needed: `objectsData`, `spawnersData` (or fold spawners into `entities` with `kind:"spawner"`).
3. Provide `worldMapToStudioDocument` / `studioDocumentToWorldMap` adapters in shared — single place for dual-shape.
4. Validators run on the document view, then adapters write columns.

## 4.3 Instance vs definition

```json
{
  "id": "npc_mayor_01",
  "kind": "npc",
  "position": { "x": 12, "y": 8 },
  "rotation": 0,
  "defRef": null,
  "props": {
    "displayName": "Mayor",
    "dialogueTreeId": "dlg_mayor_intro",
    "questGiverIds": ["q_welcome"],
    "shopId": null,
    "loot": { "strategy": "pool", "poolId": "npc_default" }
  }
}
```

Definitions (`dialogueTreeId`, `loot.poolId`, `shopId`) resolve at runtime on the server.

## 4.4 Layer binding (runtime today → target)

| Conceptual | Today | Target |
| :--- | :--- | :--- |
| Terrain | `tileLayers` 0–3 | Same |
| Collision | Logic −1 solid/walk | Same authority (`08`) |
| Object | Painted tiles / logic harvest | Placeable entities + optional visual tile |
| Entity | `npcsData` | Unified `entities[]` including NPC/monster/chest… |
| Spawn | Missing | `spawners[]` or entity kind `spawner` |
| Logic | Logic −1 + components | Same + Script mode UI |
| Editor overlay | Client-only | Never persisted / stripped |

---

# 5. Schema-Driven Property Pipeline

## 5.1 Existing pieces (reuse)

* `entitySchemas.ts` — kinds: npc, monster, resource_node, spawner, encounter_zone, door, chest, decoration, warp
* `SchemaFieldRenderer.tsx` — string/number/boolean/enum/lootRef/json + nested
* Tests: `entitySchemas.test.ts`

## 5.2 Target wiring (Phase 2 — no new renderer)

```
Select entity/tile
  → resolve kind (from entity.kind or logic component tag)
  → getEntitySchema(kind)
  → PropertiesPanel renders categories via SchemaFieldRenderer
  → onChange patches selection draft
  → Save → map API / entity API
  → HotReloadBus.emit(...)
```

**NpcEditorPanel** becomes: place tool + list + thin wrapper that opens Properties for the selected NPC (schema), not a second full form forever.

**PropertiesPanel** drops duplicate Logic paint; keeps “selected logic tile inspect/edit” via schema or `logicComponents` field schema.

## 5.3 Extending schemas

New gameplay systems add fields to existing kinds or register a new `EntitySchemaKind` **once** in `entitySchemas.ts`. They do not invent a one-off panel unless the UX needs a specialized graph editor (dialogue/quest graphs already have docks — those stay specialized, but leaf fields still use shared field types).

Advanced fields use `advanced: true` + global Advanced Mode toggle (Phase 2).

---

# 6. Subsystem Specs (production-ready design)

Each subsection: **purpose · reuse · data · Studio UX · server · hot-reload · anti-patterns**.

## 6.1 Terrain (Paint)

* **Purpose:** Visual ground and layering (0–3).
* **Reuse:** WorldBuilder + Babylon GID paint + DEMO tileset bootstrap (`DEFAULT_STUDIO_GROUND_GID`).
* **Data:** `tileLayersData` + `tilesetsData` on WorldMap.
* **UX:** Paint mode; brush size; layer picker; never imply collision from visuals.
* **Server:** Serves layers to clients; no gameplay from GID alone.
* **Hot-reload:** Existing `admin_reload_map`.
* **Anti-pattern:** New tileset system parallel to map `tilesetsData`; filling maps with broken GIDs (stair fragment).

## 6.2 Collision

* **Purpose:** Walkable / solid / hazard / climbable.
* **Reuse:** Logic layer −1 as authority (`08`).
* **Data:** Logic grid cells + `MapLogicTile` definitions.
* **UX:** Paint collision tags via LogicTagPalette; Properties inspect cell.
* **Server:** Movement / LoS reads Logic −1.
* **Hot-reload:** Map reload.
* **Anti-pattern:** Client-only collision meshes as authority.

## 6.3 Logic regions & tags

* **Purpose:** Safe/PvP, music, weather, quest gates, teleports, harvest, shop open, encounters.
* **Reuse:** `logicComponents.ts` presets + Properties warp/encounter editors.
* **Data:** Logic −1 cell payload referencing component id + params.
* **UX:** Script mode focuses this; Build may still paint for speed.
* **Server:** Handler registry keyed by component type.
* **Hot-reload:** Map reload + optional `logicTile` channel when defs change.
* **Anti-pattern:** Embedding full quest JSON in a tile.

## 6.4 Objects / Place mode

* **Purpose:** Trees, doors, stations, furniture as **objects** (position, collision, interaction), not only painted pixels.
* **Reuse:** `entitySchemas` kinds decoration/door/chest/resource_node; Asset browser for sprites.
* **Data:** Start with entities in `npcsData`-like JSON or new `objectsData`; adapter in `mapLayers`.
* **UX:** Place mode: pick prefab → click world → select → Properties schema.
* **Server:** Interact / collision from entity props + logic.
* **Hot-reload:** `content_reload` `{ type: "map_entities", mapId }`.
* **Anti-pattern:** Second object format beside entities; Place mode that only paints GIDs without props.

## 6.5 Entities (NPC, monster, chest, …)

* **Purpose:** Unique placed gameplay actors.
* **Reuse:** `NpcEditorPanel` place path; schemas; dialogue/quest refs.
* **Data:** Map instances with refs to dialogue/loot/shop/quests.
* **UX:** Populate modes; schema Properties; multi-select later.
* **Server:** Spawn from map JSON on join / reload.
* **Hot-reload:** **Must** push NPC diffs (today: rejoin — gap to close first in Phase 2).
* **Anti-pattern:** Duplicating dialogue trees inside NPC rows.

## 6.6 Spawners

* **Purpose:** Invisible population controllers (pools, weights, caps, wander, conditions).
* **Reuse:** `SPAWNER_FIELDS` in `entitySchemas`; CreatureDef catalog; encounter pool UI seeds patterns.
* **Data:** `spawners[]` or entities with `kind:"spawner"`; reference CreatureDef / loot by id.
* **UX:** Place invisible marker; Properties schema; optional radius overlay (editor_overlay only).
* **Server:** Spawner system ticks; never bake creature stats into spawner beyond overrides.
* **Hot-reload:** Reload spawners on map without full disconnect when possible.
* **Anti-pattern:** Hardcoded spawn tables in server code per map.

## 6.7 Script / gates / events

* **Purpose:** Warps, triggers, step-actions, conditions without deploying code.
* **Reuse:** Logic components, quest conditions, dialogue actions.
* **Data:** Component payloads + quest/dialogue graphs.
* **UX:** Script mode + specialized Quest/Dialogue docks for graphs.
* **Server:** Condition evaluators shared with quests.
* **Hot-reload:** Quest/dialogue channels + map logic.
* **Anti-pattern:** Per-map custom TypeScript hooks in the client.

## 6.8 Encounters (overworld → TB)

* **Purpose:** Zones that start turn-based battles / capture loops.
* **Reuse:** Logic encounter paint, `encountersData`, battle constitution (07/11).
* **Data:** Zone rect/cells + pool refs; entity kind `encounter_zone` for props.
* **UX:** Paint zone + Properties (pool, chance, level gates).
* **Server:** EncounterManager authority; Studio create tools soft-suppress.
* **Hot-reload:** Map + encounter table invalidate.
* **Anti-pattern:** RT capture on hotbar; Studio create-mode force-starting battles.

## 6.9 Resource nodes

* **Purpose:** Chop/mine/fish/gather nodes with skill, XP, respawn, loot.
* **Reuse:** Schema `resource_node`, Logic harvest presets, Inventory/Skill managers.
* **Data:** Prefer entity or logic cell with `LootRef` + skill params — **migrate off** `RESOURCE_NODE_MAP` magic tile ids.
* **UX:** Place Resource Node prefab or paint harvest tag; Properties schema.
* **Server:** Resolve node def → skill check → roll `LootRef`.
* **Hot-reload:** Map entities + loot pool version.
* **Anti-pattern:** New gather ID table disconnected from Loot Manager.

## 6.10 Loot & economy

* **Purpose:** Central pools; maps only store `LootRef`.
* **Reuse:** `lootRefs.ts`, Loot Manager, `/api/loot/tables`, Prisma `LootTable`.
* **Data:** Pool / override strategies; later drop groups (guaranteed / rare / event / quest).
* **UX:** Loot dock: CRUD, search, simulate, clone; schema `lootRef` fields everywhere.
* **Server:** Single roll API used by combat, nodes, chests, NPC death.
* **Hot-reload:** `content_reload { type: "loot", poolId }` → invalidate cache.
* **Anti-pattern:** Second loot writer (GameConfigManager) without wrapping the same service; embedding item blobs in maps.

## 6.11 Items (Item Creator)

* **Purpose:** Author `ItemTemplate` once; all systems reference `itemId`.
* **Reuse:** Prisma `ItemTemplate`; SchemaFieldRenderer patterns; CatalogEditorShell.
* **Data:** ItemTemplate SoT; client `ITEM_DB` becomes generated/hydrated cache.
* **UX:** New `items` dock (Phase 3): stats, icons, tags, stack, bind, economy value, dependency viewer (“used by loot X, recipe Y”).
* **Server:** Inventory/combat/shops read templates.
* **Hot-reload:** `content_reload { type: "item", itemId }`.
* **Anti-pattern:** New `ITEM_DB` entries without Prisma; shop rows with inline item stats.

## 6.12 Shops / vendors

* **Purpose:** NPC or station opens a shop by id.
* **Reuse:** NPC schema `shopId`; dialogue/logic `OPEN_SHOP` actions — **unify to one**.
* **Data:** Shop catalog table (migrate from `shopCatalog.ts`) listing `itemId` + price + stock rules.
* **UX:** Vendor category on NPC Properties; Shop editor can live under Items or Dev until dedicated dock.
* **Server:** Open shop by id; validate purchases.
* **Hot-reload:** `shop` channel.
* **Anti-pattern:** Two OPEN_SHOP implementations with different catalogs.

## 6.13 Quests & dialogue

* **Purpose:** Narrative graphs and objectives.
* **Reuse:** Existing Quest + Dialogue docks and Prisma models (15).
* **Data:** Templates reference item/creature/npc ids; map NPCs reference tree ids.
* **UX:** Keep specialized graph UIs; leaf fields use shared controls; open dialogue dock in Populate defaults.
* **Server:** QuestManager / dialogue runtime.
* **Hot-reload:** `quest` / `dialogue` channels (DB read today → add invalidate).
* **Anti-pattern:** Parallel `GameQuest` authoring as a second SoT.

## 6.14 Creatures & classes & heroes

* **Purpose:** Combat templates and playable progression defs.
* **Reuse:** CreatureDef / ClassDef / StarterHero panels.
* **Data:** Prisma catalogs; maps/spawners reference creature ids only.
* **UX:** CatalogEditorShell consolidation over time; **retire** Dev Tools nested `ClassEditor`.
* **Server:** Combat / unlock systems.
* **Hot-reload:** `creature` / `class` channels.
* **Anti-pattern:** Dual CharacterClass tables.

## 6.15 Assets & tilesets

* **Purpose:** Sprites, tilesheets, audio, prefabs metadata.
* **Reuse:** Asset Manager dock + map-embedded tilesets for paint.
* **Data:** GameAsset registry; map `tilesetsData` for GID mapping; TileRegistry optional metadata.
* **UX:** Asset browser; bootstrap ensures DEMO never black-voids.
* **Server:** Serves URLs; no gameplay authority.
* **Hot-reload:** Asset URL bump / map reload.
* **Anti-pattern:** Requiring TileRegistry for basic paint to work.

## 6.16 Live play-test (Walk)

* **Purpose:** Instant verification in the same world.
* **Reuse:** `test` mode + soft suppress when leaving Walk.
* **Data:** Same map shard players use (careful with official maps — Admin only).
* **UX:** One click Walk; docks hide; HUD returns.
* **Server:** Normal gameplay systems.
* **Anti-pattern:** Separate “preview scene” build.

## 6.17 Dev / ops

* **Purpose:** Shard controls, diagnostics, engine config.
* **Reuse:** DevTools + ServerControl; `canUseStudioServerControls` / engine level.
* **UX:** Permission-gated tabs; Start Realm Admin+.
* **Anti-pattern:** Hiding server start from logged-out users incorrectly — already gated; keep it that way.

---

# 7. Hot-Reload Bus (matrix)

Unify ad hoc reloads into one typed event (socket + server cache):

```ts
type ContentReloadEvent =
  | { type: "map"; mapId: string; version: number }
  | { type: "map_entities"; mapId: string }
  | { type: "loot"; poolId?: string }
  | { type: "item"; itemId?: string }
  | { type: "quest"; questId?: string }
  | { type: "dialogue"; treeId?: string }
  | { type: "creature"; creatureId?: string }
  | { type: "shop"; shopId?: string }
  | { type: "logic_tile"; tileId?: string };
```

| Content | Today | Target |
| :--- | :--- | :--- |
| Map tiles / logic | `admin_reload_map` | Keep as `map` |
| NPC place | Rejoin required | `map_entities` without full disconnect |
| Loot pools | DB only | Invalidate + `loot` |
| Quests / dialogue | DB only | Invalidate + events |
| Items / shops | Mixed | Events after Item Creator |
| Resource nodes | Via map reload | Entities + loot |

**Implementation rule:** New save endpoints must call one helper `emitContentReload(event)` — no one-off socket names per feature.

---

# 8. Editor Chrome & UX Contracts

From `16`, made actionable:

| Feature | Phase | Hook point |
| :--- | :---: | :--- |
| Floating docks | 1 ✅ | `StudioEditorShell` |
| Mode defaults include dialogue | 2 | `STUDIO_MODE_DEFAULTS` |
| Schema Properties | 2 | Wire renderer |
| Advanced Mode toggle | 2 | Hide `advanced` fields |
| Undo/redo | 2–3 | `EditorOp` history |
| Multi-select | 3 | Selection store |
| Prefab templates | 3 | Asset / entity templates |
| Context menus | 3 | Canvas pick |
| Publish checklist | 4 | Permissions + map flags |
| Collab cursors | 5+ | Editor sockets (after avatar-free) |

Rename only for clarity: `editor/DraggablePanel` → consider `StudioDock` (optional refactor, low priority).

---

# 9. Permissions & Publish

| Role (bible 16) | Target capability | Code today |
| :--- | :--- | :--- |
| Player | No `/studio` | OK |
| Creator | Sandbox / claims whitelist | **Missing tier** — deferred |
| Developer | Full authoring on official maps | Partially inverted naming |
| Admin | Publish, force-save, server controls | ADMIN 400 opens Studio; DEVELOPER 1000 engine tabs |

**Alignment rule:** Keep numeric gates; document honestly; when Creator tier lands, only lower **sandbox** docks — never publish/server.

Publish flow (Phase 4): map `status: draft|review|live` + Admin promote; never let draft JSON overwrite live without version bump + reload bus.

---

# 10. Plugin Model for Future Systems

Housing, farming, guild halls, seasons, raids, crafting trees, vehicles, etc. **must** plug in as:

1. **Definition registry** (Prisma + Catalog dock or schema fields), and/or
2. **Entity kind** (+ `entitySchemas` entry), and/or
3. **Logic component** (+ server handler), plus
4. **Hot-reload channel**, plus
5. **ModePlugin** dock defaults if a new primary workflow is needed.

Checklist for PR authors (copy into ALIGNMENT / PR template):

```
[ ] Reuses WorldMap / existing dock / entitySchemas / lootRefs?
[ ] No new parallel item/loot/quest/map table?
[ ] Map stores references only?
[ ] Emits content_reload?
[ ] Strips editor overlays on export?
[ ] Respects isEditorMode / Walk vs create?
[ ] Permissions registered in studioPermissions?
```

---

# 11. Phased Delivery (after Phase 1)

| Phase | Deliverables | Explicit non-goals |
| :--- | :--- | :--- |
| **1 Foundation** ✅ | `isEditorMode`, schemas, mapLayers, lootRefs, Loot Manager, soft suppress | Full hot-reload matrix |
| **2 Entity authoring** | Wire SchemaFieldRenderer; Properties = inspector; NPC live push; dialogue defaults; drop-group UI start; mode label aliases; fix `e` hotkey | Item Creator; avatar-free; GameMap deletion |
| **3 Place + Items** | `place` mode; objects/spawners columns or entity kinds; Item Creator dock; unify shop ids; CatalogEditorShell extraction | Collab; full undo everywhere |
| **4 Script + Isolation** | `script` mode polish; avatar-free option; publish flags; overlay export tests | Microservice split |
| **5 Economy ops** | Pool versioning, bulk rebalance, seasonal modifiers, dependency viewer completeness | Rewriting Babylon |

---

# 12. Anti-Patterns (never again)

1. New map table beside WorldMap without migration plan.
2. New loot/item/quest writer that bypasses Studio registries.
3. Hardcoded gather/shop IDs when LootRef/ItemTemplate exist.
4. Orphan UI components (built but never imported) — wire or delete within one phase.
5. Modal-only editors for routine property edits.
6. Exporting Studio overlays to players.
7. Rewriting Babylon / Socket.io / Prisma loaders “for cleanliness.”
8. Second mode system or second dock store.
9. Documenting a fifth architecture bible page that contradicts 08/16/17 — **extend this master instead**.

---

# Final Rule

**One kernel. One map SoT. One definition ID space. One schema pipeline. One reload bus.**

Studio should feel like playing with god powers (`16`) while every subsystem plugs into this ecosystem like a AAA editor — without cloning Unreal by rebuilding what already works.
