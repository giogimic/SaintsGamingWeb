# Saints Studio — Complete UX Design (19)

**Status:** Production UX contract (audit-backed)  
**Date:** 2026-08-04  
**Scope:** Every window, toolbar, dock, menu, inspector, popup, shortcut, workflow, drag-drop, multi-select, search/filter, asset browser, navigation, overlay, gizmo, and editor interaction — defined with click budgets and identity rules.

> **Companions (do not fork)**
> - [`16-studio-editor-philosophy.md`](./16-studio-editor-philosophy.md) — feel, fun-first, anti-patterns
> - [`18-studio-master-architecture.md`](./18-studio-master-architecture.md) — systems, registries, hot-reload, reuse rules
> - [`20-studio-entity-system.md`](./20-studio-entity-system.md) — entity/component/prefab model (Inspector binds here)
> - [`08`](./08-world-building-editor-architecture.md) / [`17`](./17-studio-world-builder-economy.md) — layers & Phase 1 contracts
> - [`ALIGNMENT.md`](./ALIGNMENT.md) — engineering truth

**This document is the UX master.** `16` owns philosophy. `18` owns systems. `19` owns **every pixel of authoring chrome and every interaction**. `20` owns what those interactions edit. Implement by evolving existing docks (`StudioEditorShell`, `editor-store`, panels) — not a second Studio UI.

---

# 0. Identity & Design Principles

## 0.1 Saints Studio identity

| Trait | Meaning in UI |
| :--- | :--- |
| **Live world first** | The Babylon map is always the hero canvas. Chrome floats; it never replaces the world with a grey IDE void. |
| **God-powers, not debugging** | Labels use game words (Paint, Place, Walk, Warp, Loot). Engine jargon stays in Advanced Tier. |
| **Fun-first loop ≤ 60s** | Place → Walk → Feel → Tweak → Save must stay under one minute for one object. |
| **Professional density** | Unity/Unreal/Godot/Roblox-class tool depth — without their cold IDE shell. Warm, sharp, readable; not purple-glow AI chrome, not newspaper dense. |
| **One composition** | First viewport = world + thin chrome. No dashboard of cards as the default view. |

## 0.2 Visual language (Studio chrome)

| Token | Spec |
| :--- | :--- |
| Surface | Semi-opaque dark glass (`bg-black/80`–`/90`) over world; 1px border `white/10` |
| Accent | Single studio accent (existing gold/amber used for Studio chips) — not a second brand palette |
| Type | UI: compact sans already in lobby; titles 12–13px semibold; body 11–12px |
| Radius | 8–12px docks; 999 chips for modes only |
| Motion | Dock open 120–180ms ease; selection pulse 200ms; no perpetual glow |
| Icons | Lucide / existing icon set; one metaphor per tool |

## 0.3 Click budgets (hard rules)

| Task | Max primary clicks / keys |
| :--- | ---: |
| Enter Paint from Walk | **1** (mode chip or `1`) |
| Paint one tile | **1** click (brush already armed) |
| Place one NPC at cursor | **2** (select prefab if needed + click world) — or **1** if last prefab sticky |
| Open inspector for selection | **0** (auto on select) |
| Save dirty map | **1** (`Ctrl+S` or status-bar Save) |
| Walk Mode play-test | **1** (`Space` or Walk chip) |
| Find any asset / pool / quest | **2** (⌘K → type → Enter) |
| Duplicate selection | **1** (`Ctrl+D`) |
| Undo last paint | **1** (`Ctrl+Z`) |

If a routine task needs a modal wizard, the design failed (`16` anti-pattern).

## 0.4 Implementation rule

Reuse `PanelId`, `DraggablePanel`, `editor-store`, catalog panels. Redesign means **layout contracts + interaction specs**; code lands in phases (see §20). Do not invent a parallel dock framework.

---

# 1. Audit Snapshot (today → target)

| Surface today | Gap | Target section |
| :--- | :--- | :--- |
| Mode chips Build/NPC/Quest/Creature/Walk | ≠ bible 5 modes; no Place/Script | §3 |
| Bottom dock bar | No tool toolbar, no status bar, no outliner | §2, §4, §5 |
| Properties paints logic + warps | Not selection inspector | §6 |
| NPC place form only | No list, no DnD sprite, no live push | §8.4 |
| No context menus / gizmos / undo | Missing DCC basics | §7, §10, §11 |
| Ctrl+E + bare `E` + interact `E` | Conflict | §12 |
| Per-panel search only | No global palette | §13 |
| Asset Manager strong; no canvas DnD | Wire drop targets | §9, §11 |
| SchemaFieldRenderer orphan | Wire into Inspector | §6 |

