# Saints Studio — Complete Entity System (20)

**Status:** Production entity architecture (audit-backed)  
**Date:** 2026-08-04  
**Scope:** Unified architecture for every placed world object — lifecycle, serialization, components, schemas, validation, events, references, dependencies, runtime conversion, editor metadata, prefabs, templates, variants, inheritance, composition.

> **Companions (do not fork)**
> - [`18-studio-master-architecture.md`](./18-studio-master-architecture.md) — registries, map SoT, hot-reload, reuse rules
> - [`19-studio-ux-design.md`](./19-studio-ux-design.md) — Inspector, Outliner, Place mode, gizmos
> - [`21-studio-world-building-tools.md`](./21-studio-world-building-tools.md) — paint vs place; buildings/vegetation tools
> - [`22-studio-npc-ai-creature-editors.md`](./22-studio-npc-ai-creature-editors.md) — NPC/AI components used by instances
> - [`17-studio-world-builder-economy.md`](./17-studio-world-builder-economy.md) — Phase 1 schemas / loot refs
> - [`08`](./08-world-building-editor-architecture.md) — Logic (−1) collision authority
> - [`15`](./15-quests-dialogue-npc-ai.md) — dialogue / quest / AI behaviour intent

**This document is the entity master.** Existing `entitySchemas.ts`, `lootRefs.ts`, `mapLayers.ts`, `logicComponents.ts`, `WorldMap.npcsData` / `gatesData` / Logic grid are **inputs to unify** — not systems to rewrite in one shot. World paint vs place tools: **`21`**. NPC/AI/creature editors: **`22`**.

---

# 0. Non-Negotiable Rules

1. **Everything placeable is an Entity** (NPC, monster, tree, chest, door, spawner, warp, encounter zone, future housing plot marker, farm tile actor, raid crystal, …).
2. **Maps store Entity Instances** (identity + transform + component data + refs). **Registries store Definitions** (items, loot, creatures, dialogue, prefabs).
3. **Composition over giant inheritance trees.** “Kinds” are **archetype presets** (default component sets), not sealed class hierarchies that force editor forks.
4. **New gameplay = new components (+ optional archetype + schema fields + server system).** The Inspector, Outliner, save pipeline, and Prefab browser must not need a rewrite.
5. **Logic (−1) remains collision / region authority** for tile-painted behaviours during migration. Logic cells may **project** to entities or host `LogicBinding` components — do not invent a second collision grid.
6. **Do not replace** `CreatureManager` / Babylon meshes overnight — define **adapters** from Entity Document → existing spawn APIs.
7. **References by id only** (`LootRef`, `dialogueId`, `creatureDefId`, …). Never embed full definition blobs in instances.

---

# 1. Audit Summary (today → target)

| Today | Problem | Target |
| :--- | :--- | :--- |
| `npcsData` flat `{id,name,x,y,sprite,…}` | Not compositional; schema unused | Entity instances with components |
| `gatesData` separate | Parallel warp model | Entity `kind: warp` or `Warp` component |
| Logic tiles 5/6 + `RESOURCE_NODE_MAP` | Magic ids; schema `resource_node` unused | ResourceNode component + loot ref |
| `encountersData` unused by EncounterManager | Drift | EncounterZone entity / component |
| Spawners / doors / chests | Schema only | First-class entities |
| Hardcoded DEMO wild spots | Not authorable | Spawner entities |
| `entitySchemas` + orphan renderer | Ahead of runtime | Schema = component property UI |
| No prefab / variant / inherit | Copy-paste seeds | Prefab registry (§12–15) |

---

# 2. Core Model

## 2.1 Vocabulary

