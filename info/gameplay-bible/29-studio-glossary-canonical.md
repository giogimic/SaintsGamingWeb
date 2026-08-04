# Saints Studio — Glossary & Canonical Contracts (29)

**Status:** Normative vocabulary (supersedes conflicting sketches in 16–28)  
**Date:** 2026-08-04  
**Scope:** Freeze every name, id, mode, panel, ref type, scoping key, reload event, and SoT table so the commercial Studio has **one language**. When 16–28 disagree with this document, **this document wins** unless ALIGNMENT records an explicit exception.

> **Companions:** [`18`](./18-studio-master-architecture.md)–[`28`](./28-studio-backend-architecture.md) remain domain masters for depth; they must adopt these names on next edit.  
> **Patches:** Chrome deltas → [`30`](./30-studio-editor-kernel-standard.md). Wiring → [`31`](./31-studio-integration-contracts.md). Industry gaps → [`32`](./32-studio-commercial-completeness.md).

---

# 0. Conflict Resolution Rule

1. **29** freezes names and identities.  
2. **30** freezes editor/panel/workflow chrome.  
3. **31** freezes cross-system call sequences.  
4. Domain docs (20–28) own field-level depth **inside** these names.  
5. Stale sketches (17 flat entity JSON, 18 §7 reload subset, 22 §3.9 incomplete objectives, authoring field `gold`) are **historical** — do not implement.

---

# 1. Modes (canonical)

## 1.1 UI labels (always show these)

| Order | Label | Hotkey | Purpose |
| :---: | :--- | :---: | :--- |
| 0 | **Walk** | `` ` `` / `0` / Walk chip | Play-test in live world |
| 1 | **Paint** | `1` | Terrain + Logic brush |
| 2 | **Place** | `2` | Stamp prefabs / entities |
| 3 | **Populate** | `3` | NPCs, creatures, encounters (sub-chips) |
| 4 | **Script** | `4` | Logic components, gates, quest links |
| 5 | **Catalog** | `5` | Definition editing without world paint |

## 1.2 Internal `StudioMode` ids (stable)

| UI label | Canonical id | Legacy aliases (read → map) |
| :--- | :--- | :--- |
| Walk | `walk` | `test` |
| Paint | `paint` | `build` |
| Place | `place` | — |
| Populate | `populate` | — |
| Script | `script` | — |
| Catalog | `catalog` | — |

**Populate sub-focus** (not separate top-level modes): `npc` | `quest` | `creature` | `encounter`.  
Legacy store values `npc|quest|creature` while in Populate = **subFocus**, not mode.  
UI must never show “Build / NPC / Quest / Creature / Test” as top-level mode names.

## 1.3 Isolation flags

| Flag | Meaning |
| :--- | :--- |
| `isEditorMode` | Route is `/studio` |
| `studioMode` | One of six ids above |
| `showsGameplayHud` | True only in `walk` |
| `creationActive` | `studioMode !== 'walk'` |

Deprecate narrative name `isCreationMode` in new code — use `creationActive`.

---

# 2. Scoping keys (canonical)

| Name | Type | Meaning | Never means |
| :--- | :--- | :--- | :--- |
| **`gameId`** | `string` | World / campaign scope on WorldMap, LootTable, QuestTemplate, GameAsset, CreatureDef, etc. | CharacterClass FK alone |
| **`StudioProject.id`** | `string` | **Equals `gameId`** in v1 (1:1). Do not invent a second id. | Separate marketing project |
| **`GameConfig.id`** | cuid | Prisma row PK for rules pack | Not the Studio scope string |
| **`GameConfig.slug`** | string | Human slug for config pack | Prefer `gameId` for map scope |
| **`profileId` (CharacterClass)** | string \| null | Same string space as `gameId` when set; null = shared | AiProfile |
| **`aiProfileId`** | string | AI behaviour profile id (**rename**; never `profileId` alone) | World scope |
| **`activeGameId`** | client store | Currently open StudioProject / gameId | — |

**Bridge algorithm:**  
`StudioProject.id === gameId === activeGameId`.  
CharacterClass: filter by `profileId === activeGameId || profileId == null`.  
GameConfig rows are **settings hosts**, not alternate project ids.

---

# 3. Reference types (canonical)

```ts
/** Any catalog or map resource — dependency graph, audit, search, bookmarks */
type ResourceRef = {
  type: ResourceType;
  id: string;           // cuid or slug per type rules below
  gameId?: string;
};

