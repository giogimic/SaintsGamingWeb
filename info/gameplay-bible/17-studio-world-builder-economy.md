# Saints Studio — World Builder & Economy Architecture (17)

Production architecture for Saints Studio as a complete game creation suite.

> **Companions**
> - [`08-world-building-editor-architecture.md`](./08-world-building-editor-architecture.md) — map JSON, visual layers 0–3, Logic (−1) authority
> - [`16-studio-editor-philosophy.md`](./16-studio-editor-philosophy.md) — creator UX, modes, docks, fun-first loop
> - [`ALIGNMENT.md`](./ALIGNMENT.md) — engineering truth vs bible intent

This document is the **system contract**. `08`/`16` remain the layering and UX sources of truth; this page adds entity/economy isolation and phased delivery.

---

# 1. Design Philosophy

| Concern | Owner |
| :--- | :--- |
| **What exists** on a map | Map JSON (references by ID) |
| **How it behaves** | Game server + reusable definitions |
| **How creators edit** | Saints Studio (`/studio`) |

Rules:

* Maps store **references**, not duplicated balancing data.
* Gameplay logic is never embedded as one-off client hacks.
* Studio code stays isolated from live MMO gameplay systems via `isEditorMode`.
* Prefer schema-driven property panels over hardcoded editor windows.
* Extend existing systems; do not rewrite Babylon, Socket.io, or Prisma map loaders.

---

# 2. Studio Mode Isolation

When Studio launches (`/studio`):

```ts
isEditorMode = true; // src/shared/game/studioSession.ts
```

| System | Create tools (`isCreationMode`) | Walk Mode (play-test) |
| :--- | :---: | :---: |
| Combat / encounters | Off | On (doc 16 fun-first) |
| Gameplay HUD (hotbar, orbs) | Off | On |
| Inventory / progression UI | Off | On |
| Map paint / docks | On | Off |
| Editor overlays | On | Optional |

**Phase 1 (shipped):** flag + soft-suppress combat/encounters while create tools are open; HUD already gated on `!isCreationMode`.

**Later phases:** optional headless editor session (no player avatar), collaborative edit sockets, no gameplay networking unless explicitly enabled.

Never export editor-only overlays into runtime map payloads.

---

# 3. Layer Architecture

Conceptual layers (save format may remain additive over current `tileLayers` + Logic (−1)):

| Layer | Purpose | Runtime export |
| :--- | :--- | :---: |
| Terrain | Visual ground (grass, dirt, water…) | Yes |
| Collision | Walkable / solid / hazard / climbable | Yes (via Logic −1 today) |
| Object | Trees, furniture, doors, stations | Yes |
| Entity | NPCs, monsters, vendors, props | Yes |
| Spawn | Spawners, patrols, waves | Yes |
| Logic | Safe/PvP/music/weather/quest/teleport | Yes |
| Editor Overlay | Encounter tint, radii, nav helpers | **No** |

Contract helpers live in `src/shared/game/mapLayers.ts`.  
**Compatibility:** Logic Layer (−1) remains collision authority (`08`). Visual layers 0–3 unchanged.

---

# 4. Entity System

Everything placed becomes an **Entity** with a schema-driven property panel.

Schemas: `src/shared/game/entitySchemas.ts`

NPC property categories (authoring checklist):

General · Appearance · Behaviour · AI · Combat · Stats · Movement · Dialogue · Vendor · Quests · Loot · Spawn Rules · Conditions · Variables · Relationships · Events · Animation · Permissions · Debug

Resource nodes (trees, rocks, fishing, gathering) share one **Resource Node** schema (skill, level, XP, duration, depletion, respawn, loot ref, seasonal…).

---

# 5. Spawning

1. **Static placement** — exact world position (bosses, vendors, quest NPCs).
2. **Area spawner** — invisible entity with pool, weights, max pop, wander, conditions.

Maps store spawner **IDs + params**; creature defs stay in catalogs / DB.

---

# 6. Loot & Economy

Two strategies (`src/shared/game/lootRefs.ts`):

```json
{ "strategy": "pool", "poolId": "forest_common" }
```

```json
{ "strategy": "override", "drops": [{ "itemId": "quest_key", "chance": 100, "min": 1, "max": 1 }] }
```

**Loot Manager** (Studio dock `loot`): create / clone / search / preview / simulate / import-export (phase growth).

Pools support weighted entries, guaranteed drops, roll counts, nested pools, conditions, level/event/seasonal gates.

Drop Groups (guaranteed / equipment / rare / event / quest) process independently.

**Item Database** references item IDs only — never embed full item defs in map entities.

Economy is centralized: changing one pool/item/tier updates every referencing entity without map rewrites.

Prisma: `LootTable`, `ItemTemplate` + `GameConfigManager` loot CRUD. Studio API: `/api/loot/tables`.

---

# 7. Save Format (target additive)

```json
{
  "mapId": "forest01",
  "terrain": [],
  "collision": [],
  "objects": [],
  "entities": [],
  "logic": [],
  "spawners": [],
  "encounters": []
}
```

Entity example:

```json
{
  "id": "tree_oak_01",
  "position": { "x": 15, "y": 20 },
  "loot": { "strategy": "pool", "poolId": "wood_tier2" }
}
```

**Phase 1:** schemas + refs validated in shared tests; WorldMap continues to use existing `grid` / `tileLayersData` / `npcsData` columns. New fields land when serializers are ready — never break DEMO bootstrap.

---

# 8. Live Reloading

Saving from Studio must not require an MMO restart. Prefer:

* Existing `admin_reload_map` / map version bumps
* Cache invalidation for loot pools, encounters, NPC defs
* Safe sync to connected players without disconnect

Full hot-reload matrix (shops, quests, dialogue, resource nodes) is phased; do not block Phase 1 on complete coverage.

---

# 9. UI Philosophy (summary)

Professional docks, schema-driven properties, multi-select, undo/redo, snap, search, templates, context menus — see `16`. Avoid modal hell for routine edits.

---

# 10. Phased Delivery

| Phase | Scope |
| :--- | :--- |
| **1 — Foundation** | `isEditorMode`, layer/entity/loot schemas, Loot Manager dock + API, soft gameplay suppress in create tools, docs |
| **2 — Entity authoring** | Schema property panel for NPC / Resource Node / Spawner; drop-group UI; encounter zone paint props |
| **3 — Item Creator** | Full ItemTemplate Studio module; economy stats; dependency viewer |
| **4 — Isolation hardening** | Optional avatar-free Studio session; editor overlay export guard; collab sockets |
| **5 — Live economy ops** | Pool versioning, bulk edit, seasonal modifiers, server-wide rebalance without map edits |

Future gameplay (housing, farming, guilds, seasons, raids, crafting trees…) must plug in via configuration and reusable components — not one-off map embeds.

---

# Final Rule

**Maps describe existence. Servers own behavior. Studio authors references.**  
Keep Studio fun-first (`16`) while the data model stays production-ready and multiplayer-safe.
