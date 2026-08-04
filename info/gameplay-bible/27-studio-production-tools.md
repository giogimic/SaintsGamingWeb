# Saints Studio — Production Tools Suite (27)

**Status:** Production tooling contract (audit-backed)  
**Date:** 2026-08-04  
**Scope:** Every production tool required to build a large MMORPG — project browser, package manager, asset management, search, reference viewer, dependency graph, tasks, bookmarks, favorites, templates, prefabs, documentation, notes, team workflows, permissions, audit logs, localization, analytics, diagnostics, performance tools. **Nothing left undefined.**

> **Companions (do not fork)**
> - [`16`](./16-studio-editor-philosophy.md)–[`26`](./26-studio-live-operations.md) — Studio through live ops
> - [`18`](./18-studio-master-architecture.md) — registries & reuse rules
> - [`19`](./19-studio-ux-design.md) — chrome, Ctrl+K, docks
> - [`28-studio-backend-architecture.md`](./28-studio-backend-architecture.md) — APIs, audit table, search index, packages persistence
> - [`29`](./29-studio-glossary-canonical.md)–[`30`](./30-studio-editor-kernel-standard.md) — PanelIds + CatalogEditorShell for every production dock
> - Site RBAC: `src/web/lib/permissions.ts`, `info/admin/PERMISSIONS.md`

**This document is the production-tools master.** Evolve World profiles, Asset Browser, `studioPermissions`, Dev Tools metrics, `docs/`/`info/` — do not invent a second IDE outside `/studio`.

---

# 0. Non-Negotiable Rules

1. **One Studio binary** — all tools are docks/modes/overlays on `/studio` (+ thin Admin deep-links).
2. **Reuse CatalogEditorShell / Ctrl+K / Outliner** (`19`) — every tool registers into them.
3. **References over copies** — packages, prefabs, docs link resources by id (`20`/`23`/`26`).
4. **Permissions are server-enforced** — UI hides; APIs reject.
5. **Audit every mutating Studio write** — who/when/what/before/after.
6. **Localization is data** — string keys in registries; no hardcoded EN-only new surfaces.
7. **Diagnostics never require restart** for read-only views (`26`).
8. **Social bookmarks / Modpacks / forum analytics stay separate namespaces** — Studio tools do not overload those tables without a `studio_` prefix or dedicated models.

---

# 1. Audit → Target

| Requested | Today | Target |
| :--- | :--- | :--- |
| Project browser | WorldProfileBar + map search | Full Project Browser |
| Package manager | Community Modpack only | Studio Content Packages |
| Asset management | AssetBrowser / GameAsset | Extend + packs + validation hooks |
| Search | Site GlobalSearch; panel filters | Studio Omnisearch (Ctrl+K already designed) |
| Reference viewer | SpritePreview only | Ref Viewer dock |
| Dependency graph | Docs only | Graph + “Used by” |
| Tasks | Admin mock tasks | Studio Task Board |
| Bookmarks / favorites | Social only | Studio bookmarks |
| Templates / prefabs | QuestTemplate, logic presets; no EntityPrefab | Prefab/Template browser (`20`) |
| Documentation / notes | `docs/`/`info` repo | In-Studio Doc/Notes panels |
| Team workflows | Absent | Projects, roles, reviews |
| Permissions | Admin 400 / Dev 1000 | Matrix + Creator tier ready |
| Audit logs | Mock | `StudioAuditLog` |
| Localization | Absent | Locale packs + string keys |
| Analytics | Social only | Studio authoring analytics |
| Diagnostics / performance | Dev overlay + metrics APIs | Unified Diagnostics dock |

---

# 2. Tool Inventory (nothing undefined)