---

# 2. Application Chrome Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [A] MENU BAR (thin)          [B] WORLD BREADCRUMB           [C] PROFILE │
├──────┬───────────────────────────────────────────────────────────┬───────┤
│ [D]  │                                                           │ [E]   │
│ OUT- │              [G] VIEWPORT (live Babylon world)            │ INSPE │
│ LINER│         + overlays + gizmos + drop targets                │ CTOR  │
│      │                                                           │       │
├──────┴───────────────────────────────────────────────────────────┴───────┤
│ [F] TOOLBAR (mode tools)     [H] STATUS BAR                              │
│ [I] DOCK TAB STRIP (overflow panels)                                     │
└──────────────────────────────────────────────────────────────────────────┘
```

**Floating exception:** Catalog docks (Quest, Dialogue, Loot, Creature, Classes, Heroes, Dev, Assets) remain **floating** (current `DraggablePanel`) so the world stays large. **Outliner + Inspector + Toolbar + Status** are the new “always-available skeleton.” World Builder becomes a **tool shelf inside Toolbar + Palette**, not only a fat left panel.

### Region specs

| ID | Name | Default | Persist | Hide in Walk |
| :--- | :--- | :--- | :---: | :---: |
| A | Menu bar | 28px top full width | layout preset | Partial (File/Play only) |
| B | Breadcrumb | centered under menu or in status | — | Show map name only |
| C | World Profile | top-right (evolves `WorldProfileBar`) | gameId | Compact |
| D | Outliner | left 240px, collapsible | width/open | Yes |
| E | Inspector | right 320–360px | width/open | Yes |
| F | Toolbar | bottom-left floating or above status | — | Yes |
| G | Viewport | fills remainder | — | Always |
| H | Status bar | 24px bottom | — | Compact dirty+coords |
| I | Dock strip | bottom center chips (today’s dock bar) | — | Replaced by Walk pill |

**Walk Mode:** hide D/E/F/I; show Walk pill + status coords + Menu Play. HUD gameplay returns (`18` isolation).

---

# 3. Mode System (UX)

## 3.1 Modes (labels = bible; ids stable per `18`)

| Key | Label | Cursor | Primary tool | Default open |
| :---: | :--- | :--- | :--- | :--- |
| `` ` `` or `0` | **Walk** | default | Play / interact | none |
| `1` | **Paint** | crosshair | Brush / Erase / Fill / Eyedropper | Palette + Inspector |
| `2` | **Place** | cell highlight | Stamp prefab / entity | Assets + Outliner + Inspector |
| `3` | **Populate** | cell + entity halo | NPC / creature / encounter place | NPC + Dialogue + Inspector |
| `4` | **Script** | logic tint | Component brush / gate edit | Inspector (logic) + Quest |
| `5` | **Catalog** | default | Definition editing (no world paint) | Last catalog dock |

Internal store may keep `build|npc|quest|creature|test` during migration; **UI must show bible names**. Sub-modes under Populate: NPCs / Quests / Creatures via secondary chips (today’s NPC/Quest/Creature).

## 3.2 Mode switch workflow

1. Click mode chip **or** number key → `setStudioMode`.
2. Apply `STUDIO_MODE_DEFAULTS` (updated): open listed docks; do **not** destroy user’s manually opened extra docks unless holding Alt (Reset Workspace).
3. Toolbar swaps tool set for that mode.
4. Viewport overlay theme shifts (Paint = grid; Place = snap ghosts; Script = logic tint).

## 3.3 Updated defaults

| Mode | Default docks / regions |
| :--- | :--- |
| Walk | — |
| Paint | Outliner (layers), Inspector, Palette (tiles/logic) |
| Place | Outliner, Inspector, Assets |
| Populate | Outliner, Inspector, NPC, Dialogue |
| Script | Outliner, Inspector, Quest (optional) |
| Catalog | Focus last: Loot / Creature / Classes / Heroes / Items |

---

# 4. Menu Bar, Toolbar, Status Bar

## 4.1 Menu bar

