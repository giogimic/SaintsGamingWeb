# Saints Studio — Live Operations System (26)

**Status:** Production live-ops contract (audit-backed)  
**Date:** 2026-08-04  
**Scope:** Hot reloading, map publishing, versioning, rollback, testing, preview mode, staging, production deployment, patch management, migrations, asset validation, dependency checking, conflict resolution, backups, recovery, performance profiling — with **safe live updates without process restarts whenever possible**.

> **Companions (do not fork)**
> - [`18-studio-master-architecture.md`](./18-studio-master-architecture.md) — `content_reload` bus seed
> - [`19`](./19-studio-ux-design.md) · [`21`](./21-studio-world-building-tools.md) · [`23`](./23-studio-economy-system.md) · [`24`](./24-studio-quest-editor.md) · [`25`](./25-studio-gameplay-editors.md)
> - [`27-studio-production-tools.md`](./27-studio-production-tools.md) — packages, audit, deps UI, team gates around publish
> - [`10-web-architecture-persistence.md`](./10-web-architecture-persistence.md) — Next/hot-cold boundary
> - Deploy: `scripts/update.sh`, `scripts/setup.sh`, `entrypoint.sh`, `docs/developer-guide/installation.md`, `info/ops/STAGING_SMOKE.md`

**This document is the live-ops master.** Evolve `admin_reload_map` / `map_reloaded`, `WorldMap.version`, `validateMapSave`, `update.sh`, smoke scripts — do not invent a second ops stack outside Studio/Dev Tools.

---

# 0. Non-Negotiable Rules

1. **Prefer hot content reload over process restart.** Code/binary changes may need deploy; **data** (maps, loot, quests, items, dialogue, creatures, abilities) must hot-reload.
2. **One typed bus:** implement bible `content_reload` (`18` §7) — every save path calls `emitContentReload(event)`.
3. **Publish ≠ save.** Draft saves are Studio; **publish** promotes to live with validation + version snapshot.
4. **Never last-write-wins without detection** — optimistic concurrency on map/content versions.
5. **Backups before destructive ops** — deploy, force demo, schema push, rollback.
6. **Staging mirrors production topology** at smaller scale; smoke must pass before promote.
7. **Restarts are explicit** — required for native deps, `server.ts` logic, Prisma client regen after schema — never for a loot pool edit.
8. **Ops UI in Dev Tools** (Admin+) — no secret SSH-only rituals for routine content ops.

---

# 1. Audit → Target

| Today | Target |
| :--- | :--- |
| Map-only `admin_reload_map` → `map_reloaded {mapId}` | Full `content_reload` bus + version in payload |
| `WorldMap.version++` no history | Version snapshots + rollback |
| No draft/live status | `contentStatus: draft\|staging\|live` |
| `update.sh` hard-reset `origin/main` + restart | Keep for **code**; content patches without it |
| MariaDB dump only; no restore | Backup + restore playbooks; SQLite too |
| `validateMapSave` logic-only | Asset/GID/deps on publish |
| No conflict detection | If-Match / expectedVersion |
| ServerControl in-memory fake | Real health + reload actions |
| Smoke HTTP only | + content-reload E2E + publish checklist |
| `prisma db push` / no migrations | Safe migration policy per env |

---

# 2. Live Ops Architecture

```
┌──────────────── Studio / Admin ────────────────┐
│ Save draft → Validate → Preview → Publish       │
│ Dev Tools: Reload · Rollback · Backup · Profile │
└───────────────┬────────────────────────────────┘
                │ emitContentReload / publish API
┌───────────────▼────────────────────────────────┐
│  Ops Core (server process — no restart)         │
│  ContentReloadBus · VersionStore · PublishGate  │
│  CacheInvalidators · ConflictGuard · Health     │
└───────────────┬────────────────────────────────┘
                │ socket to players / studio clients
┌───────────────▼────────────────────────────────┐
│  Runtime managers apply new defs without reboot │
└────────────────────────────────────────────────┘

┌──────────────── Deploy plane (code) ───────────┐
│ staging → smoke → backup → update.sh → verify   │
│ Used when server.ts / deps / schema require it  │
└────────────────────────────────────────────────┘
```