| Term | Meaning |
| :--- | :--- |
| **Entity** | Addressable world object with stable `id`, transform, tags, and a set of **components**. |
| **Component** | Typed data bag + optional editor schema + optional runtime system. No behaviour code inside map JSON. |
| **Archetype** | Named default component set + editor metadata (`npc`, `resource_node`, …). Soft “kind”. |
| **Definition** | Global registry row (ItemTemplate, LootTable, CreatureDef, DialogueTree, Prefab). |
| **Instance** | Map-local entity (or runtime clone of a prefab). |
| **Prefab** | Serializable entity template in a registry; Place stamps instances. |
| **Template** | Studio-facing alias for prefab **or** definition seed (clarify in UI: “Prefab” for world objects, “Definition” for catalogs). |
| **Variant** | Prefab or instance that overrides a parent prefab’s component fields. |
| **Inheritance** | Prefab parent chain (data inheritance), not OOP class inheritance in TypeScript. |
| **Composition** | Entity = transform + components[]; systems query components. |

## 2.2 Canonical instance document

```ts
type EntityId = string; // "ent_npc_mayor_01" — stable within map; globally unique as `${mapId}:${id}`

type Vec2 = { x: number; y: number };

type EntityRef =
  | { type: "entity"; mapId: string; entityId: EntityId }
  | { type: "definition"; registry: DefinitionRegistry; id: string }
  | { type: "loot"; ref: LootRef }
  | { type: "logic_tile"; tileId: number }; // migration bridge

type EntityInstanceV1 = {
  /** Schema version for this entity blob */
  v: 1;
  id: EntityId;
  /** Archetype id — drives default components & Inspector schema groups */
  archetype: ArchetypeId;
  /** Optional prefab this instance was stamped from */
  prefabId?: string;
  /** Prefab parent overrides already baked or kept live — see §14 */
  inheritFrom?: string;

  transform: {
    x: number;
    y: number;
    z?: number;          // draw layer bias / future
    rotation?: number;   // 0–3 facing for 2D
    scale?: number;
  };

  /** Soft labels for search / conditions */
  tags: string[];

  /** Component map: componentType -> data */
  components: Record<ComponentTypeId, ComponentData>;

  /** Editor-only; stripped on runtime export */
  editor?: EntityEditorMeta;

  /** Instance-local blackboard (quest flags mirrors, etc.) — advanced */
  variables?: Record<string, unknown>;
};
```

## 2.3 Map document entities array

Extend `StudioMapDocumentV1` (`mapLayers.ts`):

```ts
entities: EntityInstanceV1[];
// spawners/objects fold INTO entities (archetype distinguishes).
// Keep spawners[] only as deprecated alias during migration.
```

**Persistence strategy (additive):**

| Phase | Storage |
| :--- | :--- |
| Now | Continue `npcsData` / `gatesData` / logic grid |
| E1 | Add `WorldMap.entitiesData` JSON (nullable); dual-write NPCs+gates as entities |
| E2 | Runtime prefers `entitiesData`; adapters fill legacy columns for old clients |
| E3 | Stop requiring legacy columns for new maps |

Never big-bang delete `npcsData` until adapters + smoke are green.

---

# 3. Entity Lifecycle

## 3.1 Authoring lifecycle (Studio)

```
[Prefab/Archetype pick]
    → instantiate (defaults + inheritance flatten)
    → place (transform)
    → edit components (Inspector)
    → validate (client soft + server hard on save)
    → serialize into map draft
    → save → strip editor meta → persist
    → emit content_reload { type: "map_entities", mapId }
```

| Stage | Owner | Notes |
| :--- | :--- | :--- |
| Create | Place tool / DnD / Outliner + | `defaultEntityFromArchetype` |
| Update | Inspector / gizmo / batch | Dirty map flag (`19`) |
| Duplicate | Ctrl+D | New id; offset transform +1,+1 |
| Delete | Del | Remove from draft; runtime despawn on reload |
| Save | Ctrl+S | Server validateEntityDocument |
| Discard | Revert / reload map | Drop draft |

## 3.2 Runtime lifecycle (server)

```
Map load / reload
  → deserialize entities (+ legacy adapters)
  → filter !editor.editorOnly && enabled
  → for each: RuntimeFactory.fromEntity(instance)
       → spawnCreature / registerGate / registerNode / registerSpawner …
  → systems tick (AI, spawn, gather respawn, …)
  → events (interact, death, deplete, …)
  → despawn / respawn per components
  → map unload → destroy all runtime bindings
```