| Menu | Items |
| :--- | :--- |
| **File** | New Map… · Open Map… (`Ctrl+O`) · Save Map (`Ctrl+S`) · Save All (`Ctrl+Shift+S`) · Export Map JSON (Advanced) · Publish… (Admin) |
| **Edit** | Undo · Redo · Cut · Copy · Paste · Duplicate · Delete · Select All on Layer · Deselect · Preferences… |
| **View** | Outliner · Inspector · Assets · Reset Layout · Zen (hide all chrome `Ctrl+.`) · Grid · Collision overlay · Entity labels · Advanced Tier |
| **Mode** | Walk / Paint / Place / Populate / Script / Catalog (+ shortcuts) |
| **World** | Switch Profile… · New Profile · Clone Trail · Reload Map from Server |
| **Play** | Walk Mode (`Space` when creating) · Simulate Loot (focus) · Validate Map |
| **Help** | Shortcuts (`?`) · Fun-first checklist · Bible links (08/16/18/19) |

Popups: native-feeling floating menus (not full-screen modals). **New Map** = compact dialog (slug, name, W/H) — keep current create fields, restyle as dialog.

## 4.2 Main toolbar (mode tools)

Horizontal icon group, bottom-left above status (or left of dock strip):

### Paint tools
| Tool | Icon | Shortcut | Behavior |
| :--- | :--- | :---: | :--- |
| Select | pointer | `Q` | Click selects tile/entity; no paint |
| Brush | brush | `B` | Paint `activeBrush` on click/drag |
| Eraser | eraser | `E` *(tool only when Paint; see §12)* | Paint 0 / clear logic |
| Fill | bucket | `G` | Flood fill same GID / logic id |
| Eyedropper | pipette | `I` | Sample under cursor → brush |
| Rect | rect | `R` | Drag rectangle paint |
| Line | line | `L` | Drag line paint |

Brush size: `[` `]` cycle 1 / 3 / 5 (status shows size). Shift = temporary eyedropper (Blender/Unity pattern).

### Place / Populate tools
| Tool | Shortcut | Behavior |
| :--- | :---: | :--- |
| Select | `Q` | Select entities |
| Place | `P` | Next click stamps active prefab |
| Move gizmo | `W` | Drag entity on grid |
| Duplicate stamp | `Alt`+drag | Clone while dragging |

### Script tools
| Tool | Behavior |
| :--- | :--- |
| Component brush | Paint logic component from palette |
| Marquee select | Select logic region for batch props |
| Warp tool | Two-click: source cell → set target in Inspector focus |

**Do not** keep “always paint on any click” without Select tool — that is why Studio feels accidental today.

## 4.3 Status bar (always when creating)

Left → right:

1. **Dirty** `● Unsaved map` / `Saved` (map + optional def dirty counts)
2. **Mode** · **Tool** · **Brush size** · **Layer** name
3. **Cursor** `r,c` world tile under pointer (not only last click)
4. **Selection** count (`3 tiles` / `1 NPC`)
5. **Validation** icon (green/yellow/red) → click opens issues popover
6. **Save** button (primary when dirty)
7. **FPS** (Advanced only)

Click dirty label → Save. Double-click coords → focus Outliner on that cell.

---

# 5. Outliner (Hierarchy)

**Purpose:** Roblox Explorer / Unity Hierarchy for the **current map**.

## 5.1 Tree structure

```
▼ DEMO_SANDBOX
  ▼ Layers
      Ground (0)
      Fringe (1)
      …
      Logic (−1)
  ▼ Entities
      NPCs
        Mayor (12, 8)
      Objects
      Spawners
      Encounter Zones
  ▼ Logic Instances
      Warp → forest01 (4, 4)
      Harvest Oak (15, 20)
```

## 5.2 Interactions

| Action | Result |
| :--- | :--- |
| Click row | Select; pan/highlight in viewport; Inspector binds |
| Double-click | Frame selection in viewport (camera ease to tile) |
| Visibility eye | Toggle editor overlay for that node (not runtime delete) |
| Lock | Prevent paint/move |
| Right-click | Context menu (§7) |
| Drag reorder | Only where order matters (draw order / spawn priority) |
| Filter box | Type-ahead filter tree |
| Multi-select | Ctrl/Cmd click; Shift range |

**Data:** derive from `activeMapData` + `npcsData` + logic scans — no second scene graph store beyond selection ids in `editor-store` (`18` §3.5).

