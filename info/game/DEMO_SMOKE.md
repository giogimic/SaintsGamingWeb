# Demo Smoke Path — Road to Aethervale (v2.1.118)

Playable vertical slice for human testing.

## Boot

1. Server runs `bootstrapDemoContent()` **before** map-loader init — logic tiles, `DEMO_SANDBOX` grid, CreatureDefs, Vance dialogue, film recipes, Q1–Q4 templates.
2. Join `/lobby` with a character that has credits in `stateData` (creator default ~1000). Spawn plaza ≈ `(14,15)`.

## Path

| Step | Action | Expect |
| ---: | :--- | :--- |
| 1 | Walk north path — click or **E** on **Warden Vance** | Server dialogue opens |
| 2 | **Take the Starter Toolbelt (start Q1)** | `axe_bronze` + `pickaxe_bronze`; quest tracker shows Q1 |
| 3 | SE trees/rocks — face tile, **E** gather | `wood_log` / `ore_copper` + toast; Q1 progress |
| 4 | Vance → **Report progress / turn in** (after 3+3) | Q1 complete → crystal dust + Q2 auto-starts |
| 5 | Ask for film → **Grant me a starter film pack** (optional) | `soul_camera` + 5× `film_standard` |
| 6 | Shop tile `(11,14)` **or** craft table `(11,15)` → CRAFT Standard Film | Film in inventory; Q2 craft stage ticks |
| 7 | Vance → Report again | Q2 complete → Q3 First Bond |
| 8 | **Open the Lab** → claim Agnite / Budaye / Dollfin | Party starter; Q3 complete → Q4 |
| 9 | Face bramble wall `y=10` — **E** (axe + party) | Tile clears; Q4 complete; north grass opens |
| 10 | Plaza tall grass `(16–18,12–14)` or north grass → TB → **EXPOSE FILM** | Capture / break free; film consumed |
| 11 | Click wild **Rockitten** → hotbar Strike | RT damage / loot on kill |

## Capture rules (demo)

- Film only in TB battle (not RT hotbar)
- Real inventory required (Vance grant or shop/craft)
- Soul Camera is flavor/tool — film alone is enough for MPV

## Studio

- `/studio` → Creatures → Seed/edit species  
- `/studio` → Heroes for player archetypes  