---

# 3. Hot Reloading

## 3.1 ContentReloadEvent (implement)

```ts
type ContentReloadEvent =
  | { type: "map"; mapId: string; version: number }
  | { type: "map_entities"; mapId: string; version: number }
  | { type: "loot"; poolId?: string; version?: number }
  | { type: "item"; itemId?: string }
  | { type: "quest"; questId?: string }
  | { type: "dialogue"; treeId?: string }
  | { type: "creature"; creatureId?: string }
  | { type: "ability"; abilityId?: string }
  | { type: "status"; statusId?: string }
  | { type: "skill"; skillId?: string }
  | { type: "class"; classId?: string }
  | { type: "shop"; shopId?: string }
  | { type: "recipe"; recipeId?: string }
  | { type: "logic_tile"; tileId?: number }
  | { type: "economy_modifier"; modifierId?: string }
  | { type: "world_event"; eventId?: string }
  | { type: "cutscene"; cutsceneId?: string }
  | { type: "flush_all_caches" }; // rare Admin
```

```ts
// shared + server
function emitContentReload(event: ContentReloadEvent): void
```

**Socket:** emit `content_reload` to interested rooms (map room for map events; global for defs). Keep `map_reloaded` as **alias** for `{ type:"map" }` during migration.

## 3.2 Invalidation matrix (no restart)

| Event | Server | Client |
| :--- | :--- | :--- |
| map | `mapLoader.invalidateMap`; refresh instance grids carefully | `invalidateMapCache`; refetch; rebuild meshes if needed |
| map_entities | Respawn/despawn NPC bindings (`20`) | Upsert mapEntities |
| loot/item/recipe/shop | Clear manager caches | Refetch if UI open |
| quest/dialogue | QuestManager/DialogueManager cache bust | Invalidate dialogue fetch |
| creature/ability/class | Catalog caches | Hotbar/creature UI refresh |
| flush_all | All of above | Full soft refresh toast |

**Players stay connected.** Prefer morph over disconnect. If mesh rebuild is heavy, queue chunked rebuild.

## 3.3 What still requires restart

| Change | Why |
| :--- | :--- |
| `server.ts` / Socket handler topology | Process code |
| New Prisma models without push | Schema |
| Native module / Node version | Binary |
| `FORCE_DEMO_MAP` full rewrite at boot | Boot hook (can later become Admin op) |
| Env secret rotation for some providers | Process env |

Document in Dev Tools “Requires restart” badge.

## 3.4 Ops UI — Hot Reload

Dev Tools → **Live Reload** tab:

* Reload current map  
* Reload entities only  
* Flush caches  
* Last N reload events log  

---

# 4. Map Publishing

## 4.1 Content lifecycle

```ts
type ContentStatus = "draft" | "review" | "staging" | "live" | "archived";

// WorldMap (+ optional ContentRevision for other registries)
status: ContentStatus;
liveVersion?: number;      // last published
draftVersion: number;      // increments on every save
```

| Action | Effect |
| :--- | :--- |
| **Save** | Writes draft; `draftVersion++`; Studio reload only (or preview shard) |
| **Validate** | Runs full publish validators — no promote |
| **Publish** | Snapshot → set `live` + `liveVersion` → `content_reload` to production rooms |
| **Unpublish** | Archive or revert pointer to previous liveVersion |

Players load **live** pointer. Studio opens **draft** by default (Admin can “Edit live” with warn).

## 4.2 Publish checklist (wizard — rare modal OK per `19`)

1. Asset validation pass  
2. Dependency check pass  
3. Conflict check (expectedVersion)  
4. Smoke subset (optional auto)  
5. Confirm audience: map shard / all  
6. Publish + broadcast  

Permissions: Admin+ publish; Developer may save draft (`16`/`studioPermissions` — extend matrix).

---

