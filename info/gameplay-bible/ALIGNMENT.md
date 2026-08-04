# Gameplay Bible ↔ Codebase Alignment

**Date:** 2026-08-02  
**Bible:** `info/gameplay-bible/` (16 pages)  
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
1. Contextual modes (Build / NPC / Quest / Creature / Test) — **done**  
2. Permission-gated floating docks (extend current shell) — **done** (+ Loot Manager)  
3. Tag/component placement UX over raw logic paint — partial (`logicComponents`)  
4. **Phase 1 World Builder & Economy (17)** — **done**: `isEditorMode`, layer/entity/loot schemas, soft gameplay suppress in create tools, `/api/loot/tables`  
5. Remaining (Phase 2+): schema property panels for all entity kinds, Item Creator, avatar-free Studio session

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
Slice **D** Phase 1 foundation landed (bible **17**). Next: Phase 2 entity schema panels / Item Creator, or **E** (website ↔ game).  
Human smoke: Studio Build → Loot Manager create pool → Walk Mode play-test; claim Rockitten → TB capture.
