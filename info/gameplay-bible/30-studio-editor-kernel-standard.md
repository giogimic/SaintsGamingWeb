# Saints Studio — Editor Kernel & Chrome Standard (30)

**Status:** Normative editor/panel/workflow standard  
**Date:** 2026-08-04  
**Scope:** Standardize every editor, every property panel, every workflow, and patch chrome drift from docs 19–28 so Saints Studio behaves like one commercial product — not a pile of docks.

> **Depends on:** [`29-studio-glossary-canonical.md`](./29-studio-glossary-canonical.md) PanelIds & modes.  
> **Patches:** [`19-studio-ux-design.md`](./19-studio-ux-design.md) (errata below are binding).  
> **Companions:** 20–28 for field depth; [`31`](./31-studio-integration-contracts.md) for save/publish wiring.

---

# 0. Non-Negotiable Kernel Rules

1. **One shell** — `StudioEditorShell` + `DraggablePanel`/`StudioDock`. No second dock framework.  
2. **One catalog pattern** — `CatalogEditorShell` for every definition list+form.  
3. **One property pipeline** — selection → Inspector → `SchemaFieldRenderer` + `entitySchemas` / definition schemas.  
4. **One command surface** — Ctrl+K Omnisearch registers every PanelId + ResourceType.  
5. **One dirty model** — map dirty + per-definition dirty; Save / Save All from status + menus.  
6. **One undo scope policy** — map ops vs definition ops (stacks documented; never silent no-op).  
7. **Editors configure the kernel; they do not fork it.**

---

# 1. Chrome Errata (binding patches to 19)

## 1.1 Menu bar (replace 19 §4.1)

| Menu | Items |
| :--- | :--- |
| **File** | New Map… · Open Map… · Save · Save All · Export JSON (Advanced) · Import Hub… · Publish… |
| **Edit** | Undo · Redo · Cut · Copy · Paste · Paste Special… · Duplicate · Delete · Select All on Layer · Deselect · Batch Rename… · Preferences… |
| **View** | Outliner · Inspector · Project Browser · Assets · Reset Layout · Zen (`Ctrl+.`) · Grid · Collision · Entity labels · Region channels · Advanced Tier |
| **Project** | Switch Project… · Project Settings… · Members… · Packages… |
| **Mode** | Walk / Paint / Place / Populate / Script / Catalog |
| **World** | Reload from Server · Validate Map · Soft-lock Status |
| **Play** | Walk Mode · Quest Test Bench · Simulate Loot · PIE Options… |
| **Team** | Tasks · Audit Log · Request Review… |
| **Help** | Shortcuts · Docs dock · Fun-first checklist · Bible |

## 1.2 Status bar (extend 19 §4.3)

Left → right:

1. Dirty indicators: `Map*` · `Defs (n)*`  
2. Mode · SubFocus · Tool · Brush (1/3/5/**7**) · Layer  
3. Cursor cell · Selection count  
4. Validation chip (OK / warn / error → click opens problems)  
5. **Version** `v12` · **draft|live** badge  
6. **Project** name · **locale**  
7. **Role** (viewer/creator/…)  
8. Reload flash (last `content_reload` type)  
9. Save / Save All buttons  
10. FPS (Advanced) · soft-lock owner if any  

## 1.3 Shortcuts errata

| Shortcut | Binding |
| :--- | :--- |
| Brush sizes | `[` `]` cycle **1 / 3 / 5 / 7** (21 wins over 19’s 1/3/5) |
| `E` | Eraser **only in Paint**; never global interact |
| Interact (Walk) | `F` primary; `Space` interact only when not used as Walk toggle context |
| Walk enter from create | Walk chip or `` ` `` / `0` (not Space alone if it conflicts — prefer `` ` ``) |
| Project Browser | `Ctrl+Shift+P` |
| FPS overlay | `Ctrl+`` ` (Diagnostics); Walk tip uses `` ` `` for Walk — **disambiguate:** Walk = `0` or Walk chip; FPS = `Ctrl+`` ` |
| Omnisearch | `Ctrl+K` |
| Save / Save All | `Ctrl+S` / `Ctrl+Shift+S` |
| Dock focus | `Ctrl+1..9` mapped to user dock slots (preferences) |

## 1.4 Zoning (chrome density)

| Zone | What lives here |
| :--- | :--- |
| **Skeleton** | Menu, Outliner, Inspector, Toolbar, Status, Project Browser rail (collapsible) |
| **Floating catalogs** | All definition docks (quest, loot, items, …) |
| **Modal/dialog** | Publish wizard, New Map, Preferences, Batch Rename, 409 Conflict, Import Hub |
| **Viewport overlays** | Gizmos, grids, region tint, soft-lock avatars |

Max simultaneous floating docks before auto-collapse to tab strip: **6** (then dock strip overflow).

## 1.5 Outliner groups (extend 19 §5)

```
Map
├── Layers (Ground…Overhead)
├── Logic
├── Regions (biome / weather / music / …)
├── Entities
│   ├── NPCs
│   ├── Creatures / Spawners
│   ├── Objects / Prefabs
│   └── Triggers
└── Gates
```

---

# 2. CatalogEditorShell (every definition editor)

## 2.1 Required chrome

```
┌─ Title  [Search] [Filter▾] [+ New] [⋯ More] [×] ─┐
│ List (virtualized)     │  Form / Graph tab        │
│  · row                 │  SchemaFieldRenderer     │
│  · row *dirty*         │  or specialized canvas   │
│                        │  [Used by] [Preview]     │
├─ Footer: validation · locale keys · Save · Revert ┤
└───────────────────────────────────────────────────┘
```

## 2.2 Required behaviours

| Behaviour | Spec |
| :--- | :--- |
| List | Virtualized; sticky; keyboard ↑↓ Enter |
| New | Creates draft row; focuses name/slug |
| Save | Calls DefinitionService; audit; content_reload; clears dirty |
| Revert | Reload from server; confirm if dirty |
| Delete | Dependency gate (hard refs block) |
| Duplicate | Clone with new slug |
| Import / Export | More menu → JSON; validate on import |
| Seed | More → Seed defaults (idempotent) |
| Used by | Opens `ref_viewer` / `deps` with ResourceRef |
| Preview | Context preview (loot simulate, dialogue play, ability tooltip) |
| Search register | On save, upsert SearchDocument |
| Locale | String fields show key + default locale value |
| Permissions | Hide mutate if !canWrite; hide publish actions if !canPublish |

## 2.3 Editors that MUST use this shell

`quest`, `dialogue`, `loot`, `items`, `recipes`, `creature`, `classes`, `heroes`, `abilities`, `status`, `skills`, `professions`, `shop`, `ai_profiles`, `faction`, `gather`, `collections`, `affixes`, `economy`, `world_event`, `cutscene`, `packages`, `templates`, `prefabs`, `spawner`, `boss`, `companion`, `evolution`, `capture`, `market_ops`.

Specialized canvases (Quest Graph, Dialogue Graph, Cutscene Timeline) are **tabs inside** the shell, not separate frameworks.

## 2.4 Anti-fork checklist

Before merging a new dock PR:

- [ ] Uses CatalogEditorShell or documented exception  
- [ ] Mutate via studio service (28)  
- [ ] Schema fields via SchemaFieldRenderer where tabular  
- [ ] PanelId registered in 29  
- [ ] Ctrl+K entry  
- [ ] Audit + content_reload  
- [ ] Used-by wired  

---

# 3. Inspector standard (every property panel)

## 3.1 Binding sources (priority)

1. Multi-selection aggregate (bulk edit intersection)  
2. Single `MapEntityRef` → components via entitySchemas  
3. Logic cell selection → logic component schema  
4. Region selection → region schema  
5. Definition row focus from catalog → **deep-link**: either embed read-only summary + “Open in dock” or full form if Catalog mode  
6. Empty → mode tip

## 3.2 Layout

```
[Header: icon · name · type chip · ⋯]
[Component list / sections]
  each: fold · SchemaFieldRenderer · Advanced fields gated
[Footer: Open Definition · Find References · Create Task]
```

## 3.3 Field widget map (standard)

| Schema type | Widget |
| :--- | :--- |
| string / number / bool | text / num / switch |
| enum | select |
| slug | text + validate unique |
| ResourceRef | picker popover (19) |
| color | swatch |
| vec2 / grid pos | x,y + pick-from-world |
| localeString | key + value (default locale) |
| json (Advanced) | monaco-lite / textarea |
| reward | RewardBuilder |
| condition | ConditionBuilder |
| loot entries | Loot row editor (23) |

**NPC dock forms that duplicate Inspector fields migrate to schema-only** (19/18 debt). Dock keeps list + place + quick actions.

## 3.4 Validation display

Inline field errors · section banners · status bar chip. Soft on Save draft; hard on Publish (31).

---

# 4. Workflow standards (every workflow)

## 4.1 Universal mutate workflow

```
Edit → local dirty → Save
  → permission check
  → validate(soft)
  → $transaction (persist + audit [+ revision])
  → emitContentReload
  → ContentCache.invalidate
  → UI clear dirty + toast
```

409 Conflict → dialog: Reload server / Overwrite (if allowed) / Diff (26/32).

## 4.2 Universal place workflow

```
Select prefab/definition → Place tool → click cell
  → create EntityInstanceV1
  → select new entity
  → Inspector focus
  → map dirty
```

## 4.3 Universal Walk test workflow

```
Save All (if dirty prompts) → Walk
  → hide skeleton D/E/F floating optional
  → gameplay HUD on
  → Play pill “Return to Paint (1)”
```

## 4.4 Universal publish workflow

```
Validate(hard) → Deps gate → L10n gate (if required)
  → Review task (if project.requireReviewToPublish)
  → Snapshot ContentRevision → mark live → content_reload
  → Audit publish
```

## 4.5 Per-domain workflow index (must exist end-to-end)

| Workflow | Entry | Docs |
| :--- | :--- | :--- |
| Paint terrain & save | Paint → brush → Save | 21, 28 |
| Place chest with loot | Place → prefab → Loot ref → Walk | 20, 23 |
| Author quest + dialogue + giver | Catalog/Populate → Quest → Dialogue → NPC bind | 24, 22, 31 |
| Creature + spawner + encounter | Creature → Spawner → Paint encounter zone | 22, 21 |
| Item → loot → recipe → shop | Items → Loot → Recipes → Shop | 23 |
| Ability → class → hotbar test | Abilities → Classes → Walk combat | 25 |
| Package export/import | Packages → validate → export | 27, 26 |
| Localize quest strings | L10n → keys → publish gate | 27, 32 |
| Rollback bad publish | Diagnostics/Publish → revision → restore | 26 |
| Assign task on broken ref | Ref Viewer → Create Task | 27 |

Every row must be achievable without a spreadsheet.

---

# 5. Graph editors standard

Quest Graph, Dialogue Graph, AI Behaviour Tree, Cutscene Timeline share:

| Element | Spec |
| :--- | :--- |
| Canvas | Pan mid-mouse · zoom wheel · minimap optional |
| Nodes | Title · type color · error badge |
| Edges | Typed pins; invalid links blocked |
| Inspector | Selected node fields via SchemaFieldRenderer |
| Debug | Token/playback head (quest test, dialogue play, cutscene scrub) |
| Serialize | Versioned JSON document `v` |

**Do not** invent four incompatible graph runtimes — one `GraphCanvas` kit; node catalogs differ.

---

# 6. Picker & builder standard

Closed set (extend 19 §9):

| Picker | Returns |
| :--- | :--- |
| AssetPicker | GameAsset id |
| ItemPicker | item slug |
| LootPicker | loot pool id |
| QuestPicker | quest slug/id |
| DialoguePicker | treeId |
| CreaturePicker | creature slug |
| PrefabPicker | prefab id |
| AbilityPicker | ability id |
| FactionPicker | faction id |
| MapPicker | mapId |
| LocaleKeyPicker | string key |
| RewardBuilder | RewardBundle |
| ConditionBuilder | ConditionGraph |

All pickers: search, recent, favorites, clear, open-in-dock.

---

# 7. Undo / clipboard standard

| Stack | Includes | Excludes |
| :--- | :--- | :--- |
| **Map stack** | Paint strokes, entity place/move/delete, region edits | Definition form keystrokes |
| **Definition stack** | Per-dock form undo (optional v1: Revert only) | Map ops |

Clipboard:

* In-map copy/paste entities + logic rect  
* **Cross-map paste** (32): payload includes ResourceRefs; missing defs → prompt import  
* Paste Special: position offset / retarget loot / strip bindings  

---

# 8. Problems panel (missing → required)

PanelId: fold into `diagnostics` tab **Problems**.

Aggregates soft validation across open map + dirty defs. Click → selects resource + opens dock. Publish disabled while hard errors remain.

---

# 9. Standardization scorecard (commercial bar)

| Surface | Standard applied |
| :--- | :--- |
| Every catalog dock | §2 CatalogEditorShell |
| Every property panel | §3 Inspector |
| Every graph | §5 GraphCanvas |
| Every save | §4.1 |
| Every place | §4.2 |
| Every publish | §4.4 |
| Every string field | locale-aware widget |
| Every mutate | audit + reload (31) |
| Every ResourceRef field | standard picker |
| Every new dock | 29 PanelId + Ctrl+K + scorecard |

---

# 10. Phased delivery

| Phase | Ship |
| :--- | :--- |
| **EK0** | This standard + 29 glossary |
| **EK1** | Status/menu errata; brush 7; Project Browser shortcut; mode label freeze |
| **EK2** | CatalogEditorShell extraction; wire SchemaFieldRenderer to Inspector |
| **EK3** | RewardBuilder + ConditionBuilder shared modules |
| **EK4** | GraphCanvas kit behind quest/dialogue |
| **EK5** | Problems tab; Save All; definition dirty counts |
| **EK6** | Cross-map clipboard; batch rename chrome |

---

# Final Rule

**A commercial Studio is one kernel with many configurations.**  
If a dock looks custom, it must still speak CatalogEditorShell, Inspector, ResourceRef, and §4 workflows — or it does not ship.