**Empty:** “No entities yet — Place an NPC or paint a Logic tag.”

---

# 6. Inspector (Property Editor)

Replaces “Properties paints everything” with **selection-driven** UI. Reuse `SchemaFieldRenderer` + `entitySchemas` (`18` §5).

## 6.1 Binding rules

| Selection | Inspector shows |
| :--- | :--- |
| None | Mode tip + last tool help (not empty void) |
| Single tile (visual) | Layer, GID, tileset name, “Replace brush”, collision via Logic link |
| Single logic cell | Component schema fields; warp/encounter specialized sections if kind matches |
| Single entity | `getEntitySchema(kind)` categories as accordion |
| Multi | Intersection of editable fields; “Mixed” for conflicts; bulk apply |
| Definition focus (catalog row) | That definition’s form (or deep-link opens catalog dock) |

## 6.2 Layout

```
[ Selection header: icon + name + kind badge ]
[ Quick actions: Focus · Duplicate · Delete · Advanced JSON ]
────────
▼ General
▼ Appearance
▼ …
[ LootRef widget → opens Loot picker popover ]
```

Categories from schemas. Advanced fields hidden unless Advanced Tier on.

## 6.3 Property editor widgets (complete set)

| Field type | Widget |
| :--- | :--- |
| string | Text input; Enter commits |
| number | Slider+input if min/max; else stepper |
| boolean | Switch |
| enum | Segmented or select |
| lootRef | Pool picker + strategy toggle + “Simulate” |
| itemId | Item search popover |
| spriteId | Thumbnail + “Pick from Assets” |
| vector2 / tile | X/Y + “Pick on map” eyedropper mode |
| color | Swatch (class colors) |
| json | Monaco/textarea **Advanced only** |
| list | Row editor (+/−), not raw JSON by default |
| reference | Searchable link (quest, dialogue, creature) |

**Commit model:** change → draft selection; **Ctrl+S** / blur / Enter persists per target (map draft vs definition API). Dirty dots on fields optional; status bar owns map dirty.

## 6.4 Migration of today’s PropertiesPanel

| Today section | Destination |
| :--- | :--- |
| Components (paint) | **Palette** in Paint/Script toolbar — not Inspector |
| Dialogue & Quest tips | Inspector quick links when NPC selected |
| Warp Gate | Inspector when warp logic / warp entity selected + Warp tool |
| Place Tag | Palette |
| Encounter Zone | Inspector when encounter selection / tool |
| Register Component | Advanced Tier → “New Logic Component” dialog |

---

# 7. Context Menus

## 7.1 Viewport (right-click)

**Empty cell / tile under cursor**

* Paint here with current brush  
* Place → NPC / Resource Node / Spawner / Warp…  
* Sample (eyedropper)  
* Paste  
* Go to Outliner  

**On entity**

* Select · Invert select  
* Cut / Copy / Paste / Duplicate  
* Delete  
* Focus in Outliner  
* Open Dialogue / Quest (if refs)  
* Reset transform  
* Hide overlay / Lock  

**On logic harvest/shop/warp**

* Edit in Inspector  
* Remove component  
* Copy component params  

## 7.2 Outliner row

Same as entity/tile subset + Rename (inline).

## 7.3 Catalog list row (Quest, Loot, …)

* Open · Duplicate · Export JSON · Delete · Copy ID  

## 7.4 Rules

* Menus ≤ 12 items; overflow in submenu  
* Destructive actions require confirm only for multi-delete or published live maps  
* Never block viewport with a modal for routine context actions  

---

# 8. Dock Specifications (every window)

Shared dock chrome (evolve `DraggablePanel` → optionally rename `StudioDock`):

* Title · pin · collapse · pop-out (future) · close  
* Optional **dock search** field in header when list+detail layout  
* Tab flash on validation error  
* `*` in title when that dock holds unsaved **definition** edits  

Default sizes stay near today’s; snap to left/right/bottom edges on drag near edge (optional Phase 3).

---

## 8.1 Palette / World Builder (`build`)

**Role:** Brush & map IO shelf (not the Inspector).

**Regions:**
1. **Map IO** — Open (searchable), Save, New (dialog), current map chip  
2. **Layers** — Logic (−1) + visual layers; eye/lock; + Layer  
3. **Palette tabs** — Tilesets | Logic Tags | Prefabs (Place)  
4. **Tileset grid** — current picker; hover GID tooltip; recently used row (8 slots)  
5. **Logic tags** — search + presets from `logicComponents`  

