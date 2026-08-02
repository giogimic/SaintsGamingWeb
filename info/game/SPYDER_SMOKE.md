# Spyder Campaign Smoke — Azure → Route 1 → Cotton

Playable on-ramp for human testing (PR #4).

## Boot

```bash
npm run migrate:campaign   # once
npm run ensure:campaign    # encounters + gates/grass
npm run seed:campaign-npcs # NPCs + quest chain
npm run dev
```

## Path

| Step | Action | Expect |
| ---: | :--- | :--- |
| 1 | Create **Spyder Tamer** | Spawn `AZURE_TOWN` ≈ `(25,25)` (not forced to DEMO) |
| 2 | Talk **Azure Guide** → **I'm ready.** | Quest accepted; film + **Budaye** in party; toast |
| 3 | Talk Guide again | Q1 completes → Q2; Guide copy shifts to townsfolk hint |
| 4 | Talk **Enforcer** then **Knight** | Q2 stages tick; film reward; Q3 First Capture |
| 5 | Talk Guide | State-aware: “east gate / tall grass” (or starter gate if no party) |
| 6 | Walk **east** to edge tile `(49,25)` | Warp → `SPYDER_ROUTE1` near scout (road is carved open) |
| 7 | Walk tall grass mid-route | TB encounter (needs party); **EXPOSE FILM** to capture |
| 8 | Return west → Guide | Report copy; Q3 completes → Q4 Cotton Town |
| 9 | Route 1 **east** → Cotton west gate | Warp → greeter at `(4,19)` (reachable corridor) |
| 10 | Talk greeter | Q4 complete → Q5 Cotton Locals |
| 11 | Step north door `(8,18)` → Scoop | Warp indoors; talk **Scoop Clerk** |
| 12 | Exit Scoop → door `(12,18)` → Café | Talk **Café Host**; Q5 → Q6 Tunnel |
| 13 | Walk **east** plaza to `(37,18)` | Warp → tunnel; talk **Carlos** (Q6 stage 1) |
| 14 | Carlos → **Challenge Carlos** | Trainer TB: **Dragarbor → Pairagrin**; no flee/capture; both down → Q6 complete → **Q7** |
| 15 | After battle UI closes | Carlos post-win (hints Route 2 east) / post-lose (points to Scoop nurse); rematch available |
| 16 | Optional: Scoop **Browse shop** / **nurse heal** | Film merchant opens; party HP full; soft-heal also syncs after lose |
| 17 | Tunnel **east** `(38,7)` → Route 2 | Warp → scout `(4,10)`; talk scout → Q7 complete → **Q8** |
| 18 | Route 2 **east** `(39,10)` → Route 3 → Leather west | Corridors open; greeter `(4,21)`; talk → Q8 complete → **Q9** |
| 19 | Leather door `(10,18)` → Center | Nurse **heal party**; exit south back to town |
| 20 | Scoop door `(14,18)` → talk clerk | Film shop (`OPEN_SHOP`); Q9 complete |
| 21 | Optional: Gym door `(24,20)` | Attendant explains challenges not open yet |
| 22 | Tracker with no active quests | “Spyder Trail Clear” if Q9 completed; else Guide / Scoop prompt |

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
- TMX densify (optional): sparse-clone Tuxemon maps, then  
  `TUXEMON_PATH=/tmp/Tuxemon npm run import:map-npcs -- --map cotton`  
  and re-run `seed:campaign-npcs` so curated quest NPCs stay authoritative.
