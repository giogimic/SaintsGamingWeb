# Capture Fantasy — Soul Camera & Film (Draft)

**Date:** 2026-08-02  
**Status:** Design draft → replaces Binding Crystal / Core Capsule flavor  
**Bible hook:** Capture remains **turn-based only** (07, 11). Item modifier tiers stay; names and fantasy change.

---

## Fantasy

You do not bottle the creature in a crystal.  
You **expose a frame** — a strip of soul-sensitive film — and the Camera binds their essence into your archive.

Better film stock = cleaner exposure = higher chance the soul *holds* on the negative.

---

## Items

| Slug | Display name | Consumed? | Item modifier | Role |
| :--- | :--- | :---: | ---: | :--- |
| `soul_camera` | Soul Camera | No (tool) | — | Required in inventory to attempt capture (optional hard gate) |
| `film_standard` | Standard Film | Yes (1 per throw) | **1×** | Demo / shop basic (maps from old Basic Crystal) |
| `film_fine` | Fine Grain Film | Yes | **2×** | Mid tier (Advanced Crystal) |
| `film_soul` | Soul Stock Film | Yes | **255×** | Near-guaranteed (Perfect Crystal) — rare reward only |

**Tutorial mapping (Aethervale Q2):**  
“Empty Core Capsule” → craft / grant **`film_standard`** (and optionally unlock `soul_camera` once).

**Catch math (unchanged formula, new modifiers):**

```
Capture Chance = ((Max HP - Current HP) / Max HP) * StatusMod * ItemMod * BaseCatchRate * 255
```

Server rolls `0–255`; success if `roll < Capture Chance` (existing helpers).

---

## TB battle UX

1. Weaken creature with Fight.  
2. **BAG → Film** (not RT hotbar — constitution).  
3. If `soul_camera` gate is on and missing → toast: “You need a Soul Camera.”  
4. Consume one film stack → run capture math → on success, `PlayerCreature` insert (“soul archived”).

Button copy sketch: **“EXPOSE FILM”** / **“CAPTURE SOUL”**.

---

## Economy / tutorial

| Source | Grant |
| :--- | :--- |
| Q1 Vance | tools only (no film) |
| Q2 smithy / craft | 3× `film_standard` (+ `soul_camera` once) |
| Shop | sell `film_standard`; craft dust→film later |
| Q4 reward | 5× `film_standard` or 2× `film_fine` |

Craft sketch (replaces Binding Crystal recipe):

- 2× `crystal_dust` + 1× `wood_log` → 1× `film_standard`  
  (or rename dust → `silver_halide` later — keep dust for MPV)

---

## Code migration plan (when implementing)

1. `ITEM_MODIFIERS`: `film_standard` / `film_fine` / `film_soul` (keep `binding_crystal` as alias → 1× for one release).  
2. `FORBIDDEN_RT_CAPTURE_ABILITIES`: add film/camera ids; keep capture forbidden on RT hotbar.  
3. Shop catalog + TB BAG button → `film_standard`.  
4. Quest rewards / `quests.ts` → film slugs.  
5. UI strings: Binding Crystal → Standard Film / Soul Camera.

---

## Open (ask if changing)

1. **Hard gate:** Must own `soul_camera` to throw film, or is film alone enough for MPV?  
2. **Camera tiers later?** (Box / Reflex / Astral) vs film-only tiers for catch rate?