# 5. Versioning

## 5.1 Revision store

```ts
type ContentRevision = {
  id: string;
  resourceType: "map" | "loot" | "quest" | "item" | "dialogue" | "creature" | "ability" | …;
  resourceId: string;       // map slug / pool id
  version: number;
  status: ContentStatus;
  payload: unknown;         // full JSON snapshot (or blob ref)
  checksum: string;         // sha256
  authorId: string;
  message?: string;
  createdAt: string;
  parentVersion?: number;
};
```

Prisma table `ContentRevision` (or per-type history). Map save creates revision; publish tags revision as live.

## 5.2 Payload enrichment

```ts
map_reloaded / content_reload map → { mapId, version, status }
```

Clients ignore stale versions (if local ≥ event.version, skip).

---

# 6. Rollback

| Scope | Method |
| :--- | :--- |
| Map/content | Select ContentRevision → restore draft or publish as new liveVersion+1 (never mutate history) |
| DB (deploy) | Restore from `backups/db_backup_*.sql` (MariaDB) or SQLite file copy |
| Code | `git` previous release tag + `update.sh` variant `./scripts/update.sh --ref vX.Y.Z` (design) |
| Failed publish | Auto-keep previous `liveVersion` pointer if publish transaction fails |

**Rollback UI:** Dev Tools → Revisions → preview diff → Restore to draft / Publish rollback.

Never delete revision rows (GC archived after N days).

---

# 7. Testing

| Layer | Tool | Gate |
| :--- | :--- | :--- |
| Unit | `npm test` (Vitest) | PR / pre-publish optional |
| Map validate | `validateMapSave` + extended publish validators | Save / Publish |
| Offline assets | evolve `scripts/validate-maps.ts` into `npm run validate:content` | Publish |
| HTTP smoke | `npm run smoke` / `smoke-staging.sh` | Staging promote |
| Trail/Spyder | existing smoke scripts | Content patches |
| Reload E2E | New: save map → assert `content_reload` → client version | Staging |
| Studio Test Bench | Quest/Ability sims (`24`/`25`) | Author |

**CI design:** lint + vitest + validate:content; deploy job runs smoke against staging URL.

---

# 8. Preview Mode

| Mode | Behaviour |
| :--- | :--- |
| **Studio Walk on draft** | Creator sees draft map; `isEditorMode`; not broadcast to prod players |
| **Preview shard** | Optional instance `mapId_preview_userId` loads draft JSON |
| **Spectator preview** | Admin opens live map read-only |

Preview never writes live pointer. Publish copies draft → live.

---

# 9. Staging

| Property | Spec |
| :--- | :--- |
| Purpose | Code + content rehearsal |
| Data | Copy of prod DB (sanitized) or dedicated staging DB |
| Deploy | Same `update.sh` against staging host / compose project name |
| Gate | `STAGING_SMOKE.md` + `npm run smoke` green |
| Content | Publish to staging status first (`status: staging`) then promote to live |

No separate codebase — env flags `APP_ENV=staging|production`.

---

# 10. Production Deployment

## 10.1 Code deploy (existing `update.sh` — keep, harden)

Current flow: backup (MariaDB) → `git reset --hard origin/main` → docker build / npm build → restart PM2/docker.

**Hardening design:**

| Change | Why |
| :--- | :--- |
| Support `--ref <tag\|sha>` | Rollback code |
| Run `prisma migrate deploy` **or** documented `db push` consistently | Fix Docker vs non-Docker drift |
| Healthcheck wait before traffic | Avoid half-dead |
| Post-deploy smoke | Abort alert if fail |
| Do **not** use update.sh for loot/quest edits | Content bus instead |

## 10.2 Zero-downtime goals

| Layer | Approach |
| :--- | :--- |
| Content | Hot reload — **no downtime** |
| Web container | Compose recreate with healthcheck; brief blip acceptable v1 |
| Game socket | Prefer reload; if restart, reconnect + `position_correction` |
| DB migrate | Expand-contract migrations; avoid `--accept-data-loss` in prod |