| State | Meaning |
| :--- | :--- |
| `authored` | Exists only in map JSON |
| `loading` | Deserialized, not yet spawned |
| `active` | Bound to runtime handle (`runtimeId`) |
| `disabled` | `Enabled` component false or conditions failed |
| `depleted` | ResourceNode empty; waiting respawn |
| `despawned` | Removed but may respawn |
| `destroyed` | Permanent (one-time chest, etc.) |

Track binding:

```ts
type RuntimeBinding = {
  entityId: EntityId;
  mapId: string;
  runtimeKind: "creature" | "gate" | "node" | "spawner" | "zone" | "prop";
  runtimeId: string; // CreatureState.id, gate id, …
};
```

## 3.3 Soft suppress in Studio create tools

`isEditorMode` + create tools (`studioSession`): do not fire encounter/combat from entity zones while painting; Walk Mode activates full lifecycle (`17`/`18`).

---

# 4. Serialization

## 4.1 Rules

1. JSON-stable key order not required; **ids must be stable**.
2. `editor` key stripped by `stripEditorOverlaysFromMapPayload` **and** dedicated `stripEntityEditorMeta`.
3. Unknown component types: **preserve round-trip** (do not drop) but flag validation warning — enables forward compat.
4. Floats: store integers for tile x/y; scale as number.
5. Max payload: validate entity count / component size server-side.

## 4.2 Export profiles

| Profile | Includes | Use |
| :--- | :--- | :--- |
| `studio` | Everything + editor meta | Autosave draft (optional) |
| `persist` | entities without `editor` | WorldMap.entitiesData |
| `runtime` | persist + resolved defaults from prefab flatten | Server memory after load |
| `legacy_npcs` | Adapter → `{id,name,x,y,sprite,direction}` | Dual-write / old tools |

## 4.3 Legacy adapters (required — do not rewrite seeds first)

```ts
// Conceptual API in shared/game/entityAdapters.ts (future module)
npcsDataToEntities(npcs: MapNpcData[]): EntityInstanceV1[]
entitiesToNpcsData(entities: EntityInstanceV1[]): MapNpcData[]
gatesDataToEntities(gates: StudioWarpGate[]): EntityInstanceV1[]
entitiesToGatesData(entities: EntityInstanceV1[]): StudioWarpGate[]
logicCellToProjectedEntity?(...) // optional debug view
```

Field mapping (NPC):

| Legacy | Entity |
| :--- | :--- |
| `id` | `id` (prefix `ent_` if missing) |
| `name` | `components.Identity.displayName` |
| `sprite` | `components.Sprite.spriteId` |
| `x,y` | `transform.x,y` |
| `direction` | `transform.rotation` enum map |
| `dialogue[]` | Prefer `Dialogue.treeId`; keep inline only as migration |

Warp:

| Legacy `spawnPoint` | `Warp.target` `{ mapId, x, y }` |
| `position` | `transform` |

## 4.4 Versioning

* Entity blob `v: 1`.  
* Migrations: `migrateEntity(instance, from, to)` pure functions in shared.  
* Map header may store `entitiesSchemaVersion`.

---

# 5. Components

## 5.1 Component contract

```ts
type ComponentTypeId = string; // "Identity" | "Sprite" | "Dialogue" | ...

type ComponentDef = {
  type: ComponentTypeId;
  /** Human label */
  label: string;
  /** Property schema for Inspector — reuses SchemaField shape */
  fields: SchemaField[];
  /** If true, at most one per entity */
  singleton: true;
  /** Categories for Inspector grouping */
  category?: string;
  /** Server system(s) that consume this */
  systems?: string[];
  /** Whether required for archetype */
  requiredByArchetypes?: ArchetypeId[];
};
```

**Engine rule:** Adding a component = register `ComponentDef` once. Inspector auto-discovers fields. Outliner filters by component presence. No new panel required.

## 5.2 Built-in component catalog (v1)

### Core (almost every entity)

