# Saints Studio — Backend Architecture (28)

**Status:** Production backend contract (audit-backed)  
**Date:** 2026-08-04  
**Scope:** Database structure, Prisma models, MariaDB relationships, asset storage, caching, services, validation, transactions, permissions, API endpoints, WebSockets, live synchronization, file organization, serialization, migration strategy, testing strategy — **unified into one maintainable architecture**. Refactor existing concepts where necessary to reduce complexity.

> **Companions (do not fork)**
> - [`10-web-architecture-persistence.md`](./10-web-architecture-persistence.md) — Next ↔ engine boundary, hot/cold
> - [`13-database-event-architecture.md`](./13-database-event-architecture.md) — event dictionary (aspirational; **this doc owns schema truth**)
> - [`18`](./18-studio-master-architecture.md)–[`27`](./27-studio-production-tools.md) — Studio product contracts
> - [`26-studio-live-operations.md`](./26-studio-live-operations.md) — publish / reload / migrate policy
> - [`29`](./29-studio-glossary-canonical.md)–[`31`](./31-studio-integration-contracts.md) — ids, services mutate template, audit coverage
> - Ops inventory: `info/backend/OVERVIEW.md`, `info/backend/API_CATALOG.md`, `info/database/WORLDMAP.md`, `info/uploads/STORAGE.md`

**This document is the Studio backend master.** Evolve `prisma/schema.prisma`, `app/api/**`, `app/actions/**`, `src/server/**`, `src/shared/game/**`, `map-loader`, `studioPermissions` — **do not invent a second Studio backend** beside the Next + Socket.io process.

---

# 0. Non-Negotiable Rules

1. **One process, two planes** — `server.ts` hosts Next (HTTP/actions) + Socket.io + GameEngine. Studio writes go through HTTP/actions; live sync goes through the engine event bus.
2. **One map SoT: `WorldMap`** — `GameMap` is a temporary write-through mirror; `SaintsMap` is dead (do not revive).
3. **One definition SoT per domain** — QuestTemplate, ItemTemplate, LootTable, CreatureDef, NpcDialogueTree, GameAsset, GameConfig. Demote parallel tables.
4. **Client never touches Prisma** — browser → `/api/*` or server actions → Prisma; game client → sockets for runtime only.
5. **Never `io.emit` from App Router routes** — emit via engine helpers (`emitContentReload`) / RealtimeService for site bus.
6. **Permissions are server-enforced** — `studioPermissions` + session level on every mutate.
7. **Mutations are transactional + audited + reload-emitting** — `$transaction` → `StudioAuditLog` (27) → `emitContentReload`.
8. **SQLite locally, MariaDB in prod** — same Prisma schema; provider swap only; no dual schema trees.
9. **Prod uses `prisma migrate deploy`** — `db push --accept-data-loss` is local/container convenience only (`26`).
10. **Prefer fewer surfaces** — consolidate dual REST+action writers into one service module per registry.

---

# 1. Audit → Target (complexity reduction)

| Area | Today (complex) | Target (simple) |
| :--- | :--- | :--- |
| Maps | WorldMap + GameMap + unused SaintsMap | **WorldMap only**; GameMap mirror until readers migrate; delete SaintsMap |
| Quests | QuestTemplate + GameQuest | **QuestTemplate only**; GameQuest read-compat then drop |
| Items | ItemTemplate + GameItem + ITEM_DB | **ItemTemplate** SoT; GameItem import adapter |
| Creatures | CreatureDef + CreatureTemplate tree | **CreatureDef** authoring; CreatureTemplate = Tuxemon import SoT |
| Save path | REST WorldMap **and** socket `admin_save_map` → GameMap | **REST/action only**; deprecate socket save |
| Reload | `admin_reload_map` / `map_reloaded` only | Typed **`content_reload`** bus (`18`/`26`); alias map_reloaded |
| Writes | Scattered `app/actions/*` + `app/api/*` | Thin routes → **`src/server/studio/*` services** |
| Cache | map-loader + dialogueCache + ad-hoc | **ContentCache** facade + same invalidation keys as reload |
| History | `WorldMap.version` only | **`ContentRevision`** + expectedVersion |
| Migrations | `db push` everywhere | Env-policy: push local / migrate staging+prod |
| JSON | String columns everywhere | Keep strings on SQLite; optional native Json on MariaDB later — **one serializer layer** |
| Permissions | Admin 400 / Dev 1000 split across files | Single matrix in `studioPermissions` (+ Creator later) |

