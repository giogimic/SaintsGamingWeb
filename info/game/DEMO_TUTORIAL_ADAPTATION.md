# Aethervale Demo Tutorial → Current Code / Bible Adaptation

**Date:** 2026-08-02 (rev 2)  
**Draft source:** `DEMO_TUTORIAL_AETHERVALE.md`  
**Related:** `STARTERS_BY_ELEMENT.md`, `CAPTURE_CAMERA_FILM.md`

---

## Locked / decided

| Topic | Decision |
| :--- | :--- |
| Capture TB-only | Bible 07 / 11 — unchanged |
| Gather tools | Quest grant (Q1 Vance) — no demo auto-grant |
| Capture fantasy | **Camera + Film** (soul exposure), not crystals/capsules |
| Starters | **One per element** for lab: Solar Agnite, Bio Budaye, Hydro Dollfin |
| Wild MPV test mob | Rockitten (Geo) until routes expand |

---

## Name → code mapping

| Draft term | Code slug / system |
| :--- | :--- |
| Warden Vance | `npc_warden_vance` |
| Emberwood Basin | Display name on current starter map until new map |
| Rook Hatchet | `axe_bronze` |
| Crude Pickaxe | `pickaxe_bronze` |
| Mesh Net | `net_mesh` (new) |
| Flint Tinderbox | `tinderbox_flint` (new) |
| Pine Logs | `wood_log` |
| Copper Ore | `ore_copper` |
| Empty Core Capsule | **`film_standard`** (Standard Film) |
| Standard Core Capsules | `film_standard` / `film_fine` rewards |
| Soul Camera | `soul_camera` (tool; optional gate) |
| Ignis Scrub starter | `agnite` (Solar) |
| Verdant Sprout starter | `budaye` (Bio) |
| River Pebble starter | `dollfin` (Hydro) |
| Coins | `credits` |

---

## Implement order (proposed)

1. Film slugs + modifiers (alias `binding_crystal` → 1×)  
2. Lab UI: three nests → `claim_starter` for agnite/budaye/dollfin  
3. Q1 Vance tool grant + gather counters  
4. Q2 craft/grant `film_standard` (+ camera)  
5. Q3 choose starter → TB capture with film  
6. Q4 bramble synergy later  

---

## Still open

1. Soul Camera hard-required to throw film?  
2. UI names: Saints (Pyre Drake…) vs Tuxemon (Agnite…)?  
3. Rockitten as 4th Geo nest or wild-only?  
4. Q1-only code next vs film+starters first?