| Component | Data (essentials) | Runtime |
| :--- | :--- | :--- |
| `Identity` | `displayName`, `description?` | Labels, target frame |
| `Sprite` | `spriteId`, `animSet?`, `tint?`, `hidden?` | Client mesh / billboard |
| `Enabled` | `enabled: boolean` | Skip systems if false |
| `Collision` | `mode: none\|block\|overlap`, `height?` | Prefer Logic −1; entity collision for props |
| `Interact` | `radius`, `priority`, `cursor?` | Interact key / gather / talk |

### Gameplay

| Component | Data | Runtime |
| :--- | :--- | :--- |
| `Dialogue` | `treeId` | DialogueManager |
| `QuestGiver` | `questIds: string[]` | QuestManager |
| `Vendor` | `shopId` | Shop open |
| `Loot` | `LootRef` | Death / chest / gather rolls |
| `Combatant` | `hostile`, `level`, `statsRef?`, `creatureDefId?` | Combat / CreatureManager |
| `AI` | `profile`, `behaviour: idle\|wander\|patrol\|guard`, `wanderRadius`, `patrolPath?` | AI tick |
| `Spawner` | `pool` (creature weights), `maxPopulation`, `respawnDelayMs`, `radius`, conditions | Spawner system |
| `ResourceNode` | skill, level, xp, duration, depletion, respawnMs, durability, `Loot` ref optional duplicate → prefer Loot component | Gather |
| `EncounterZone` | rate, level range, `poolRef` / species weights, biome/music | EncounterManager |
| `Warp` | `targetMapId`, `targetX`, `targetY`, `errorMessage?` | Gate / remap |
| `Door` | `locked`, `keyItemId?`, `onOpen` event id | Interact |
| `Container` | `Loot`, `oneTime`, `openedStateKey?` | Chest |
| `Trigger` | `onEnter`/`onExit`/`onInteract` event ops | Script |
| `Conditions` | activeWhen[] (time, quest, weather, event, var) | Gate enablement |
| `Respawn` | `respawnMs`, `despawnBehaviour` | Lifecycle |
| `Faction` | `factionId` | Relationships |
| `LogicBinding` | `logicTileId?`, `paintSync?: boolean` | Migration / dual paint |

### Editor-only (never runtime-critical)

| Component | Data |
| :--- | :--- |
| `EditorOnly` | `editorOnly: true` — strip or never spawn |
| `Gizmo` | `showRadius`, `color` — overlay hints (may live under `editor` meta instead) |

## 5.3 Component data immutability

Map JSON holds **authoritative authored data**. Runtime may keep ephemeral state (`currentHp`, `depletedUntil`) in managers — **not** written back unless an explicit Studio “capture state” tool exists (out of scope).

## 5.4 Query model (server)

```ts
world.query("Spawner", "Enabled")
world.get(entityId).get("Dialogue")
```

Implement as thin indexes over loaded entity arrays inside WorldManager — not a new engine.

---

# 6. Property Schemas

## 6.1 Unify with `entitySchemas.ts`

**Today:** per-archetype flat field lists.  
**Target:** schemas are **views over components**:

```ts
Archetype "npc" => components [
  Identity, Sprite, AI, Combatant?, Dialogue, Vendor?, QuestGiver?, Loot?, Conditions?, Respawn?
]
Inspector renders groupFieldsByCategory(mergeComponentSchemas(components))
```

Migration:

1. Keep `EntitySchemaKind` as `ArchetypeId` aliases.
2. Generate `ENTITY_SCHEMAS.npc.fields` from component field defs **or** maintain explicit archetype schema that must stay in sync via test.
3. `SchemaFieldRenderer` remains the only property widget layer (`19`).
4. Extend `SchemaFieldType` as needed: `ref:dialogue`, `ref:quest`, `ref:creature`, `ref:item`, `vec2`, `stringList` (replace comma-string hacks).

## 6.2 Validation at field level

Reuse min/max/options; add:

```ts
SchemaField.refRegistry?: DefinitionRegistry;
SchemaField.required?: boolean;
SchemaField.inheritible?: boolean; // variant override allowed
```

## 6.3 Advanced Tier

`advanced: true` fields hidden unless Advanced Mode (`19` §19).

---

# 7. Validation

## 7.1 Layers