| Tool ID | UI home | Primary data |
| :--- | :--- | :--- |
| `project_browser` | Left rail / Ctrl+Shift+P | StudioProject |
| `package_manager` | Dock Packages | ContentPackage |
| `asset_manager` | Dock Assets (evolve) | GameAsset + packs |
| `omnisearch` | Ctrl+K palette | Search index |
| `reference_viewer` | Dock / peek | any ResourceRef |
| `dependency_graph` | Dock Graph | DependencyEdge |
| `task_board` | Dock Tasks | StudioTask |
| `bookmarks` | Star menu / palette | StudioBookmark |
| `favorites` | Pinned strip | StudioFavorite |
| `template_browser` | Dock Templates | TemplateIndex |
| `prefab_browser` | Assets → Prefabs | EntityPrefab (`20`) |
| `doc_browser` | Dock Docs | StudioDocPage |
| `notes` | Dock Notes / pin | StudioNote |
| `team` | Project settings | StudioMembership |
| `permissions` | Admin + project | Role bindings |
| `audit_log` | Dock Audit / Admin | StudioAuditLog |
| `localization` | Dock L10n | LocaleString |
| `analytics` | Dock Analytics | StudioAnalyticsEvent |
| `diagnostics` | Dock Diagnostics | metrics streams |
| `performance` | Diagnostics tab + overlay | Profiler (`26`) |

---

# 3. Data Structures

## 3.1 Projects

```ts
type StudioProject = {
  id: string;                 // often = world profile / gameId
  slug: string;
  name: string;
  description?: string;
  gameId: string;             // WorldMap.gameId scope
  status: "active" | "archived";
  defaultLocale: string;      // "en"
  locales: string[];
  packageIds: string[];
  createdAt: string;
  updatedAt: string;
  settings: {
    requireReviewToPublish: boolean;
    allowCreatorSandbox: boolean;
  };
};
```

**Bridge:** `activeGameId` / World profiles become projects (1:1 initially).

## 3.2 Packages

```ts
type ContentPackage = {
  id: string;
  projectId: string;
  name: string;
  version: string;            // semver
  description?: string;
  /** Resource refs included */
  contents: Array<{ type: string; id: string }>;
  dependencies: Array<{ packageId: string; versionRange: string }>;
  tags: string[];
  checksum?: string;
  publishedAt?: string;
};
```

Export/import JSON + asset blob. Distinct from community `Modpack`.

## 3.3 Assets (extend GameAsset)

```ts
type AssetRecord = {
  // existing GameAsset fields…
  id: string;
  path: string;
  type: string;
  tags: string[];
  packId?: string;
  customLabels?: Record<string, string>; // locale → label
  usageCount?: number;        // computed
  validatedAt?: string;
};
```

## 3.4 Search index

```ts
type SearchDocument = {
  id: string;
  type: "map"|"asset"|"quest"|"dialogue"|"item"|"loot"|"creature"|"npc"|"prefab"|"doc"|"task"|"ability"|"class";
  projectId: string;
  title: string;
  body?: string;
  tags: string[];
  locale?: string;
  updatedAt: string;
};
```

Omnisearch queries this index (maintain on save via hooks).

## 3.5 References & dependencies

```ts
type ResourceRef = { type: string; id: string; projectId?: string };

type DependencyEdge = {
  from: ResourceRef;
  to: ResourceRef;
  field: string;              // "components.Loot.poolId"
  strength: "hard" | "soft";
};
```

Same as `20`/`23`/`26` — one graph service.

## 3.6 Tasks

```ts
type StudioTask = {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: "backlog" | "doing" | "review" | "done" | "blocked";
  priority: "low" | "med" | "high";
  assigneeId?: string;
  reporterId: string;
  linkedResources: ResourceRef[];
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
};
```

## 3.7 Bookmarks & favorites

```ts
type StudioBookmark = {
  id: string;
  userId: string;
  projectId: string;
  ref: ResourceRef;
  label?: string;
  folder?: string;
  createdAt: string;
};

type StudioFavorite = {
  userId: string;
  ref: ResourceRef;
  rank: number;               // pin order
};
```

Separate from `SocialBookmark`.

## 3.8 Templates & prefabs