`entrypoint.sh` `db push --accept-data-loss` is **dev/container convenience** — **forbidden as prod SoT**; replace with migrate deploy + reviewed migrations.

---

# 11. Patch Management

```ts
type ContentPatch = {
  id: string;
  title: string;
  createdAt: string;
  authorId: string;
  changes: ContentReloadEvent[];  // logical ops
  revisionIds: string[];          // snapshots included
  status: "draft" | "applied_staging" | "applied_live" | "reverted";
};
```

**Patch workflow:**

1. Author multiple defs in Studio  
2. “Create patch” bundles revision ids  
3. Apply patch on staging → smoke  
4. Apply patch on live → sequential `emitContentReload`  
5. Revert patch → republish previous revisions  

Code patches = git releases; content patches = ContentPatch records.

---

# 12. Migration Tools

| Env | Policy |
| :--- | :--- |
| Local / Cursor VM | `prisma db push` OK |
| Staging / Prod | Committed migrations + `prisma migrate deploy` |
| Data backfill | Versioned `scripts/migrate-*.ts` idempotent; run from Ops UI or CLI |
| Content shape | `migrateEntity` / quest doc `v` fields (`20`/`24`) |

Ops UI → **Migrations**: list pending, run with backup gate.

DemoBootstrap force flags remain **dev** tools; production uses publish/rollback.

---

# 13. Asset Validation

## 13.1 On save (draft) — soft/hard

Existing logic validation + warnings for missing tilesets.

## 13.2 On publish — hard

| Check | Fail publish if |
| :--- | :--- |
| Tileset file missing under public path | Yes |
| GID out of tileset range | Yes |
| Unknown logic tile id | Yes (already) |
| Gate target map missing | Yes |
| Entity sprite missing | Yes |
| Loot/item refs broken | Yes |
| Dialogue/quest refs broken | Yes |
| Black-void ground (all GID 0) | Yes |

Wire `validate-maps.ts` rules into shared `validateContentForPublish(resource)`.

---

# 14. Dependency Checking

```ts
type DependencyReport = {
  resource: EntityRef;
  dependsOn: EntityRef[];
  dependents: EntityRef[];
  broken: EntityRef[];
};
```

Used by Item/Loot/Quest/Ability editors (`23`/`25`) and **PublishGate**.

Publish blocked if `broken.length > 0`. Warn on soft deps (optional music asset).

---

# 15. Conflict Resolution

## 15.1 Optimistic concurrency

```http
POST /api/maps/:slug
If-Match: "<draftVersion>"
```

or body `expectedVersion`. On mismatch → `409 Conflict` with server draft + author info.

Studio: prompt **Reload server / Overwrite / Diff merge** (diff v1 = field-level JSON).

## 15.2 Multi-author

| Strategy | Spec |
| :--- | :--- |
| v1 | Last-write with 409 if version skew |
| v2 | Soft locks: `WorldMap.lockedBy` / `lockedAt` (5 min) |
| Collab | Bible Phase 5 — cursors (`18`) |

Entity/quest saves use same expectedVersion pattern per row.

---

# 16. Backups

| Type | Trigger | Location |
| :--- | :--- | :--- |
| DB dump | Before `update.sh`, before migrate, before FORCE ops | `backups/db_backup_<ts>.sql` |
| SQLite file copy | Local/staging | `backups/dev_<ts>.db` |
| Content revisions | Every publish | DB `ContentRevision` |
| Uploads/assets | Cron / deploy | object storage or `backups/assets_<ts>.tar` |
| Retention | Keep last N=14 days + one monthly | Ops config |

Backup verify job: checksum + optional restore-to-temp smoke monthly.

---

# 17. Recovery

| Scenario | Playbook |
| :--- | :--- |
| Bad map publish | Rollback revision → content_reload |
| Bad loot economy | Rollback loot revision + modifier disable |
| Corrupt DB | Stop writes → restore dump → migrate → smoke → open |
| Botched code deploy | `update.sh --ref previous_tag` → smoke |
| Accidental FORCE_DEMO_MAP | Restore map revision / DB backup |
| Lost assets | Restore assets tarball; republish maps |

