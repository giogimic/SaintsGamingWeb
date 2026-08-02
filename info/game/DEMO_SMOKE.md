# Demo Smoke Path — Road to Aethervale (v2.1.117)

Playable vertical slice for human testing.

## Boot

1. Server runs `bootstrapDemoContent()` — CreatureDefs, Vance dialogue, film recipes.
2. Join `/lobby` with a character that has credits in `stateData` (creator default ~1000).

## Path

| Step | Action | Expect |
| ---: | :--- | :--- |
| 1 | Walk near spawn — click **Warden Vance** | Dialogue opens |
| 2 | **Take the Starter Toolbelt** | Inventory gets `axe_bronze` + `pickaxe_bronze` |
| 3 | Ask for film → **Grant me a starter film pack** | `soul_camera` + 5× `film_standard` |
| 4 | **Open the Lab** (or Party → Open Lab) | Choose Agnite / Budaye / Dollfin → claim |
| 5 | Shop tile **or** buy dust+log → CRAFT Standard Film | Film in inventory |
| 6 | Gather tree/rock (logic tiles) with tools | `wood_log` / `ore_copper` + toast |
| 7 | Tall grass → TB battle → weaken → **EXPOSE FILM** | Capture or break free; film consumed |
| 8 | Click wild **Rockitten** → hotbar Strike | RT damage / loot on kill |

## Capture rules (demo)

- Film only in TB battle (not RT hotbar)
- Real inventory required (Vance grant or shop/craft)
- Soul Camera is flavor/tool — film alone is enough for MPV

## Studio

- `/studio` → Creatures → Seed/edit species  
- `/studio` → Heroes for player archetypes  
