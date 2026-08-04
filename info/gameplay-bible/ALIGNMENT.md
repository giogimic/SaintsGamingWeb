# Gameplay Bible ↔ Codebase Alignment

**Date:** 2026-08-04 (Slice D through economy system)  
**Bible:** `info/gameplay-bible/` (23 pages)  
**Purpose:** Honest status for “continue till complete” — what exists, what conflicts, what to build next.

> Roadmap checkboxes in `12-demo-vertical-slice-roadmap.md` are **aspirational product intent**. This file is the **engineering truth**.

---

## Already strong (keep / improve, don’t replace)

| Bible area | Current state |
| :--- | :--- |
| Babylon 2.5D + lobby client | `GameCanvasBabylon`, `BabylonEngine`, `/lobby` |
| Server tick + managers | `GameEngine`, Player/World/Combat/Creature/… managers |
| Input authority + prediction | `input` → server sim; `move_ack` / `position_correction` |
| Lobby as social hub (foundation) | Multiplayer join, chat, parties (partial), HUD overlays |
| Studio entry split | `/lobby` player · `/studio` Developer · Staff FAB Mod/Admin |
| Mobile controls | Single surface, floating joystick default, fullscreen enter |
| Turn-based battle UI shell | `TurnBattleOverlay`, `gameMode: 'BATTLE'`, encounter hooks |
| RT combat UI shell | Hotbar, target frame, some projectiles/HP bars |
| Gathering / crafting / dialogue / quests | Managers + overlays exist (depth varies) |
| NPC AI FSM | CreatureManager wander/chase (partial) |
| Map editor v1 | Studio panels, WorldMap Prisma JSON, logic tiles |

---

## Constitution conflicts to resolve in code (priority)

| Rule (bible) | Risk in code today | Action |
| :--- | :--- | :--- |
| **Capture = turn-based only** (07, 11) | **Done (2.1.114):** Hotbar EXPLORING-only; `isForbiddenRtCaptureAbility`; CombatManager rejects capture; TB Binding Crystal only | Keep regression tests green |
| **RT combat = monsters; TB = encounters** (07) | **Done (2.1.114):** EncounterManager directMessage + movement lock; RT casts blocked while `isLocked` | Naming cleanup can continue; behavior enforced |
| **Editor hides engine concepts** (16) | Studio still exposes brush/tile/layer language | Migrate UX toward tags/components; keep logic layer under the hood |
| **Everything is an object** (05, 08) | Mix of tile paint + entity lists | Dual Legacy/Object path; don’t delete Tuxemon/legacy maps |
| **27-skill matrix** (09, 14) | Partial skill map in store / SkillManager | Expand toward full matrix without renaming existing XP hooks |

---

## MPV gap checklist (`06-mpv.md`)

| MPV proof | Status |
| :--- | :---: |
| Multiplayer lobby (see/move/chat) | Partial → improved (shard/base-map fix) — needs human 2-browser smoke |
| Tuxemon-based adventure zone | Partial (maps + tuxemon data present) |
| Encounters + TB capture loop end-to-end | Improved (2.1.114) — directMessage, capture math, PlayerCreature insert; needs human smoke |
| RT combat vs monsters (server math, loot) | Improved (2.1.114) — range/LoS/miss/crit + loot despawn; needs human smoke |
| Inventory | Partial |
| Skills framework | Partial (not full 27) |
| Base plot place/save/visit | Partial foundation (`BASE`, overlays) |
| Editor load/place/save | Partial (`/studio`) |

---

## Recommended execution order (next slices)

Aligned with bible + Golden Rule + “improve don’t replace”:

### Slice A — Constitution hardening — **DONE 2.1.114**
1. Capture-only-in-TB audit + tests  
2. Encounter vs monster interaction isolation (hotbar / lock / messaging)  
3. Persist bible cross-links in CONTINUE / ALIGNMENT  

### Slice B — Vertical slice combat — **DONE 2.1.114** (smoke remaining)
1. Server combat math (range, LoS, miss/crit) as authority  
2. Loot bag entity lifecycle (drop + 60s despawn + pickup)  
3. `combat_update` → canvas projectile / damage text path  

### Slice C — Turn-based creature loop — **DONE 2.1.114** (smoke remaining)
1. Encounter → BATTLE lock/unlock via directMessage  
2. Capture math + `PlayerCreature` insert + crystal consume  
3. Victory/defeat/flee return to overworld  