```ts
type TemplateKind = "quest" | "dialogue" | "loot" | "npc" | "map_snip" | "ability" | "entity_prefab";

type TemplateIndexEntry = {
  id: string;
  kind: TemplateKind;
  name: string;
  description?: string;
  projectId?: string | null;  // null = global official
  payloadRef: ResourceRef;    // points at prefab or definition seed
  thumbnail?: string;
  tags: string[];
};
```

Prefabs: `EntityPrefab` (`20`). QuestTemplate remains definition SoT; listed in Template Browser.

## 3.9 Docs & notes

```ts
type StudioDocPage = {
  id: string;
  projectId?: string | null;
  slug: string;
  title: string;
  bodyMd: string;
  locale: string;
  tags: string[];
  /** Optional mirror of repo path for synced pages */
  sourcePath?: string;        // e.g. info/gameplay-bible/18-…
  updatedAt: string;
};

type StudioNote = {
  id: string;
  userId: string;
  projectId: string;
  ref?: ResourceRef;          // pinned to resource
  bodyMd: string;
  color?: string;
  updatedAt: string;
};
```

## 3.10 Team

```ts
type StudioRole = "viewer" | "creator" | "developer" | "admin" | "owner";

type StudioMembership = {
  projectId: string;
  userId: string;
  role: StudioRole;
  /** Override dock mins optional */
  dockGrants?: string[];
};
```

Maps onto numeric `permissionLevel` for global Studio entry; project role further gates publish.

## 3.11 Audit

```ts
type StudioAuditLog = {
  id: string;
  at: string;
  userId: string;
  projectId?: string;
  action: string;             // "map.publish" | "loot.update" | …
  resource: ResourceRef;
  before?: unknown;
  after?: unknown;
  meta?: Record<string, unknown>;
  ip?: string;
};
```

## 3.12 Localization

```ts
type LocaleString = {
  key: string;                // "quest.trail_wake.title"
  locale: string;
  value: string;
  projectId?: string | null;
  updatedAt: string;
  updatedBy?: string;
};
```

Registries store **keys**; LocaleString supplies values. Fallback: `defaultLocale`.

## 3.13 Analytics

```ts
type StudioAnalyticsEvent = {
  id: string;
  at: string;
  userId: string;
  projectId: string;
  name: string;               // "editor.save" | "publish" | "search" | "place_prefab"
  props?: Record<string, unknown>;
};
```

Aggregates: saves/day, publish latency, search zero-results, error rates — **not** player telemetry (separate).

---

# 4. Tool Designs (complete)

## 4.1 Project Browser

**UI:** Tree — Projects → Packages → Maps / Definitions folders → resources.

| Action | Behaviour |
| :--- | :--- |
| Switch project | Sets `activeGameId` / StudioProject |
| New project | Wraps world profile create |
| Open resource | Opens owning dock + selects |
| Context menu | Bookmark, favorite, task, copy ref |

**Workflow:** Open Studio → Project Browser picks Trail profile → maps list → open DEMO_SANDBOX.

## 4.2 Package Manager

| Action | Behaviour |
| :--- | :--- |
| New package | Empty manifest |
| Add resources | Multi-select from omnisearch |
| Declare deps | Other package semver |
| Validate | Deps + asset missing |
| Export | `.sgpkg` zip (JSON + assets) |
| Import | Conflict UI (`26` merge) |
| Publish package version | Revision + audit |

**Workflow:** Bundle Saints Trail quests+dialogue+loot → export → import on staging project.

## 4.3 Asset Management

Evolve Asset Browser:

* Packs filter, validation status badge  
* Bulk tag, locale labels editor  
* “Find references” → Ref Viewer  
* Drag to Place (`19`/`21`)  
* Publish-time validation hooks (`26`)  

Admin Asset Studio deep-link optional.

## 4.4 Search (Omnisearch)

Ctrl+K groups (`19` §13) **must** include all SearchDocument types.

| Feature | Spec |
| :--- | :--- |
| Fuzzy title/body/tags | Debounced |
| Type filters | chips |
| Recent / favorites | top |
| Enter | Open resource |
| Zero results | Log analytics event |

Site `GlobalSearch` remains community-only.

## 4.5 Reference Viewer