---

# 2. Unified Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Clients                                  │
│  /studio React docks     /lobby game client     Admin deep-links │
└────────────┬─────────────────────┬──────────────────────────────┘
             │ HTTP / Server Actions│ Socket.io (runtime + reload)
             ▼                      ▼
┌────────────────────────┐  ┌─────────────────────────────────────┐
│  App Router            │  │  SocketHandler                       │
│  app/api/**            │  │  admin_reload_map (legacy alias)     │
│  app/actions/**        │  │  content_reload listen               │
│  (thin: auth + parse)  │  │  NO map save via socket              │
└────────────┬───────────┘  └──────────────────┬──────────────────┘
             │                                  │
             ▼                                  ▼
┌────────────────────────┐  ┌─────────────────────────────────────┐
│  Studio Services       │  │  GameEngine managers                 │
│  src/server/studio/    │──▶│  ContentReloadBus → invalidate       │
│  MapService            │  │  World/Quest/Dialogue/Loot/…         │
│  DefinitionServices*   │  │  map-loader ContentCache             │
│  AssetService          │  └──────────────────┬──────────────────┘
│  PublishService        │                     │
│  AuditService          │                     ▼
└────────────┬───────────┘            Hot RAM (players, shards)
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│  Prisma Client  →  SQLite (dev) / MariaDB (staging+prod)         │
│  WorldMap · registries · ContentRevision · StudioAuditLog · …    │
└────────────────────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│  Asset files: public/game-assets/** (+ optional CDN / S3 URL)    │
└────────────────────────────────────────────────────────────────┘
```

\*DefinitionServices = Item / Loot / Quest / Dialogue / Creature / Class / Encounter / Ability — one module pattern.

---

# 3. Database Structure

## 3.1 Domains (logical schemas — one Prisma file)

| Domain | Tables | Notes |
| :--- | :--- | :--- |
| **Auth / ACL** | User, Role, Account, Session, … | Site-wide; Studio gates on `permissionLevel` / Role.level |
| **World profile** | GameConfig, CharacterClass | `gameId` / profileId scoping |
| **Maps** | WorldMap, MapLogicTile, TileRegistry | GameMap mirror (temporary) |
| **Assets** | GameAsset | Files on disk; rows = metadata |
| **Economy defs** | ItemTemplate, LootTable, CraftingRecipe | Demote GameItem |
| **Quest / dialogue** | QuestTemplate, QuestObjective, NpcDialogueTree | Demote GameQuest |
| **Creatures** | CreatureDef, EncounterTable, MonsterSpritePool | CreatureTemplate = import |
| **Combat dicts** | AbilityDictionary, StatusEffectDictionary, elements | Shared runtime |
| **Player runtime** | GameCharacter, Player*, GtcListing | Not Studio SoT |
| **Studio production (27)** | StudioProject*, ContentPackage*, ContentRevision, StudioAuditLog, StudioTask*, LocaleString*, SearchDocument* | Add when PT/LO phases ship |
| **Site / FiveM / Social** | Forum, Social*, Character (FiveM)… | **Out of Studio write path** |

\*May start as soft tables or JSON until PT6; do not block LO1.

## 3.2 Scoping key

**`gameId` (string profile / world id)** scopes WorldMap, LootTable, CreatureDef, GameAsset, QuestTemplate, etc.

- Bridge to `StudioProject` (`27`): initially `StudioProject.id === gameId` (or GameConfig.slug).
- CharacterClass keeps both `gameId` (FK GameConfig) and `profileId` (world profile) — do not collapse without a migration plan.

## 3.3 JSON storage policy

| Env | Approach |
| :--- | :--- |
| SQLite | Keep `String` columns holding JSON (current) |
| MariaDB | Same Prisma fields initially (portable); later optional `@db.Json` **only** behind serializer |

**All reads/writes go through `src/shared/game/serialize.ts` helpers** (`parseJsonField` / `stringifyJsonField`) — never scatter `JSON.parse` without try/catch defaults.

## 3.4 Versioning columns

| Resource | Draft pointer | Live pointer | History |
| :--- | :--- | :--- | :--- |
| WorldMap | row itself + `version` | same until publish workflow | ContentRevision snapshots |
| Definitions | row `version` (add Int default 1) | publish tags revision | ContentRevision |
| Packages | semver on ContentPackage | publishedAt | package versions |

---

# 4. Prisma Models (Studio-relevant contract)

## 4.1 Keep as authored (evolve fields, don’t replace)

```prisma
// Canonical — already in schema.prisma (evolve in place)
model WorldMap {
  id             String   @id
  gameId         String?  @default("tuxemon")
  name           String
  gridData       String
  gatesData      String
  npcsData       String
  encountersData String   @default("[]")
  tileLayersData String   @default("[]")
  tilesetsData   String   @default("[]")
  version        Int      @default(1)
  // ADD when LO3:
  // status       String   @default("draft") // draft | live
  // liveVersion  Int?
  // expectedVersion handled via request header, not a column
  updatedAt      DateTime @updatedAt
  @@index([gameId])
}

model GameAsset { /* existing — KEEP */ }
model GameConfig { /* existing — KEEP; = world profile host */ }
model CharacterClass { /* existing — KEEP */ }
model LootTable { /* existing — KEEP */ }
model ItemTemplate { /* existing — KEEP; extend vendorValue, iconAssetId per 23 */ }
model CraftingRecipe { /* existing — KEEP */ }
model QuestTemplate { /* existing + QuestObjective — KEEP */ }
model NpcDialogueTree { /* existing — KEEP */ }
model CreatureDef { /* existing — KEEP authoring */ }
model StarterHero { /* existing — KEEP */ }
model EncounterTable { /* existing — KEEP */ }
model MapLogicTile { /* existing — KEEP */ }
model TileRegistry { /* existing — KEEP metadata */ }
model MonsterSpritePool { /* existing — KEEP until merged into CreatureDef/GameAsset */ }
```

## 4.2 Add (live-ops + production — phased)

```prisma
model ContentRevision {
  id          String   @id @default(cuid())
  resourceType String  // "map" | "loot" | "quest" | …
  resourceId  String
  gameId      String?
  version     Int
  status      String   // "draft" | "live" | "archived"
  snapshot    String   // JSON full payload
  authorId    String?
  createdAt   DateTime @default(now())
  @@index([resourceType, resourceId])
  @@index([gameId, createdAt])
}