type ResourceType =
  | "map" | "asset" | "quest" | "dialogue" | "item" | "loot"
  | "creature" | "npc_def" | "prefab" | "ability" | "status"
  | "skill" | "class" | "recipe" | "shop" | "encounter"
  | "logic_tile" | "cutscene" | "world_event" | "package"
  | "doc" | "task" | "region" | "spawner" | "ai_profile"
  | "faction" | "collection" | "affix_pool" | "economy_modifier";

/** Instance on a map — Outliner / gizmos / selection */
type MapEntityRef = { mapId: string; entityId: string };

/** Forbidden in new code: overloaded EntityRef meaning three things */
```

| ResourceType | Identity rule |
| :--- | :--- |
| map | WorldMap.id slug |
| item, creature, quest, recipe, class (slug fields) | **slug** preferred in refs; store cuid in DB, expose both |
| loot, dialogue, asset, ability… | cuid `id`; display name separate |
| dialogue | Prefer `treeId` (cuid). `npcId` is a **binding**, not the tree identity |
| logic_tile | numeric tile id |
| ai_profile | `aiProfileId` |

**Deprecate type name `EntityRef` for deps.** Old docs mean `ResourceRef` or `MapEntityRef`.

---

# 4. Source-of-truth tables

| Domain | Authoring SoT | Import / demote | Client hydrate only |
| :--- | :--- | :--- | :--- |
| Map | **WorldMap** | GameMap mirror → delete; SaintsMap delete | — |
| Item | **ItemTemplate** | GameItem import | ITEM_DB |
| Quest | **QuestTemplate** + objectives | GameQuest | QUEST_DB |
| Loot | **LootTable** | GameConfig writers | — |
| Dialogue | **NpcDialogueTree** | — | — |
| Creature authoring | **CreatureDef** | CreatureTemplate = Tuxemon import | — |
| Class | **CharacterClass** | dual ClassEditor UI merge | — |
| Asset | **GameAsset** | — | — |
| Ability / status / skill defs | Dictionary / AbilityDef per 25 | combatAbilities.ts static | — |
| Prefab | **EntityPrefab** (20) | — | — |
| Package | **ContentPackage** (27) | Modpack = community only | — |

---

# 5. Prefab vs Template vs Definition

| Term | Meaning | UI home |
| :--- | :--- | :--- |
| **Definition** | Catalog row (Item, Quest, Loot, CreatureDef, Ability…) | Catalog mode docks |
| **Prefab** | Placeable world object recipe (`EntityPrefab`) | Assets → Prefabs / Place mode |
| **Template (UI)** | Seed that creates a Definition or Prefab | Templates browser |
| **QuestTemplate** | Prisma quest definition (keep model name) | Quest dock — labeled “Quest” not “Template” in UI |

UI copy: **“New from template…”** never a bare button **“Template”** without kind.

---

# 6. ContentReloadEvent (canonical — promote 26)

```ts
type ContentReloadEvent =
  | { type: "map"; mapId: string; version: number; at: string }
  | { type: "map_entities"; mapId: string; version: number; at: string }
  | { type: "loot"; id?: string; gameId?: string; version?: number; at: string }
  | { type: "item"; id?: string; slug?: string; at: string }
  | { type: "quest"; id?: string; slug?: string; at: string }
  | { type: "dialogue"; id?: string; at: string }
  | { type: "creature"; id?: string; slug?: string; at: string }
  | { type: "ability"; id?: string; at: string }
  | { type: "status"; id?: string; at: string }
  | { type: "skill"; id?: string; at: string }
  | { type: "class"; id?: string; at: string }
  | { type: "shop"; id?: string; at: string }
  | { type: "recipe"; id?: string; at: string }
  | { type: "logic_tile"; tileId?: number; at: string }
  | { type: "asset"; id?: string; at: string }
  | { type: "economy_modifier"; id?: string; at: string }
  | { type: "world_event"; id?: string; at: string }
  | { type: "cutscene"; id?: string; at: string }
  | { type: "package"; id?: string; at: string }
  | { type: "flush_all_caches"; at: string };