Peek dock / side panel:

* Identity header (type, id, project)  
* Preview (sprite/map thumb/quest summary)  
* Fields summary  
* **Used by** / **Uses** lists  
* Actions: Open editor, Bookmark, Copy id, Create task  

Opened from dependency clicks, search, Inspector “Show refs”.

## 4.6 Dependency Graph

| View | Behaviour |
| :--- | :--- |
| Ego graph | Center on selection; 1–2 hop |
| Project graph | Filter by type |
| Broken only | Publish gate input |

Nodes clickable → Ref Viewer. Edges show `field` on hover.

## 4.7 Task System

Kanban: backlog / doing / review / done / blocked.

* Link resources  
* Assignee from project members  
* “Request review” → status review + notify  
* Done can gate publish if `requireReviewToPublish`  

**Not** Admin mock Discord tasks.

## 4.8 Bookmarks & Favorites

* Star on any Ref Viewer / dock row → Bookmark  
* Favorites = pinned rank strip under menu bar (`19`)  
* Palette: “Bookmarks: …”  

## 4.9 Templates Browser

Lists TemplateIndexEntry by kind; “Instantiate” creates definition or stamps prefab.

Seeds: official templates + project templates.

## 4.10 Prefabs

Assets → Prefabs tab (`20`): stamp Place mode; variants; inheritance flatten; update policy detach/linked.

## 4.11 Documentation

| Mode | Content |
| :--- | :--- |
| Synced | Read-only mirror of `info/gameplay-bible/*` / `docs/*` via `sourcePath` |
| Project docs | Editable StudioDocPage |
| Context help | `?` opens doc slug for current tool |

## 4.12 Notes

Personal/project sticky notes pinned to resources; markdown; appear in Ref Viewer.

## 4.13 Team Workflows

Project settings:

* Invite by user id/email (site accounts)  
* Role: viewer/creator/developer/admin/owner  
* Review flow with tasks  
* Optional comments on ContentRevision (`26`)  

Collab cursors = later (`18` Phase 5); workflows don’t require them.

## 4.14 Permissions

| Layer | Spec |
| :--- | :--- |
| Global | `permissionLevel` enter Studio |
| Project role | Fine grants |
| Dock matrix | Extend `STUDIO_DOCK_MIN_LEVEL` + project overrides |
| Publish | Admin/owner or developer if allowed |
| Audit read | Admin+ |

Creator tier: sandbox projects only when `allowCreatorSandbox`.

## 4.15 Audit Logs

Every Studio mutating API writes `StudioAuditLog`.

UI: filter by user/resource/action/date; open before/after diff; export CSV.

Retention: 90 days hot + archive task (real, not mock).

## 4.16 Localization

| Tool | Behaviour |
| :--- | :--- |
| String table | CRUD LocaleString |
| Coverage | % translated per locale |
| Resource binding | Quest title key → locales |
| Asset labels | GameAsset.customLabels editor |
| Preview locale | Studio chrome switch → re-render keys |

Runtime game clients resolve keys with fallback.

## 4.17 Analytics

Dashboard:

* Saves / publishes / reloads per day  
* Search zero-result terms  
* Error toasts rate  
* Time-to-publish  
* Most edited resources  

Privacy: Studio staff only; no PII beyond userId.

## 4.18 Diagnostics

Unified dock tabs:

* **Health** — server status (real), socket, DB ping  
* **Reload log** — last ContentReloadEvents (`26`)  
* **Validation** — last publish failures  
* **Client** — FPS, map id, entity counts (merge `dev-overlay`)  
* **Realtime** — deep-link admin realtime metrics  

## 4.19 Performance Tools

