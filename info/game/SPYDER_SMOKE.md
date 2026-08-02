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
| 6 | Walk **east** to edge tile `(49,25)` | Warp → `SPYDER_ROUTE1` near scout |
| 7 | Walk tall grass (green patch mid-route) | TB encounter (needs party); **EXPOSE FILM** to capture |
| 8 | Return west → Guide | Report copy; Q3 completes → Q4 Cotton Town |
| 9 | Route 1 **east** edge → Cotton | Warp → `COTTON_TOWN`; talk **Cotton Greeter** |

## Notes

- Capture consumes Prisma `film_standard` (Guide grant / quest rewards).
- Demo Vance path stays on `DEMO_SANDBOX` only.
- TMX NPC densify (optional): `TUXEMON_PATH=… npm run import:map-npcs`
