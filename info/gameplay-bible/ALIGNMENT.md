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
| Multiplayer lobby (see/move/chat) | **Improved 2026-08-03:** same-shard see/move/local-chat + soft reconnect; **bramble clears are per-account** (shared grid stays seeded) |
| Tuxemon-based adventure zone | Partial (maps + tuxemon data present) |
| Encounters + TB capture loop end-to-end | Improved (2.1.114) — directMessage, capture math, PlayerCreature insert; needs human smoke |
| RT combat vs monsters (server math, loot) | Improved (2.1.114) — range/LoS/miss/crit + loot despawn; needs human smoke |
| Inventory | Partial |
| Skills framework | Partial (not full 27) |
| Base plot place/save/visit | Partial foundation (`BASE`, overlays) |
| Editor load/place/save | **Improved 2026-08-03:** Save/NPC/Quest docks; Asset Manager via `/api/assets`; Walk Mode default; `validateMapSave` on REST save |

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

### Slice D — Studio creator UX (16, toward MPV editor) — **DONE 2026-08-03** (permission matrix deferred)
1. Contextual modes (Build / NPC / Quest / Creature / Test) — **Done:** mode strip + panel presets  
2. Permission-gated floating docks (extend current shell) — deferred (`/studio` already Developer+)  
3. Tag/component placement UX over raw logic paint — **Done:** Logic Tag Palette on layer −1 + Properties “Place Tag” brush  
4. **Done:** World Builder **Save Map** → `POST /api/maps/[slug]` + `admin_reload_map` hot-reload; **Logic (−1)** layer target (was unreachable `-2`)  
5. **Done:** NPC Drop mutates `activeMapData.npcs` (+ `/api/npc-dialogue`); Asset browsers use `/api/assets` (no Prisma-in-browser); seed from `public/game-assets`  
6. **Done:** Create New Map persists via `POST /api/maps`; +Layer works; map search hydrates from `/api/maps`; tileset img path fallback  
7. **Done:** Quest dock lists `QuestTemplate` via `/api/quests/templates`; assign merges `ACCEPT_QUEST` onto `NpcDialogueTree` (existing DialogueManager path) 

### Slice E — Website ↔ game (10, ecosystem)
1. Profile pinned creature — **Done 2026-08-03:** `User.pinnedBeastId` → owned `PlayerCreature`; profile shows pixel sprite (`getPublicProfile.pinnedCreature`)  
2. Marketplace / inventory async bridge — **Done 2026-08-03:** web `purchaseGtcListing` / `createGtcListing` + profile inventory from `PlayerInventoryItem`; lobby `inventory_sync` on join  
3. Social feed hooks for rare captures — **Done 2026-08-03:** TB `CAPTURE` → `battle_ended.capture.isRemarkable` → client `createSocialPost` (reuse existing social action; no new feed stack) 

---

## Do not do next (bible says wait / back-line)

* Discord / FiveM / S3 / heavy realtime LLM dialogue in production  
* Full 27-skill content grind before combat + capture loops are solid  
* Separate MMO microservice split before architecture is proven (07)  
* Replacing Babylon lobby with a second engine  

---

## Immediate next decision for product owner

Slices **A–C** + shop/craft/Rockitten MPV path in **2.1.115**.  
Next product pick: **D** (Studio creator UX) or **E** (website ↔ game), or quest grants for gather tools.  
Human smoke: claim Rockitten → shop/craft crystal → TB capture; RT hotbar vs wild Rockitten.
