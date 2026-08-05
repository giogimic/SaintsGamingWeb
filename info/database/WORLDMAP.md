# WorldMap Ops

**Source of truth:** Prisma `WorldMap` table (runtime).  
**Seed dump (scripts only):** `scripts/data/campaign-maps.generated.ts` â€” never import from `app/` or `src/web/`.

---

## Models

### `WorldMap` (primary)

| Field | Contents |
| :--- | :--- |
| `id` | Map slug (e.g. `AZURE_TOWN`) |
| `gameId` | Campaign id (migrate uses `tuxemon`) |
| `name` | Display name |
| `gridData` | JSON 2D collision/logic grid |
| `gatesData` | JSON warp gates |
| `npcsData` | JSON NPC list |
| `encountersData` | JSON wild encounter pool |
| `tileLayersData` | JSON TMX tile layers |
| `tilesetsData` | JSON tileset metadata |
| `version` | Bumped on update |

### `GameMap` (collision mirror)

Kept in sync by migrate + `POST /api/maps/[slug]` so older server consumers that still read `GameMap` keep working. Prefer `WorldMap` for new code.

---

## Ops commands

```bash
# Upsert seed dump â†’ WorldMap + GameMap mirror
npx tsx scripts/migrate-campaign-maps-to-db.ts

# Smoke counts + AZURE_TOWN shape
npx tsx scripts/verify-campaign-maps.ts

# Extra validation (if present)
npx tsx scripts/validate-maps.ts
```

Expected after a full campaign migrate: **235** `WorldMap` rows with `gameId=tuxemon`.  
`AZURE_TOWN` should be present (typically 50Ã—50 grid).

Regenerate the seed (then re-migrate):

```bash
# Regenerate scripts/data/campaign-maps.generated.ts from your Tuxemon source (one-time),
# then re-run the normal migration:
npx tsx scripts/migrate-campaign-maps-to-db.ts
```

---

## Runtime loaders

| Path | Role |
| :--- | :--- |
| `GET /api/maps?gameId=tuxemon` | Index (`listMaps()`) |
| `GET /api/maps/[slug]` | Full payload (`loadMap()`) â€” WorldMap then GameMap |
| `POST /api/maps/[slug]` | Upsert (Developer+); mirrors GameMap |
| `src/engine/map-loader.js` | Server collision; prefers WorldMap |
| `src/web/components/the-lobby/data/maps.ts` | Client cache + `loadMap` / `listMaps` |
| Stub `.../data/campaign-maps.ts` | Empty exports only â€” do not re-fill |

---

## Rules

1. Do **not** re-import the 12MB seed into Next bundles.
2. High-frequency game ticks stay off the website realtime bus (AOI handles map-local fanout).
3. After deploying to a fresh DB, run migrate before expecting lobby campaign maps to load.