| Layer | When | Strictness |
| :--- | :--- | :--- |
| Schema | Inspector edit | Soft — block commit on required empty |
| Client map validate | Pre-save | Soft warnings + hard errors |
| Server `validateMapSave` | POST map | **Hard** — reject |
| Runtime load | Map load | Skip invalid entity + log; don’t crash shard |

## 7.2 Entity validators (complete set)

| Check | Error level |
| :--- | :--- |
| Unique `id` within map | Hard |
| `transform` in bounds | Hard |
| Unknown `archetype` | Hard |
| Missing required components for archetype | Hard |
| Unknown component type | Warn (preserve) |
| `LootRef` invalid (`validateLootRef`) | Hard if Loot present |
| `dialogue.treeId` missing in DB | Warn (allow place-before-create) / Hard on publish |
| `questIds` unknown | Warn / Hard on publish |
| `creatureDefId` unknown | Hard if Combatant/Spawner requires |
| NPC on solid Logic cell | Hard (existing) |
| Warp target map missing | Hard on publish; Warn on draft |
| Spawner `maxPopulation` < 1 | Hard |
| Circular prefab inheritance | Hard |
| `editorOnly` true exported to runtime profile | Strip, not error |

Integrate with status-bar Validation popover (`19`).

## 7.3 Publish vs draft

Draft saves may warn on dangling refs. **Publish** (`19` publish wizard) promotes warnings to hard errors.

---

# 8. Events

## 8.1 Authoring events (component hooks)

Stored as data — **not** JS closures:

```ts
type EntityEventOp =
  | { op: "emit"; name: string; payload?: Record<string, unknown> }
  | { op: "open_dialogue"; treeId: string }
  | { op: "open_shop"; shopId: string }
  | { op: "accept_quest"; questId: string }
  | { op: "give_loot"; loot: LootRef }
  | { op: "warp"; targetMapId: string; x: number; y: number }
  | { op: "set_var"; key: string; value: unknown }
  | { op: "despawn_self" };
```

Wire to existing dialogue `KNOWN_ACTIONS` / logic payloads — one dispatcher.

## 8.2 Lifecycle events (engine bus)

Extend existing `GameEngine.events` — do not create a second bus:

| Event | Payload |
| :--- | :--- |
| `entity_spawned` | `{ mapId, entityId, runtimeId }` |
| `entity_despawned` | … |
| `entity_interact` | `{ playerId, entityId }` |
| `entity_depleted` | resource nodes |
| `entity_death` | combatants |
| `spawner_tick` | … |

Studio create-mode suppresses gameplay-facing events that start combat (`studioSession`).

## 8.3 Editor events (client)

| Event | Use |
| :--- | :--- |
| `studio_entity_selected` | Outliner ↔ Inspector ↔ gizmos |
| `studio_entity_moved` | Transform commit |
| `studio_prefab_stamped` | Place tool |
| `studio_sprite_picked` | **Already exists — must set Sprite component** |

---

# 9. References

## 9.1 Reference kinds

| Ref | Stored as | Resolves to |
| :--- | :--- | :--- |
| Loot | `LootRef` | LootTable |
| Dialogue | `treeId: string` | NpcDialogueTree |
| Quest | `questId/slug` | QuestTemplate |
| Creature | `creatureDefId` / slug | CreatureDef |
| Item | `itemId` | ItemTemplate |
| Shop | `shopId` | Shop catalog |
| Prefab | `prefabId` | Prefab registry |
| Entity | `entityId` (+ mapId) | Another instance |
| Logic tile | `logicTileId` | MapLogicTile (bridge) |
| Asset | `spriteId` | GameAsset / sprite key |
| Faction | `factionId` | Faction table (future) |

## 9.2 Rules

* Soft delete definitions → mark broken ref in Validation; don’t cascade-delete instances silently.  
* Rename id → provide Advanced “remap refs” tool (Phase 5).  
* `parseLootRef` / `validateLootRef` remain canonical for loot.

---

# 10. Dependencies

## 10.1 Dependency graph (for Studio “Used by”)