Recovery runbook lives in `info/ops/RECOVERY.md` (create when implementing). Dev Tools links to steps.

---

# 18. Performance Profiling

## 18.1 Signals

| Signal | Source |
| :--- | :--- |
| Process heap/rss/uptime | extend `/api/dev/metrics` |
| Tick duration | GameEngine histogram |
| Map load ms | map-loader timing |
| Socket event rate | SocketHandler counters |
| Reload rebuild ms | Babylon + server logs |
| Slow queries | Prisma middleware (staging) |

## 18.2 Ops UI — Profiler

* Live gauges (Admin)  
* “Profile map reload” button → times invalidate+broadcast+client ack  
* Alerts thresholds (tick > N ms)  

Not a full APM replacement — enough to catch hot-reload regressions.

---

# 19. End-to-end Workflows

## 19.1 Hotfix loot (no restart)

1. Loot Manager edit pool → Save  
2. `emitContentReload({ type:"loot", poolId })`  
3. Players’ next kills use new table  
4. Done  

## 19.2 Publish map safely

1. Save draft (version conflict check)  
2. Validate assets/deps  
3. Preview Walk on draft  
4. Publish → snapshot → live pointer → `content_reload map`  
5. Smoke enter map  

## 19.3 Rollback map

1. Revisions → select liveVersion-1  
2. Publish rollback → reload  
3. Verify  

## 19.4 Code deploy

1. Merge to main  
2. Staging update + smoke  
3. Prod: backup → `update.sh` → health → smoke  
4. On fail: `--ref` previous + restore DB if migrate broke  

## 19.5 Content patch day

1. Bundle patch (quests+loot+items)  
2. Apply staging → Trail smoke  
3. Apply live → sequential reloads  
4. Watch metrics  

---

# 20. Dev Tools / Permissions

| Tool | Min level |
| :--- | :--- |
| Save draft | Content write (400) |
| Publish / Rollback | Admin publish (design: keep 400 or add flag) |
| Flush caches / FORCE ops | Admin |
| Profiler | Admin |
| Engine config | Developer 1000 |
| update.sh trigger API | Existing admin update route — confirm auth; prefer SSH for prod |

Harden `app/api/admin/system/update/route.ts` — must not be world-callable.

---

# 21. Phased Delivery

| Phase | Ship | Restart needed? |
| :--- | :--- | :---: |
| **LO0 Docs** ✅ | This bible | — |
| **LO1 Bus** | `emitContentReload`; map payload+version; client invalidate; loot/quest/dialogue emitters | No |
| **LO2 Publish** | draft/live status; publish wizard; revision snapshots | No |
| **LO3 Conflict + validate** | expectedVersion; publish asset validation; deps gate | No |
| **LO4 Rollback + backup** | Revision restore UI; SQLite backup; restore script | Rare |
| **LO5 Staging/patch** | ContentPatch; staging status; reload E2E smoke | Code only for app |
| **LO6 Profiler + migrate policy** | Metrics UI; prod migrate deploy; update.sh --ref | Deploy only |

---

# 22. Anti-Patterns

1. Restarting PM2 to apply a quest edit  
2. `git reset --hard` as the only “publish content” path  
3. `db push --accept-data-loss` on production  
4. Publishing without asset validation  
5. Ignoring 409 conflicts (blind overwrite)  
6. Backups without restore drills  
7. Fake ServerControl that doesn’t reflect process health  
8. Dual reload channels that diverge (`map_reloaded` vs bus) without alias period  
9. Preview writing into live pointer  
10. FORCE_DEMO_MAP on prod without backup  

---

# Final Rule

**Data changes ride the bus. Code changes ride the deploy. Players stay online for the first; accept brief reconnect only for the second.**  
If a designer needs `update.sh` to change a loot weight, live-ops failed — emit `content_reload` instead.