**Workflows:** see §14.  
**Remove** duplicate “paint components” once Inspector migration done.

---

## 8.2 Inspector (`properties`)

See §6. Title becomes **Inspector**.

---

## 8.3 Asset Browser (`assets`)

Keep Asset Manager + Sprite Browser tabs; upgrade interactions:

| Feature | Spec |
| :--- | :--- |
| Search | Debounced; fuzzy name/tag/pack |
| Filters | Type, pack, tags, solid/interactable, approved |
| Views | Grid (S/M/L) · List · Pack folders |
| Multi-select | Shift/Ctrl; bulk set flags |
| Drag | Drag sprite/prefab → viewport Place (§11) |
| Double-click | Set as Place prefab + switch to Place mode |
| Right-click | Copy key · Edit metadata · Show in pack |
| NPC wiring | Listen `studio_sprite_picked` **and** set NPC form sprite / Place prefab |

---

## 8.4 NPC dock (`npc`)

**Layout:** List (60%) | Quick place form (40%) — or list + Inspector does full schema.

| Element | Spec |
| :--- | :--- |
| List | All map NPCs with sprite thumb, name, coords; filter |
| Select | Sync Outliner + Inspector + viewport halo |
| Place | Sticky last template; click Place tool + world click |
| Sprite | Button opens Assets filtered; accepts DnD / pick event |
| Delete | Del key / context menu |
| Save | Writes `npcsData` + **emit `map_entities` reload** (`18` §7) |
| Empty | “No NPCs — drag a sprite here or click Place” |

Greeting / questSlug become schema fields in Inspector; dock focuses placement & list.

---

## 8.5 Quest dock (`quest`)

Keep list|form. **Add missing fields to form (not JSON):** `levelReq`, `isRepeatable`, per-objective `requiredQty`.

| UX | Spec |
| :--- | :--- |
| Search | Filter title/slug |
| Stages | Card list with drag reorder |
| Rewards | Structured rows (itemId picker + qty) → serialize JSON under the hood |
| Link | “Assign to selected NPC” one click |
| Validate | Inline errors on Save |

---

## 8.6 Dialogue dock (`dialogue`)

| UX | Spec |
| :--- | :--- |
| Default | Open in Populate mode defaults |
| Nodes | Card list Phase 1; **graph canvas** Phase 3 (node positions persisted) |
| Options | Row editors; action enum; quest ref picker |
| Preview | “Play from node” popup (linear walkthrough) |
| Raw JSON | Advanced Tier tab only |
| Filter | npcId / name |

---

## 8.7 Creature / Loot / Classes / Heroes

Keep strong catalog patterns (Creature & Heroes are reference quality).

**Shared CatalogEditorShell pattern (`18`):**

```
[Header: title · count · Seed · Import · New · Refresh]
[Search + filters]
[List] | [Form via SchemaFieldRenderer or specialized]
[Footer: Save · Duplicate · Delete · Export]
```

**Loot Manager upgrades:**
* Weighted entries as **rows** (item picker, weight, min, max) — JSON Advanced only  
* Guaranteed rows same  
* Drop groups UI (Phase 2)  
* Simulate stays  
* “Used by” dependency strip (entities referencing pool)

**Classes:** Dev Tools legacy Class Registry hidden behind Advanced or removed once parity confirmed.

---

## 8.8 Dev Tools (`dev`)

Tabs unchanged permission model. Add: **Validation** tab (map issues), **Reload bus** log (Advanced), **Shortcuts** cheat sheet link.

---

## 8.9 Future docks (from `18`, UX-defined now)

| Dock | When | UX |
| :--- | :--- | :--- |
| Items | Phase 3 | Catalog shell + dependency viewer |
| Shops | Phase 3 | List shops; line items; link NPC `shopId` |
| Publish | Phase 4 | Checklist wizard (rare allowed modal) |

---

# 9. Popups & Dialogs (closed set)

Only these blocking/semi-blocking surfaces:

| ID | Type | Trigger | Contents |
| :--- | :--- | :--- | :--- |
| `new-map` | Dialog | File → New | slug, name, W/H, Create |
| `open-map` | Popover/palette | Ctrl+O | Search maps, Enter opens |
| `command-palette` | Modal-lite | Ctrl+K | §13 |
| `shortcuts` | Dialog | `?` | Grouped shortcut table |
| `confirm-delete` | Dialog | Destructive multi / live map | Confirm |
| `publish` | Wizard | Admin publish | Checklist (Phase 4) |
| `new-logic-component` | Dialog | Advanced register | Today’s register form |
| `loot-picker` | Popover | lootRef field | Search pools |
| `item-picker` | Popover | itemId field | Search items |
| `sprite-picker` | Popover | sprite field | Mini asset grid |
| `validation` | Popover | Status icon | Issue list → click jumps |
| `simulate-loot` | Popover | Loot dock | Keep inline preferred |
| `json-import` | Dialog | Catalog import | Paste JSON |
| `preferences` | Dialog | Edit → Preferences | Grid, autosave, Advanced default |

**Forbidden:** full-screen property wizards for NPCs, warps, or brush settings.

---

# 10. Overlays & Gizmos

## 10.1 Viewport overlays (editor_overlay — never export)

| Overlay | Modes | Visual |
| :--- | :--- | :--- |
| Tile grid | Paint/Place/Script | 1px lines, dim |
| Collision | toggle | Red tint solids |
| Logic tint | Script / optional | Color by component kind |
| Encounter radius | Populate | Yellow wash |
| Spawner radius | Place/Populate | Cyan circle (overlay only) |
| Entity labels | toggle | Name plates |
| Selection | always create | Amber outline on tiles/entities |
| Multi-select | always | Shared bounds |
| Brush ghost | Paint/Place | Preview stamp under cursor |
| Drop ghost | DnD | Prefab silhouette valid/invalid |
| Path safe | Validate | Optional walkable flood |

Toggle via View menu; states in `editor-store`.

## 10.2 Gizmos

| Gizmo | Use |
| :--- | :--- |
| Tile marquee | Rect select / rect paint |
| Entity move | Drag on grid (snap) |
| Warp arrow | From cell toward target map label |
| Spawner radius handle | Drag to edit radius prop |
| Encounter rect handles | Resize zone |

Snapping: always to tile grid unless Advanced “free place” (off by default for 2D MMO).

---

# 11. Selection, Multi-Select, Drag-and-Drop

## 11.1 Selection model

```ts
selection: {
  kind: 'none' | 'tiles' | 'entities' | 'mixed';
  tiles: { r: number; c: number; layer: number }[];
  entityIds: string[];
  primary?: { type: 'tile' | 'entity'; id: string };
}
```

| Input | Result |
| :--- | :--- |
| Click | Replace selection |
| Ctrl/Cmd+click | Toggle |
| Shift+drag | Marquee add |
| Esc | Clear |
| Ctrl+A | All on active layer / all entities in filter |

Paint tools do **not** select unless Select tool active (or Alt held for temporary select).

## 11.2 Multi-select behaviour

* Inspector shows shared fields; applying sets all  
* Delete removes all  
* Duplicate offsets by +1,+1 tile  
* Cannot multi-edit incompatible kinds without “mixed” lock  

## 11.3 Clipboard

Internal clipboard: tiles GID stamp **or** entity JSON refs. `Ctrl+C/X/V`. Paste at cursor tile.

## 11.4 Drag-and-drop matrix

| Source | Target | Result |
| :--- | :--- | :--- |
| Asset sprite | Viewport | Enter Place mode + stamp on drop cell |
| Asset sprite | NPC sprite field | Set spriteId |
| Loot pool row | Inspector lootRef | Assign pool |
| Quest row | Selected NPC | Set quest giver ref |
| Outliner entity | Viewport | Move to cell |
| Palette prefab | Viewport | Place |
| File JSON (Advanced) | Catalog dock | Import |

Invalid drops: red ghost + toast reason.

---

# 12. Keyboard Shortcuts (complete)

Conflict fix: **bare `E` never toggles Studio** on `/studio`. Interact = `F` or `Space` in Walk; Eraser = `E` only in Paint with Eraser tool (or hold `E` for temp eraser).