```
ItemTemplate ← LootTable ← Entity.Loot / ResourceNode
CreatureDef ← Spawner / Combatant / EncounterZone
DialogueTree ← Dialogue component
QuestTemplate ← QuestGiver
Shop ← Vendor
Prefab ← Instances (prefabId)
```

API shape:

```ts
type DependencyEdge = {
  from: EntityRef;
  to: EntityRef;
  field: string; // "components.Loot.ref"
};
```

Loot Manager / Item Creator dependency viewer (`18`/`19`) queries this index.

## 10.2 Load order

1. Definitions (items, loot, creatures, dialogue, quests, prefabs)  
2. Map tiles / logic  
3. Entities (resolve refs; warn on missing)  
4. Runtime spawn  

## 10.3 Hot-reload impact

| Changed | Invalidate |
| :--- | :--- |
| Loot pool | Entities with that LootRef (rolls only) |
| Dialogue tree | Talking NPCs |
| Prefab | Option: “Update instances from prefab” (explicit) |
| Entity instance | Remap that entity runtime binding |

---

# 11. Runtime Conversion

## 11.1 Factory matrix

| Components present | Runtime conversion |
| :--- | :--- |
| `Identity`+`Sprite`+`Dialogue` (archetype npc) | `spawnCreature` NPC STATIC (today’s path) |
| `Combatant`+`AI`+`Sprite` (monster) | `spawnCreature` CREATURE/MONSTER |
| `Spawner` | Register spawner controller; children are runtime-only |
| `ResourceNode`(+`Loot`) | Register gatherable node at tile; **replace** `RESOURCE_NODE_MAP` lookup |
| `EncounterZone` | Register zone; EncounterManager reads zone tables |
| `Warp` | Register gate (today’s gates path) |
| `Container`+`Loot` | Chest interact → roll loot |
| `Door` | Interact lock/open; may toggle Collision |
| `Sprite` only | Decoration / OBJECT entityType |
| `EditorOnly` | Skip |

## 11.2 Adapter priority during migration

```
if (entitiesData present) use it
else build entities from npcsData + gatesData
still honor Logic −1 for collision & legacy harvest tiles until ResourceNode entities cover DEMO
```

## 11.3 Client presentation

`creature_spawned` / map entity meshes continue; payload may gain `entityId` + `archetype` for Studio selection sync without new mesh system.

---

# 12. Editor Metadata

```ts
type EntityEditorMeta = {
  locked?: boolean;
  hiddenInOutliner?: boolean;
  notes?: string;
  gizmoColor?: string;
  showRadius?: boolean;
  folder?: string;           // Outliner folder
  icon?: string;
  /** Prefab thumbnail override */
  thumbSpriteId?: boolean | string;
  /** Last focused Inspector category */
  lastCategory?: string;
};
```

Rules:

* Never exported in `runtime` / `persist` profiles (or persist in parallel `entitiesEditorData` if creators need notes — prefer strip for simplicity).  
* Outliner / gizmos read `editor` + components (`19` §5, §10).  
* `editorOnly` entities: teaching markers, collab anchors — stripped from player payloads.

---

# 13. Prefabs

## 13.1 Prefab document

```ts
type PrefabV1 = {
  v: 1;
  id: string;              // "prefab_oak_tree_t2"
  name: string;
  description?: string;
  archetype: ArchetypeId;
  tags: string[];
  /** Parent prefab for inheritance */
  parentId?: string;
  /** Component defaults (same shape as instance.components) */
  components: Record<ComponentTypeId, ComponentData>;
  /** Default transform scale/rotation only — position applied on stamp */
  defaultTransform?: Partial<EntityInstanceV1["transform"]>;
  editor?: EntityEditorMeta;
  createdAt?: string;
  updatedAt?: string;
};
```

## 13.2 Registry

* Prisma table `EntityPrefab` **or** `GameAsset` pack of type `prefab` JSON — prefer dedicated table when implementing.  
* Studio Asset Browser → Prefabs tab (`19`).  
* Official packs vs Creator whitelist (`16`).

## 13.3 Stamp workflow