| Tool | Spec |
| :--- | :--- |
| FPS overlay | Existing Ctrl+` — keep |
| Reload profiler | Time map rebuild (`26`) |
| Tick histogram | GameEngine metrics |
| Asset cost | Texture size / count per map |
| Budget warnings | GameConfig caps |

---

# 5. Cross-cutting Workflows

## 5.1 Onboard new designer

1. Owner adds membership role creator  
2. Project Browser → sandbox project  
3. Docs dock → fun-first guide  
4. Favorites: DEMO map, Loot Manager  

## 5.2 Ship a content package

1. Tasks → “Trail loot balance” done  
2. Package Manager gather resources  
3. Dependency graph clean  
4. L10n coverage ≥ threshold  
5. Export → import staging → publish (`26`)  
6. Audit log records  

## 5.3 Find breakages

1. Omnisearch item `wood_log`  
2. Ref Viewer → Used by recipes/loot  
3. Graph → broken soft edges  
4. Fix → save → content_reload  

## 5.4 Review before publish

1. Author sets task review  
2. Reviewer opens linked map draft  
3. Notes + approve task  
4. Publish wizard (`26`)  

## 5.5 Diagnose lag after reload

1. Diagnostics → Reload log  
2. Performance → profile map reload  
3. Asset cost high → compress / atlas  
4. Analytics spike in reload ms  

---

# 6. Integration Map

| Tool | Hooks into |
| :--- | :--- |
| Project Browser | worldProfiles, maps API |
| Packages | ContentRevision, assets |
| Assets | GameAsset APIs |
| Omnisearch | all registries’ save hooks |
| Ref/Deps | LootRef, quests, entities, abilities |
| Tasks | notifications (site) |
| Prefabs | Place mode (`21`), entities (`20`) |
| Docs | repo sync job optional |
| Permissions | studioPermissions + membership |
| Audit | every mutate API |
| L10n | quest/item/ui strings |
| Analytics | Studio client beacon + server |
| Diagnostics | metrics APIs, content_reload log |

---

# 7. UI Chrome Placement (`19`)

```
Menu: Project · Packages · View · Team · Help(Docs)
Left rail: Project Browser (collapsible)
Favorites strip: under menu
Ctrl+K: Omnisearch
Docks: Assets, Prefabs/Templates, Tasks, Docs, Notes, Deps, Audit, L10n, Analytics, Diagnostics
Status: project name · locale · dirty · role
```

---

# 8. Validation & Gates

| Gate | Blocks |
| :--- | :--- |
| Package export | Broken hard deps |
| Publish | Audit writable; l10n if required; review task if configured |
| Delete resource | Hard dependents exist (must reassign) |
| Role demote | Cannot demote last owner |

---

# 9. Phased Delivery

| Phase | Ship | Reuse |
| :--- | :--- | :--- |
| **PT0 Docs** ✅ | This bible | — |
| **PT1 Search + bookmarks + favorites** | Omnisearch index hooks; Studio bookmarks | Ctrl+K |
| **PT2 Ref viewer + dependency API** | Used-by for items/loot/quests | registries |
| **PT3 Project browser = profiles** | Tree UI on WorldProfileBar | worldProfiles |
| **PT4 Prefabs + templates browser** | EntityPrefab + template index | `20` |
| **PT5 Tasks + notes + docs dock** | StudioTask/Note; doc mirror | — |
| **PT6 Team + audit + packages** | Membership, StudioAuditLog, ContentPackage | `26` publish |
| **PT7 L10n + analytics + diagnostics unify** | LocaleString; analytics; diagnostics dock | metrics |

---

# 10. Anti-Patterns

1. Using `SocialBookmark` for Studio pins  
2. Treating Modpack as Studio package format  
3. Omnisearch that only hits forum threads  
4. Dependency graph that isn’t wired to publish  
5. Audit “task” that doesn’t write DB  
6. Hardcoded English in new docks  
7. Per-tool permission systems bypassing studioPermissions  
8. Second documentation site instead of Docs dock + repo  
9. Analytics that track players inside Studio tools  
10. Leaving Prefabs as docs-only while Place mode ships  

---

# Final Rule

**A large MMORPG is built with a studio that remembers, finds, packages, reviews, and explains every resource.**  
If a designer cannot find who uses an item, pin a map, assign a task, or see why publish failed, the production suite is incomplete — define the tool, don’t improvise a spreadsheet.