```

* Socket event name: **`content_reload`**.  
* **`map_reloaded`** = deprecated alias for `{ type: "map", … }`.  
* **`admin_reload_map`** = client request to server to emit map reload.  
* **`admin_save_map`** = **removed** from architecture (28); save = HTTP/MapService only.  
* 18 §7 is a **subset illustration**, not authoritative.

---

# 7. Currency & rewards

| Concept | Canonical field |
| :--- | :--- |
| Wallet currency id | **`credits`** |
| Quest/doc reward money | `currency: [{ id: "credits", amount }]` |
| Authoring field `gold` | **Forbidden** in new schemas; migrate → credits |
| Reputation | `reputation: [{ factionId, delta }]` |
| Items | `items: [{ itemSlug, qty, bind? }]` |
| Loot grant | `lootPoolId` → LootService.roll |
| XP | `xp: [{ skillSlug?, amount }]` per 24/25 |

Shared type: `RewardBundle` in `src/shared/game/rewards.ts` (target) — Quest, Dialogue, Chest, Achievement all import it.

---

# 8. PanelId registry (complete)

Every dock/window must use one id. Owner doc = depth; **30** = chrome behaviour.

### Skeleton (always-available regions)

| PanelId | Label | Owner | Min level |
| :--- | :--- | :--- | ---: |
| `outliner` | Outliner | 19/30 | 400 |
| `inspector` | Inspector | 19/20/30 | 400 |
| `toolbar` | Toolbar | 19 | 400 |
| `status` | Status | 19/30 | 400 |
| `palette` | Palette | 19/21 | 400 |
| `project_browser` | Project Browser | 27 | 400 |

### World / populate

| PanelId | Label | Owner | Min |
| :--- | :--- | :--- | ---: |
| `assets` | Assets | 19/27 | 400 |
| `npc` | NPCs | 22 | 400 |
| `dialogue` | Dialogue | 22/24 | 400 |
| `quest` | Quests | 24 | 400 |
| `creature` | Creatures | 22 | 400 |
| `spawner` | Spawners | 22 | 400 |
| `shop` | Shops | 23 | 400 |
| `ai_profiles` | AI Profiles | 22 | 400 |
| `schedule` | Schedules | 22 | 400 |
| `faction` | Factions | 22 | 400 |
| `reputation` | Reputation | 22 | 400 |
| `patrol` | Patrols | 22 | 400 |
| `boss` | Bosses | 22 | 400 |
| `companion` | Companions | 22 | 400 |
| `evolution` | Evolution | 22 | 400 |
| `capture` | Capture | 22 | 400 |
| `world_event` | World Events | 22/26 | 400 |
| `cutscene` | Cutscenes | 24 | 400 |
| `quest_graph` | Quest Graph | 24 | 400 |
| `quest_test` | Quest Test Bench | 24 | 400 |

### Economy / gameplay catalogs

| PanelId | Label | Owner | Min |
| :--- | :--- | :--- | ---: |
| `loot` | Loot | 23 | 400 |
| `items` | Items | 23 | 400 |
| `recipes` | Recipes | 23 | 400 |
| `gather` | Gather Defs | 23 | 400 |
| `market_ops` | Market Ops | 23 | 400 |
| `economy` | Economy Ops | 23 | 400 |
| `collections` | Collections | 23 | 400 |
| `affixes` | Affix Pools | 23 | 400 |
| `classes` | Classes | 25 | 400 |
| `heroes` | Heroes | 22/25 | 400 |
| `abilities` | Abilities | 25 | 400 |
| `status` | Status Effects | 25 | 400 |
| `skills` | Skills | 25 | 400 |
| `professions` | Professions | 25 | 400 |
| `combat` | Combat Rules | 25 | 1000 |
| `balance` | Balance | 25 | 1000 |

### Production / ops

| PanelId | Label | Owner | Min |
| :--- | :--- | :--- | ---: |
| `packages` | Packages | 27 | 400 |
| `templates` | Templates | 27 | 400 |
| `prefabs` | Prefabs | 20/27 | 400 |
| `deps` | Dependencies | 27 | 400 |
| `ref_viewer` | Reference Viewer | 27 | 400 |
| `tasks` | Tasks | 27 | 400 |
| `docs` | Docs | 27 | 400 |
| `notes` | Notes | 27 | 400 |
| `audit` | Audit Log | 27 | 400 |
| `l10n` | Localization | 27 | 400 |
| `analytics` | Creator Analytics | 27 | 400 |
| `diagnostics` | Diagnostics | 26/27 | 400 |
| `publish` | Publish | 26 | 400 |
| `dev` | Dev Tools | 18 | 1000 |

**Rule:** New feature without a PanelId row here = incomplete design. Prefer tabs inside an existing dock before new ids.

Legacy id `build` = paint tool shelf folded into `palette` + `toolbar` (not a separate floating catalog).  
Legacy id `properties` = alias of `inspector`.

---

# 9. Permission matrix (canonical)

| Capability | Numeric (`permissionLevel`) | Project `StudioRole` | Notes |
| :--- | ---: | :--- | :--- |
| Open `/studio` | ≥ 400 | viewer+ | Entry |
| Mutate drafts | ≥ 400 | creator+ | Write |
| Publish / rollback | ≥ 400 | admin+ **or** owner | `canPublishStudioContent` |
| Engine / combat rules docks | ≥ 1000 | developer+ | Dev Tools, Balance |
| Manage membership | ≥ 400 | owner | Team |
| Site Admin panel | ≥ 400 | — | Separate from Studio |

**Naming:** Site role string “Admin” at 400 opens Studio; bible “Developer” means full engine — map to numeric 1000. UI: show **Studio role** in project; show **site level** in Dev Tools only.

Resolver: `src/shared/game/studioPermissions.ts` is the **only** matrix. Project roles AND numeric level (31).

---

# 10. Naming style guide

| Kind | Convention | Example |
| :--- | :--- | :--- |
| PanelId | snake_case | `ai_profiles` |
| StudioMode | lowercase | `paint` |
| ResourceType | snake_case | `world_event` |
| Prisma models | PascalCase | `ItemTemplate` |
| Wire JSON fields | camelCase | `tileLayersData` parsed → `tileLayers` |
| Slugs | snake_case | `trail_wake` |
| Socket events | snake_case | `content_reload` |
| Services | PascalCase + Service | `MapService` |
| Shared modules | camelCase file | `lootRefs.ts` |

UI labels: Title Case game words (Paint, Loot, Walk). No ALL_CAPS in chrome except slug displays.

---

# 11. Document authority map

| Concern | Authority |
| :--- | :--- |
| Names / ids / PanelIds | **29** |
| Editor shell / Inspector / workflows chrome | **30** |
| Cross-system sequences | **31** |
| Collab, CI, l10n pipeline, plugins, recovery | **32** |
| Feel / fun-first | 16 |
| Systems depth | 18 |
| UX layout origins | 19 (patched by 30) |
| Entities | 20 |
| World tools | 21 |
| NPC/AI/creatures | 22 |
| Economy | 23 |
| Quests | 24 |
| Gameplay editors | 25 |
| Live ops | 26 |
| Production tools | 27 |
| Backend | 28 |
| Engineering truth | ALIGNMENT |

---

# 12. Supersession list (explicit)

| Stale | Replacement |
| :--- | :--- |
| 16 five modes without Catalog | §1 include Catalog |
| 18 mode table without `catalog` / populate-as-three-modes | §1 |
| 18 §7 reload union | §6 (= 26 + asset/package) |
| 17/18 entity instance sketches | 20 `EntityInstanceV1` |
| 20/22/26 `EntityRef` overload | §3 ResourceRef / MapEntityRef |
| 22 QuestRewardsDoc.gold | §7 RewardBundle |
| 22 §3.9 objective enum | 24 objective types |
| 27 StudioProject.id ≠ gameId ambiguity | §2 equal in v1 |
| AiProfile.profileId | aiProfileId |
| Dual top-level NPC/Quest/Creature modes in UI | Populate subFocus |

---

# Final Rule

**If two docs disagree on a name, implement the name in this file.**  
Depth lives in domain bibles; identity lives here.