1. Select prefab → Place tool  
2. Click cell → `instantiatePrefab(prefabId, {x,y})`  
3. New `EntityInstanceV1` with fresh `id`, `prefabId` set, components = flatten(parent chain) + stamp overrides  
4. Select → Inspector  

## 13.4 Update policy

| Policy | Behaviour |
| :--- | :--- |
| `detach` (default on edit) | Instance keeps copy; further prefab edits don’t auto-push |
| `linked` (optional Advanced) | Instance stores only overrides; reload re-flattens |

Default **detach after first divergent edit** to avoid surprising live maps — Roblox-like but safer for MMO.

---

# 14. Templates

Clarify UX language (`19`):

| UI word | Means |
| :--- | :--- |
| **Prefab** | Placeable world entity package (§13) |
| **Definition** | Catalog row (Item, Loot, Creature, Quest…) |
| **Archetype template** | Empty defaults for a kind (New NPC) |
| **Seed template** | DemoBootstrap / Seed buttons |

“Templates” in docs = prefabs + archetype defaults. Do not create a third registry named Templates.

---

# 15. Variants

```ts
type PrefabVariant = {
  id: string;               // "prefab_oak_tree_t2_snow"
  basePrefabId: string;     // parent
  name: string;
  /** Sparse component patches */
  overrides: Record<ComponentTypeId, Partial<ComponentData>>;
  tags?: string[];
};
```

* Variants appear as children in Prefab browser.  
* Stamp flattens `base + overrides`.  
* Use for seasonal skins, elite mobs, biome trees — **not** for one-off map snowflakes (those are instance edits).

---

# 16. Inheritance

## 16.1 Prefab chain

```
prefab_resource_node_base
  └─ prefab_tree_oak
       └─ prefab_tree_oak_elite (variant or child prefab)
```

Flatten algorithm:

```
function flattenPrefab(id):
  chain = [id, parent, …] reversed
  components = {}
  for node in chain:
    deepMerge(components, node.components)
  return components
```

* Detect cycles → validation hard error.  
* Max depth 8.  
* Instance `inheritFrom` optional for linked mode; otherwise bake on stamp.

## 16.2 What is NOT inheritance

* TypeScript class hierarchies for entities  
* Per-map subclassing of server managers  
* Copy-pasting schema field lists without component registration  

Archetypes **compose** required components; they don’t subclass each other in code. Archetype “monster” can be defined as “npc components minus Dialogue plus Combatant defaults” in data.

---

# 17. Composition (how future systems plug in)

## 17.1 Extension checklist (no editor rewrite)

To add e.g. **FarmPlot**, **HousingStake**, **RaidCrystal**, **MailBox**:

1. Register `ComponentDef` (+ fields schema).  
2. Optionally register `ArchetypeId` with default component set.  
3. Add server `System` that `query`s the component.  
4. Add runtime factory branch **or** generic prop spawner.  
5. Add prefab(s).  
6. Hot-reload channel if definitions involved.  
7. Tests: schema defaults, validation, adapter round-trip.

**Inspector / Outliner / Place / Prefab browser pick this up automatically** if they bind to the component registry — that is the UX/`19` obligation when implementing UX-2.

## 17.2 Composition examples

**Vendor NPC**

`Identity + Sprite + Interact + Dialogue + Vendor + QuestGiver?`

**Oak tree**

`Identity + Sprite + Collision + Interact + ResourceNode + Loot + Respawn`

**Area spawner**

`Identity + Spawner + Conditions` (no Sprite, or gizmo-only Sprite hidden in runtime)

**Warp pad**

`Identity + Sprite? + Warp + Interact?` (step vs interact)

**Chest**

`Identity + Sprite + Interact + Container(Loot) + Conditions?`

## 17.3 Logic tile coexistence

Tile-painted harvest/shop/encounter remain valid. Migration path:

* Painting a logic tag may **also** upsert a projected entity with `LogicBinding` (optional Studio setting).  
* Or keep regions as pure Logic until Place mode authors entity nodes.  
* Collision always Logic −1 (`08`).

---

# 18. Archetype Registry (initial)