### Slice D — Studio creator UX (16, toward MPV editor) — **IN PROGRESS**
1. Contextual modes (Build / NPC / Quest / Creature / Test) — **done** (bible Walk/Paint/Place/Populate/Script aliases → see **18**)  
2. Permission-gated floating docks (extend current shell) — **done** (+ Loot Manager)  
3. Tag/component placement UX over raw logic paint — partial (`logicComponents`)  
4. **Phase 1 World Builder & Economy (17)** — **done**: `isEditorMode`, layer/entity/loot schemas, soft gameplay suppress in create tools, `/api/loot/tables`  
5. **Master architecture (18)** — **done (docs)**: full audit, reuse/merge rules, subsystem specs, hot-reload bus, plugin checklist  
6. **Complete UX design (19)** — **done (docs)**: every chrome region, tool, dock, menu, inspector, shortcut, DnD, workflow, overlay/gizmo; phased UX-1…UX-5  
7. **Complete Entity System (20)** — **done (docs)**: lifecycle, serialization, components, schemas, validation, events, refs, deps, runtime conversion, editor meta, prefabs/templates/variants/inheritance/composition; phases E1–E6  
8. **Complete World-Building Tools (21)** — **done (docs)**: terrain→save workflows, regions, auto-tile, brushes/fill/selection, layer ops, roads/water/rivers/cliffs/vegetation/buildings/furniture/lighting/weather/audio/biome/spawn; phases WB1–WB6  
9. **NPC / AI / Creature editors (22)** — **done (docs)**: NPC creation, BT/FSM, schedules, dialogue, relationships, patrols, combat AI, shops, quests, reputation, CreatureDef, capture, spawning, evolution, companions, bosses, world bosses, events; phases NAC1–NAC6  
10. **Complete Economy (23)** — **done (docs)**: Item Creator, equipment/consumables/materials, currencies, loot pools/groups/overrides/sim, crafting/gathering/refining, trading/auction/vendors, drop+economy balancing, rarity/tags/collections/achievements, global modifiers/seasons; phases ECO1–ECO6; unify ItemTemplate + LootService  
11. Remaining (implement): **19 UX-1** + **21 WB1** + **20 E1** + **22 NAC1** + **23 ECO1** — evolve registries; no parallel ITEM_DB/loot/recipe SoTs

### Slice E — Website ↔ game (10, ecosystem)
1. Profile pinned creature  
2. Marketplace / inventory async bridge  
3. Social feed hooks for rare captures  

---

## Do not do next (bible says wait / back-line)

* Discord / FiveM / S3 / heavy realtime LLM dialogue in production  
* Full 27-skill content grind before combat + capture loops are solid  
* Separate MMO microservice split before architecture is proven (07)  
* Replacing Babylon lobby with a second engine  

---

## Immediate next decision for product owner

Slices **A–C** + shop/craft/Rockitten MPV path in **2.1.115**.  
Slice **D** docs through **23** (economy) landed. Next code: **UX-1 + WB1 + E1 + NAC1 + ECO1** (ItemTemplate SoT + LootService death drops). Or **E** (website ↔ game).  
Human smoke: Studio Build → Loot Manager create pool → Walk Mode play-test; claim Rockitten → TB capture.

---

## Studio unification notes (from 18–23 audit)

| Keep | Merge / demote | Do not create |
| :--- | :--- | :--- |
| WorldMap, Logic −1, existing docks, `entitySchemas`, `SchemaFieldRenderer`, `lootRefs`, DEMO bootstrap | GameMap reads, SaintsMap, dual ClassEditor, GameConfig loot writers as SoT, `ITEM_DB` as authoring SoT, `RESOURCE_NODE_MAP` magic | Second map table, second loot pipeline, second dock store, orphan property UIs, parallel ECS library |
| `npcsData`/`gatesData` via **adapters** during E1–E2 | Flat one-off object JSON columns per feature | Bespoke Studio panels per new gameplay object — use components (`20`) |
| `ItemTemplate` + `LootTable` + `CraftingRecipe` + Loot Manager | Dead `CRAFTING_RECIPES`, hardcoded craft overlay lists, hardcoded death loot, dual wood/ore slugs | Second price list beside `vendorValue` / ShopListing (`23`) |