| Shortcut | Action |
| :--- | :--- |
| `Ctrl+E` | Toggle Create ↔ Walk |
| `Space` | Walk Mode (from create) / Interact (in Walk if not moving) |
| `0` / `` ` `` | Walk |
| `1`–`4` | Paint / Place / Populate / Script |
| `5` | Catalog focus |
| `Q` `B` `E` `G` `I` `R` `L` | Tools (§4.2) |
| `P` | Place tool |
| `W` | Move gizmo |
| `[` `]` | Brush size |
| `Ctrl+S` | Save Map (dirty) |
| `Ctrl+Shift+S` | Save All definitions + map |
| `Ctrl+O` | Open Map palette |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / Redo |
| `Ctrl+D` | Duplicate |
| `Delete` / `Backspace` | Delete selection |
| `Ctrl+C/X/V` | Clipboard |
| `Ctrl+A` | Select all (layer/entities) |
| `Esc` | Clear selection → close menu → Options (existing ladder) |
| `Ctrl+K` | Command palette |
| `Ctrl+.` | Zen mode |
| `?` | Shortcuts |
| `F` | Interact / talk (Walk) |
| `F2` | Rename in Outliner |
| `Ctrl+1..9` | Focus dock slots (optional) |

Gameplay HUD keys (I/K/P/…) remain Walk-only when HUD visible.

---

# 13. Search, Filter, Command Palette

## 13.1 Command palette (`Ctrl+K`)

Single omnibox groups:

1. **Commands** — Save, Walk, Validate, Toggle Grid…  
2. **Maps** — open by id/name  
3. **Modes / Tools**  
4. **Docks** — open panel  
5. **Definitions** — quests, loot, creatures, dialogue, items (jump + select)  
6. **Entities on map** — NPC names  

Enter runs; Esc closes; fuzzy match; recent 5 at top.

## 13.2 Per-surface filters

| Surface | Filters |
| :--- | :--- |
| Outliner | Text + kind chips |
| Assets | type, pack, tags, flags |
| Loot / Quest / Dialogue / Creature | text + gameId (implicit profile) |
| Open Map | text + gameId |
| Logic palette | text + category |

Filters persist per dock session (memory); not required in localStorage v1.

---

# 14. Core Workflows (step-by-step, min clicks)

## 14.1 Paint ground

1. `1` Paint  
2. Click grass in recent/palette (if not sticky)  
3. Drag on world  
4. `Ctrl+S`  

## 14.2 Paint collision / harvest tag

1. `4` Script (or Paint → Logic layer)  
2. Pick tag in Palette  
3. Click cells  
4. `Ctrl+S` · `Space` Walk · test  

## 14.3 Place NPC + dialogue

1. `3` Populate  
2. Drag sprite from Assets → cell **or** Place tool + click  
3. Inspector: name, dialogue ref (picker)  
4. `Ctrl+S` · live reload entities  
5. `Space` · `F` talk  

## 14.4 Warp

1. Script → Warp tool  
2. Click source cell  
3. Inspector: target map + spawn (pick-on-map for spawn)  
4. Save · Walk through  

## 14.5 Loot pool → tree

1. `Ctrl+K` → “Loot” → Create pool · add rows · Save  
2. Place Resource Node · Inspector lootRef → pick pool  
3. Save · Walk · gather  

## 14.6 Quest assign

1. Quest dock New → fill stages → Save  
2. Select NPC → Inspector “Assign quest” **or** drag quest onto NPC  
3. Walk · talk  

## 14.7 Multi-edit logic region

1. Select tool · marquee cells  
2. Inspector set shared component param  
3. Apply · Save  

---

# 15. Navigation System

| Need | Mechanism |
| :--- | :--- |
| Between maps | Breadcrumb Open · Ctrl+O · Outliner world root · warp Walk test |
| Between modes | Chips · number keys · palette |
| Between docks | Dock strip · Ctrl+K · View menu |
| To selection | Double-click Outliner · “Focus” in Inspector |
| Camera | Player walks (identity); optional “Frame selection” eases player/ghost to tile — **no detached free-cam required in v1**; Phase 4 ghost avatar may orbit |
| Deep link | `?studioMap=&studioMode=&studioSelect=` (optional later) |

Breadcrumb: `Profile / MapId / LayerOrEntity`.

---

# 16. Feedback, Errors, Empty States

| State | UX |
| :--- | :--- |
| Save OK | Toast + status “Saved” + clear dirty |
| Save reject | Toast + Validation popover jump |
| Paint fail (no tileset) | Toast + button “Repair tilesets” (bootstrap) |
| Empty Outliner group | One-line CTA |
| Empty catalog | Seed / New primary buttons (keep Heroes pattern) |
| Permission denied | Shield empty (keep Dev pattern) |
| Live reload | Subtle top flash “Map updated” |

---

# 17. Accessibility & Input

* All tools reachable by keyboard (§12)  
* Focus rings on dock controls  
* Do not rely on color alone for validation (icon + text)  
* Touch: long-press = context menu; Place mode large hit targets; toolbar larger on coarse pointer  
* Screen reader: dock titles and selection announcements (polite live region on select change)

---

# 18. Walk Mode & Play-Test UX

| Element | Spec |
| :--- | :--- |
| Entry | Default on `/studio` after login (keep) |
| Pill | “Walk Mode · Press 1 to Paint” (not only Ctrl+E) |
| HUD | Full gameplay HUD |
| Quick return | `Ctrl+E` restores last mode + dock layout |
| Isolate | Future: pause spawners toggle in Play menu |

---

# 19. Advanced Tier (UX)

Toggle in View / Status. When on:

* Raw JSON tabs on catalogs & Inspector  
* Bulk import  
* Reload bus log  
* Free place / show GID numbers  
* Engine Dev tabs already gated by permission  

Default off for fun-first (`16` §10).

---

# 20. Phased UX Delivery (aligns with `18` §11)

| Phase | UX deliverables | Reuse |
| :--- | :--- | :--- |
| **UX-0 Docs** ✅ | This bible | — |
| **UX-1 Skeleton** | Status bar, tool Select vs Brush, fix `E` conflict, mode labels aliases, dialogue in Populate defaults, Ctrl+S save, dirty flag | Shell + store + canvas paint gate |
| **UX-2 Inspector** | Wire SchemaFieldRenderer; move paint presets to Palette; Outliner v1 (NPCs + warps) | schemas, npcsData |
| **UX-3 Tools** | Erase/Fill/Eyedropper/Rect; brush size; overlays grid/collision; undo paint | Babylon paint path |
| **UX-4 Flow** | Context menus; DnD asset→world; command palette; NPC list+live reload; loot row editors | existing APIs |
| **UX-5 Polish** | Gizmos, multi-select bulk, dialogue graph, Zen, preferences, Items dock UX | — |

**Non-goals in UX-1:** rewriting Babylon, new dock framework, removing floating catalogs.

---

# 21. Component Inventory (nothing undefined)

| UI piece | Defined in | Implements via |
| :--- | :--- | :--- |
| Menu bar | §4.1 | New thin chrome in shell |
| Toolbar | §4.2 | Shell + store `activeTool` |
| Status bar | §4.3 | Shell |
| Outliner | §5 | New region; data from map |
| Inspector | §6 | Evolve Properties + SchemaFieldRenderer |
| Context menus | §7 | Shared `StudioContextMenu` |
| Palette / World Builder | §8.1 | Evolve WorldBuilderPanel |
| Asset Browser | §8.3 | Evolve AssetBrowserPanel |
| NPC / Quest / Dialogue / Creature / Loot / Classes / Heroes / Dev | §8.4–8.8 | Evolve panels |
| Popups set | §9 | Shared dialog/popover |
| Overlays / gizmos | §10 | Babylon editor overlays |
| Selection / DnD | §11 | store + canvas |
| Shortcuts | §12 | shell + canvas + index (remove bare E toggle) |
| Search / palette | §13 | Ctrl+K component |
| Workflows | §14 | QA acceptance scripts |
| Navigation | §15 | breadcrumb + open map |
| Feedback | §16 | toasts + validation |
| A11y | §17 | — |
| Walk | §18 | existing pill + copy |
| Advanced | §19 | View toggle |

---

# 22. Anti-Patterns (UX-specific)

1. Always-paint with no Select tool  
2. Bare `E` double-bound to toggle + interact  
3. Inspector that is secretly a second brush palette  
4. JSON-first forms for weighted loot / rewards when row editors exist  
5. Modal for every property  
6. Hiding Save only inside one dock with no Ctrl+S / status action  
7. Dock framework rewrite for visual refresh only  
8. Grey empty IDE that hides the live world  
9. Undefined right-click (“we’ll add later”) — §7 is the contract  
10. Second command system beside Ctrl+K  

---

# Final UX Rule

**The world is the document. Chrome is the instrument.**  
Every control exists to shorten the path from intention → visible change → Walk → feel. If a control does not earn its click, it does not ship.