| ArchetypeId | Default components | Legacy bridge |
| :--- | :--- | :--- |
| `npc` | Identity, Sprite, Interact, Dialogue?, AI, Enabled | `npcsData` |
| `monster` | Identity, Sprite, Combatant, AI, Loot, Respawn, Enabled | DEMO wild → Spawner later |
| `resource_node` | Identity, Sprite, Collision, Interact, ResourceNode, Loot, Respawn | Logic 5/6 |
| `spawner` | Identity, Spawner, Conditions, Enabled | none |
| `encounter_zone` | Identity, EncounterZone, Conditions | Logic 2 + encountersData |
| `warp` | Identity, Warp, Enabled | `gatesData` |
| `door` | Identity, Sprite, Door, Collision, Interact | none |
| `chest` | Identity, Sprite, Container, Interact, Loot | none |
| `decoration` | Identity, Sprite, Collision? | none |
| `trigger` | Identity, Trigger, Conditions | Script mode |
| `generic` | Identity, Enabled | escape hatch |

`defaultEntityProps(kind)` evolves into `defaultEntityFromArchetype(id)`.

---

# 19. Id & Naming

| Kind | Pattern |
| :--- | :--- |
| Entity instance | `ent_{archetype}_{slug}` or uuid; uniqueness per map |
| Prefab | `prefab_{slug}` |
| Variant | `prefab_{slug}_{variant}` |
| Runtime creature | Existing CreatureManager ids; store map in `RuntimeBinding` |

Slugify rules match `placeMapNpc` today.

---

# 20. Phased Delivery

| Phase | Deliverables | Non-goals |
| :--- | :--- | :--- |
| **E0 Docs** ✅ | This bible | Runtime rewrite |
| **E1 Contracts** | `EntityInstanceV1` types in shared; adapters npc↔entity; tests; extend `entitySchemas` as archetype views | New DB column required yet |
| **E2 Dual-write** | `entitiesData` column; save writes entities + legacy; load prefers entities | Delete npcsData |
| **E3 Inspector** | SchemaFieldRenderer on entity selection; Place stamps archetypes | Full prefab DB |
| **E4 Runtime factory** | NPC/Warp/ResourceNode from components; deprecate magic gather map for new nodes | All DEMO converted |
| **E5 Prefabs** | Prefab registry, variants, inheritance flatten, Asset Prefabs tab | Linked instances default |
| **E6 Expand** | Spawner, chest, door, encounter zone systems; dependency viewer | ECS library rewrite |

---

# 21. Anti-Patterns

1. New gameplay object with a **one-off React panel** instead of components.  
2. Embedding item/loot/quest **bodies** in entity JSON.  
3. Parallel `FooData` map column when an archetype would do.  
4. Subclassing `CreatureManager` per content type.  
5. Breaking Logic −1 collision authority.  
6. Dropping unknown components on save (breaks forward compat).  
7. Auto-pushing prefab edits to all instances without an explicit action.  
8. Second event bus beside `GameEngine.events`.  
9. Treating tiles and entities as the same thing — tiles are paint; entities are objects (tiles may *project* entities).  
10. Rewriting Babylon to “real ECS” before adapters work.

---

# 22. File ownership (when implementing)

| Concern | Path (target) |
| :--- | :--- |
| Types + migrate + validate | `src/shared/game/entities/` (`types.ts`, `components.ts`, `archetypes.ts`, `validate.ts`, `migrate.ts`) |
| Adapters | `src/shared/game/entities/adapters.ts` |
| Prefabs | `src/shared/game/entities/prefabs.ts` + Prisma later |
| Schemas UI | Evolve `entitySchemas.ts` + `SchemaFieldRenderer` |
| Runtime factory | `src/server/entity/EntityRuntimeFactory.ts` (name flexible) |
| Tests | `*.test.ts` beside shared modules |

Keep existing managers; factory **calls** them.

---

# Final Rule

**An entity is data. Components are capabilities. Systems are behaviour. Prefabs are reusable data. The editor binds to the registry — not to one-off object types.**

Ship the next gameplay fantasy (farming, housing, seasons, raids) as components and prefabs. If it needs a bespoke Studio rewrite, the architecture was violated.