model StudioAuditLog {
  id         String   @id @default(cuid())
  at         DateTime @default(now())
  userId     String
  gameId     String?
  action     String
  resourceType String
  resourceId String
  before     String?  // JSON
  after      String?  // JSON
  meta       String?  // JSON
  ip         String?
  @@index([gameId, at])
  @@index([userId, at])
  @@index([resourceType, resourceId])
}
```

StudioTask / StudioBookmark / LocaleString / ContentPackage / SearchDocument — per `27`; add in PT phases, same file.

## 4.3 Demote / remove (complexity killers)

| Model | Action | Timeline |
| :--- | :--- | :--- |
| **SaintsMap** | Remove from schema after confirming zero readers | BE1 |
| **GameMap** | Stop new features; mirror from WorldMap writes; delete when map-loader reads WorldMap only | BE2–BE4 |
| **GameQuest** | Read-only adapter → QuestTemplate; delete admin create | BE3 |
| **GameItem** | Import → ItemTemplate; stop dual writes | ECO1 / BE3 |
| Dual socket map save | Delete `admin_save_map` or make it call MapService (WorldMap) | BE1 |

## 4.4 MariaDB relationships

Prisma relations that matter for Studio:

```
User ──< StudioAuditLog (userId)
GameConfig ──< CharacterClass (gameId)
QuestTemplate ──< QuestObjective (cascade)
CreatureTemplate ──< CreatureBaseStats / LearnedAbility / Evolution  (import only)
GameCharacter ── User
```

**Logical (not always FK’d — by design for JSON + gameId scoping):**

```
GameConfig.slug / profile  ≈  WorldMap.gameId ≈ LootTable.gameId ≈ QuestTemplate.gameId
ItemTemplate.slug  ←referenced by→  LootTable.entries JSON, CraftingRecipe, shops
GameAsset.id  ←referenced by→  CreatureDef sprites, map tilesets paths, UI icons
LootTable.id  ←referenced by→  entity Loot component / creature death pool
NpcDialogueTree.npcId  ←→  WorldMap.npcsData[].id
```

**Rule:** Prefer **string refs + dependency graph service** (`20`/`27`) over exploding FK graphs through JSON blobs. Add real FKs only for 1:N owned children (objectives, class→config).

When on MariaDB:

* Use InnoDB, utf8mb4
* Indexes already declared in Prisma must ship in migrations
* Connection pool via `DATABASE_URL` params; one PrismaClient singleton (`src/web/lib/prisma.ts`)

---

# 5. Asset Storage

| Layer | Location | Responsibility |
| :--- | :--- | :--- |
| Binary art | `public/game-assets/**` | Source of truth for paths in GameAsset.source |
| Upload scratch | `public/uploads` / `UPLOAD_DIR` | Site media — **not** Studio game art default |
| Optional CDN | `GameAsset.cdnUrl` | Override URL when S3/CDN enabled |
| Metadata | `GameAsset` row | type, tags, categories, atlas, labels, usageCount |

**AssetService duties:**

1. List/filter (existing `/api/assets`)  
2. PATCH metadata (tags)  
3. Register new file (path under `public/game-assets` + row) — extend seed scripts, don’t invent MediaAsset for game sprites  
4. Validate referenced paths exist at publish (`26`)  
5. Emit `content_reload { type: "asset", id }` on metadata change if runtime cares  

**Do not** store sprite binaries in MariaDB BLOBs.

---

# 6. Caching

## 6.1 ContentCache facade

Single module `src/server/studio/ContentCache.ts` wrapping:

| Key pattern | Backing | Invalidate on |
| :--- | :--- | :--- |
| `map:{mapId}` | map-loader mapCache | map save / reload |
| `logicTiles` | map-loader logicTilesCache | logic-tile write |
| `dialogue:{npcId}` | dialogueCache | dialogue upsert |
| `loot:{gameId}` | in-memory Map | loot mutate |
| `quest:{id}` | in-memory Map | quest mutate |
| `item:{slug}` | in-memory Map | item mutate |
| `creature:{slug}` | in-memory Map | creature mutate |

**API:**

```ts
ContentCache.getMap(id)
ContentCache.invalidate(event: ContentReloadEvent) // same shape as bus
```

Redis: **optional** later for multi-instance definition cache. Today Redis = Socket.io adapter only — do not require Redis for Studio correctness on single node.

## 6.2 Client caches

* `invalidateMapCache` / AssetManager — listen to `content_reload` / `map_reloaded`
* Never cache Studio auth decisions client-side as security

---

# 7. Services (unified layer)

## 7.1 Folder layout (new, thin)

```
src/server/studio/
  index.ts              // re-exports
  ContentReloadBus.ts   // emitContentReload
  ContentCache.ts
  AuditService.ts
  MapService.ts         // load/save/publish WorldMap
  AssetService.ts
  LootService.ts
  QuestService.ts
  DialogueService.ts
  CreatureService.ts
  ItemService.ts
  ClassService.ts
  ProfileService.ts     // GameConfig / world profiles
  PublishService.ts     // validate + revision + live
  DependencyService.ts  // used-by graph
  permissions.ts        // re-export shared studioPermissions helpers for server
```

**Rule:** `app/api/**/route.ts` and `app/actions/*.ts` become **adapters** (session → service). Business logic leaves the route files.

## 7.2 Service method template

Every mutate:

```ts
async function updateX(user, input) {
  assertStudioWrite(user);
  return prisma.$transaction(async (tx) => {
    const before = await tx…find…
    if (input.expectedVersion != null && before.version !== input.expectedVersion)
      throw ConflictError;
    const after = await tx…update… { version: { increment: 1 } };
    await AuditService.write(tx, { … before, after });
    await ContentRevisionService.maybeSnapshot(tx, after);
    return after;
  }).then((after) => {
    emitContentReload({ type: "x", id: after.id, version: after.version, gameId });
    ContentCache.invalidate(…);
    return after;
  });
}
```

## 7.3 Runtime managers stay separate

`WorldManager`, `QuestManager`, `InventoryManager`, … **consume** definitions via ContentCache; they do **not** own Studio CRUD. Studio services must not tick the sim.

---

# 8. Validation

| Layer | Module | When |
| :--- | :--- | :--- |
| Request parse | zod (or existing manual guards) at route edge | Every HTTP/action |
| Domain validate | `validateMapSave`, lootRefs, entitySchemas | Before write |
| Publish validate | PublishService + asset path + dep graph | Before live |
| Permission | `canWriteStudioContent` / dock matrix | Before write |
| Conflict | expectedVersion / If-Match | Before update |

**Extend, don’t fork:** `src/shared/game/mapSaveValidation.ts`, `lootRefs.ts`, `entitySchemas.ts`.

Publish-time checks (`26`): missing GameAsset paths, hard dependency breaks, unknown logic tile ids, empty ground GIDs on “ready” maps.

---

# 9. Transactions

| Operation | Transaction boundary |
| :--- | :--- |
| Map save | WorldMap upsert **+** optional GameMap mirror **+** audit **+** revision in **one** `$transaction` |
| Quest upsert | Template + delete/recreate objectives + audit |
| Dialogue + ACCEPT_QUEST link | Dialogue tree + quest objective touch |
| Publish | Snapshot revision + set live pointers + audit |
| Loot/item single-row | Single update + audit (still use `$transaction` for audit atomicity) |

**Failure policy:** throw → no reload emit. Partial GameMap-only writes are a **bug** (current `admin_save_map`).

**Isolation:** default Prisma/MySQL READ COMMITTED is fine; map save uses version check for optimistic concurrency.

---

# 10. Permissions

| Concern | Module | Levels (today) |
| :--- | :--- | :--- |
| Site numeric | `src/web/lib/permissions.ts` | ADMIN 400 … DEVELOPER 1000 |
| Studio matrix | `src/shared/game/studioPermissions.ts` | Entry/write ≥400; engine config ≥1000 |
| Project roles (27) | future StudioMembership | viewer/creator/developer/admin/owner |

**Backend rules:**

1. Socket Studio writes use same `canWriteStudioContent` as HTTP.  
2. Dock visibility is UX only — APIs still check.  
3. Creator tier (sandbox, no publish) lands with PT6 — add `canPublishStudioContent` separate from write.  
4. Audit userId from session — never trust body.userId.

---

# 11. API Endpoints

## 11.1 Canonical Studio HTTP surface

Prefer **one REST style per registry** (actions may wrap the same service).

| Resource | Endpoints | Service |
| :--- | :--- | :--- |
| Maps | `GET/POST /api/maps`, `GET/POST /api/maps/[slug]` | MapService |
| Logic tiles | `GET/POST /api/world/logic-tiles` | MapService / LogicService |
| Assets | `GET /api/assets`, `GET/PATCH /api/assets/[id]` | AssetService |
| Loot | `/api/loot/tables`, `/api/loot/tables/[id]` | LootService |
| Quests | `/api/quests/templates` (+ action parity) | QuestService |
| Dialogue | `/api/npc-dialogue` + actions | DialogueService |
| Creatures | actions `creature-defs` → add `/api/studio/creatures` later | CreatureService |
| Items | **add** `/api/studio/items` | ItemService |
| Classes / heroes / profiles | existing actions → ProfileService / ClassService | |
| Publish | **add** `POST /api/studio/publish` | PublishService |
| Revisions | **add** `GET /api/studio/revisions` | PublishService |
| Audit | **add** `GET /api/studio/audit` | AuditService |
| Search index | **add** `GET /api/studio/search` (PT1) | SearchService |

## 11.2 Route adapter pattern

```ts
// app/api/maps/[slug]/route.ts
export async function POST(req, ctx) {
  const user = await requireSession();
  assertStudioWrite(user);
  const body = await req.json();
  const result = await MapService.save(user, ctx.params.slug, body);
  return NextResponse.json(result);
}
```

## 11.3 Deprecate

| Surface | Fate |
| :--- | :--- |
| `admin_save_map` socket | Remove or delegate to MapService |
| `game-dev` GameQuest CRUD | Redirect to QuestService |
| Direct Prisma in fat actions | Move to services |

## 11.4 Public vs auth

* GET maps/assets/logic-tiles: public or auth-optional (current)  
* All Studio mutations: session + write gate  
* Publish / audit / rollback: write + publish gate  

---

# 12. WebSockets

## 12.1 Studio-relevant events

| Event | Direction | Status | Target |
| :--- | :--- | :--- | :--- |
| `admin_reload_map` | C→S | Live | Keep as alias → `emitContentReload({type:'map'})` |
| `map_reloaded` | S→C | Live | Alias payload `{ mapId, version }` |
| `content_reload` | S→C | **Missing → BE/LO1** | Canonical |
| `admin_save_map` | C→S | Legacy hazard | **Remove** |
| `tile_changed` | S→C | Runtime gather | Not Studio authoring |

## 12.2 content_reload payload

```ts
type ContentReloadEvent = {
  type: "map" | "loot" | "quest" | "dialogue" | "item" | "creature"
      | "asset" | "class" | "encounter" | "logic_tile" | "package";
  id?: string;
  mapId?: string;
  gameId?: string;
  version?: number;
  at: string;
};
```

Rooms: map shard rooms for `type:"map"`; studio/global or per-`gameId` room for definitions.

## 12.3 Auth on sockets

Existing session bind on connect; Studio emits only from server after successful service mutate — clients may **request** reload (`admin_reload_map`) but cannot forge definition writes over the socket.

---

# 13. Live Synchronization

```
Studio dock save
  → MapService/LootService/…
  → DB commit
  → emitContentReload(event)
  → ContentCache.invalidate(event)
  → SocketHandler broadcast
  → Clients: refetch definition or map; Babylon remesh if map
  → Managers: drop stale caches; next tick uses new defs
```

**Guarantees:**

* After successful save, all nodes in the same process see new data (single-node).  
* Multi-instance: Socket.io Redis adapter fans out `content_reload`; each node invalidates local ContentCache.  
* Players on map get `map_reloaded` without reconnect.  
* Definition edits do **not** require `update.sh` / PM2 restart (`26`).

**Non-goals:** CRDT collaborative cursors (later); conflicting simultaneous editors → expectedVersion 409.

---

# 14. File Organization

```
/workspace
├── server.ts                         # process bootstrap only
├── prisma/
│   ├── schema.prisma                 # ONE schema
│   ├── migrations/                   # committed (staging+prod)
│   └── db/                           # sqlite file (dev)
├── app/
│   ├── api/**/route.ts               # thin HTTP adapters
│   └── actions/**                    # thin server-action adapters
├── src/
│   ├── server/
│   │   ├── GameEngine.ts
│   │   ├── SocketHandler.ts
│   │   ├── *Manager.ts               # runtime sim
│   │   └── studio/                   # ★ Studio backend services
│   ├── engine/
│   │   ├── map-loader.js             # → reads WorldMap; uses ContentCache
│   │   └── assets/AssetManager.ts    # client
│   ├── shared/game/                  # contracts, validation, permissions, schemas
│   ├── web/lib/prisma.ts             # Prisma singleton
│   └── game/                         # legacy helpers / CreatureDb import
├── public/game-assets/
├── scripts/                          # seed, migrate-*.ts data backfills
└── info/gameplay-bible/28-…md        # this contract
```

**Complexity rule:** New Studio feature = shared contract + studio service + thin route + dock. No new top-level framework folders.

---

# 15. Serialization

| Concern | Contract |
| :--- | :--- |
| DB JSON fields | `parseJsonField<T>(raw, fallback)` / `stringifyJsonField` |
| Map wire format | Existing WorldMap API JSON (layers, tilesets, npcs, gates) |
| Entity instances | `entitySchemas` + adapters for npcsData/gatesData (`20`) |
| Prefab / package export | `.sgpkg` = manifest JSON + asset paths (`27`) |
| Revisions | Full snapshot JSON in ContentRevision.snapshot |
| Dates | ISO strings on wire; DateTime in Prisma |
| Versions | Integer monotonic per resource |

**Map loader:** Deserialize WorldMap strings once into typed `MapData`; never double-parse per tick.

**Do not** introduce protobuf/msgpack for Studio defs until proven need — JSON is the Studio lingua franca.

---

# 16. Migration Strategy

| Environment | Schema change | Data backfill |
| :--- | :--- | :--- |
| Local / Cloud agent VM | `prisma db push` OK | `scripts/migrate-*.ts` optional |
| Staging | Commit migration → `prisma migrate deploy` | Idempotent scripts |
| Production | `migrate deploy` only | Backup first (`26`); no `--accept-data-loss` |

**Expand-contract for demotions:**

1. **Expand:** Write WorldMap + GameMap; read WorldMap preferentially  
2. **Contract:** Stop writing GameMap; delete SaintsMap / GameQuest  
3. Never rename `gameId` meaning without a dual-read window  

**Content shape versions:** entity/quest document `v` fields (`20`/`24`) migrate in PublishService / loaders — separate from Prisma migrations.

**Docker `entrypoint.sh`:** replace prod path `db push --accept-data-loss` with `migrate deploy` (LO6).

---

# 17. Testing Strategy

| Layer | What | Command / location |
| :--- | :--- | :--- |
| Unit | studioPermissions, validateMapSave, lootRefs, entitySchemas, serialize | `npm test` (Vitest) |
| Service | MapService save transaction, version conflict, reload emit (mocked bus) | `src/server/studio/**/*.test.ts` |
| API | Auth gate 401/403; happy save; 409 conflict | Vitest + request fixtures |
| Socket | content_reload payload shape; admin_reload alias | Unit with mocked io |
| Integration | Save map → DB version++ → cache miss → GET returns new | Test DB sqlite file |
| Smoke | Running server: maps/assets health (`npm run smoke`) | Needs `npm run dev` |
| E2E live-ops | Save → content_reload → client version (`26`) | Staging |
| Migration | `migrate deploy` on empty MariaDB in CI (when migrations exist) | CI job |

**Minimum bar before merging Studio backend PRs:** unit tests for new service + permission denial case + no new Prisma access from client components.

---

# 18. Complexity Reduction Plan (ordered)

| Step | Change | Risk |
| :--- | :--- | :--- |
| **BE1** | `ContentReloadBus` + deprecate `admin_save_map`; Map POST emits bus with version | Low |
| **BE2** | Introduce `src/server/studio/*`; move Map/Loot/Quest logic out of fat routes | Med |
| **BE3** | ContentCache facade; dialogue/loot/quest invalidate | Low |
| **BE4** | `$transaction` on map save (WorldMap+GameMap+audit); expectedVersion | Med |
| **BE5** | ContentRevision + PublishService hooks | Med |
| **BE6** | Drop SaintsMap; stop GameQuest writes; ItemTemplate-only API | Med |
| **BE7** | Committed Prisma migrations + entrypoint migrate deploy | Med (ops) |
| **BE8** | GameMap read removal when map-loader is WorldMap-only | Med |

Aligns with **LO1–LO6** and **PT1–PT6** — backend phases are the substrate those product phases sit on.

---

# 19. Integration with Product Bibles

| Product doc | Backend hook |
| :--- | :--- |
| 18 registries | DefinitionServices + ContentReloadBus |
| 19 chrome | APIs behind docks; Ctrl+K → `/api/studio/search` |
| 20 entities | serialize + adapters on WorldMap JSON |
| 21 world tools | MapService + validateMapSave |
| 22 NPC/AI | DialogueService, CreatureService, npcsData |
| 23 economy | Item/Loot/Craft services |
| 24 quests | QuestService |
| 25 gameplay | Class/Ability services + dict tables |
| 26 live ops | PublishService, revisions, migrate policy |
| 27 production | Audit, packages, tasks tables + APIs |

---

# 20. Anti-Patterns

1. Third map table or “StudioMap” fork  
2. Prisma in `'use client'` components  
3. `io.emit` inside `app/api` route handlers  
4. Socket-only map save bypassing WorldMap  
5. New permission constants outside `studioPermissions`  
6. Per-feature cache without ContentCache.invalidate  
7. `db push --accept-data-loss` as production SoT  
8. Dual writers (action + route) with divergent validation  
9. Storing game sprites only in S3 without GameAsset rows  
10. Treating bible `13` idealized `Map` model as schema truth over `schema.prisma`  
11. Microservicing Studio CRUD before single-process ContentReloadBus works  
12. Rewriting Babylon/map-loader “while we’re here” beyond WorldMap read path  

---

# Final Rule

**Saints Studio’s backend is one Prisma schema, one service layer, one reload bus, and one permission matrix — hosted beside the game sim in a single Node process.**  
If a change needs a second database, a second socket protocol, or a second map table, it is the wrong change: extend the unified architecture instead.
