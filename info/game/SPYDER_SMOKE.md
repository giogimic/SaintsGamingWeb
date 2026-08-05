# Spyder Campaign Smoke â€” Azure â†’ Route 1 â†’ Cotton

Playable on-ramp for human testing (PR #4).

## Boot

```bash
npm run migrate:campaign   # once
npm run ensure:campaign    # encounters + gates/grass
npm run ensure:starter-heroes  # Spyder Tamer in creator list
npm run seed:campaign-npcs # NPCs + quest chain
# Tile art reimport scripts were removed from this repo; use already-curated campaign data.
npm run dev
```

## Visual browser check

With `npm run dev` already up:

```bash
npm run visual:browser-to-game
```

Walks home â†’ `/lobby` â†’ register/login â†’ Spyder Tamer â†’ Azure Town. Screenshots land in `/opt/cursor/artifacts/visual-check/` (or `OUT_DIR`).

## Path

| Step | Action | Expect |
| ---: | :--- | :--- |
| 1 | Create **Spyder Tamer** | Spawn `AZURE_TOWN` â‰ˆ `(25,25)` (not forced to DEMO) |
| 2 | Talk **Azure Guide** â†’ **I'm ready.** | Quest accepted; film + **Budaye** in party; toast |
| 3 | Talk Guide again | Q1 completes â†’ Q2; Guide copy shifts to townsfolk hint |
| 4 | Talk **Enforcer** then **Knight** | Q2 stages tick; film reward; Q3 First Capture |
| 5 | Talk Guide | State-aware: â€œeast gate / tall grassâ€ (or starter gate if no party) |
| 6 | Walk **east** to edge tile `(49,25)` | Warp â†’ `SPYDER_ROUTE1` near scout (road is carved open) |
| 7 | Walk tall grass mid-route | TB encounter (needs party); **EXPOSE FILM** to capture |
| 8 | Return west â†’ Guide | Report copy; Q3 completes â†’ Q4 Cotton Town |
| 9 | Route 1 **east** â†’ Cotton west gate | Warp â†’ greeter at `(4,19)` (reachable corridor) |
| 10 | Talk greeter | Q4 complete â†’ Q5 Cotton Locals |
| 11 | Step north door `(8,18)` â†’ Scoop | Warp indoors; talk **Scoop Clerk** |
| 12 | Exit Scoop â†’ door `(12,18)` â†’ CafÃ© | Talk **CafÃ© Host**; Q5 â†’ Q6 Tunnel |
| 13 | Walk **east** plaza to `(37,18)` | Warp â†’ tunnel; talk **Carlos** (Q6 stage 1) |
| 14 | Carlos â†’ **Challenge Carlos** | Trainer TB: **Dragarbor â†’ Pairagrin**; no flee/capture; both down â†’ Q6 complete â†’ **Q7** |
| 15 | After battle UI closes | Carlos post-win (hints Route 2 east) / post-lose (points to Scoop nurse); rematch available |
| 16 | Optional: Scoop **Browse shop** / **nurse heal** | Film merchant opens; party HP full; soft-heal also syncs after lose |
| 17 | Tunnel **east** `(38,7)` â†’ Route 2 | Warp â†’ scout `(4,10)`; talk scout â†’ Q7 complete â†’ **Q8** |
| 18 | Route 2 **east** `(39,10)` â†’ Route 3 â†’ Leather west | Corridors open; greeter `(4,21)`; talk â†’ Q8 complete â†’ **Q9** |
| 19 | Leather door `(10,18)` â†’ Center | Nurse **heal party**; exit south back to town |
| 20 | Scoop door `(14,18)` â†’ talk clerk | Film shop (`OPEN_SHOP`); Q9 complete â†’ **Q10** |
| 21 | Gym door `(24,20)` â†’ **Challenge Rook** | Trainer TB: **Rockitten â†’ Aardorn**; win â†’ Q10 complete â†’ **Q11** |
| 22 | After battle UI | Rook post-win (hints east shaft) / post-lose (Center nurse); rematch OK |
| 23 | Town east `(39,21)` â†’ Shaft1 | Talk scout â†’ Q11 stage 1 |
| 24 | Shaft1 east `(14,7)` â†’ Shaft2 | Talk Deep Miner â†’ Q11 complete |
| 25 | Tracker with no active quests | â€œSpyder Trail Clearâ€ if Q11 completed; else Guide / shaft prompt |

## Economy note

Quest rewards with `gold` add to character **credits** (shop wallet). Spyder Tamer starts with 1000 G; Cotton/Leather quest gold tops up film purchases.

## Automated check

```bash
npm run ensure:campaign && npm run seed:campaign-npcs
npm run smoke:spyder
```

Verifies gates, walkable corridors, NPC tiles, dialogue trees, and quest stages (no server required).

## Notes

- Capture consumes Prisma `film_standard` (Guide grant / quest rewards).
- Demo Vance path stays on `DEMO_SANDBOX` only.
- TMX densify (optional): TMX-based NPC import scripts were removed from this repo; use curated seeds only.
