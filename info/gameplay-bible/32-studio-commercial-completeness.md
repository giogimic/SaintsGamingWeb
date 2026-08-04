# Saints Studio — Commercial Completeness (32)

**Status:** Industry-gap closure for a finished MMORPG creation suite  
**Date:** 2026-08-04  
**Scope:** Multi-user collaboration, version-control UX, crash recovery, localization & accessibility pipelines, CI/headless validation, plugin/package SDK, creator telemetry, play-in-editor hardening, import hub, timeline/audio/VFX baselines, networking diagnostics — everything still thin in 16–31 that a commercial engine must define.

> **Depends on:** [`29`](./29-studio-glossary-canonical.md)–[`31`](./31-studio-integration-contracts.md), [`26`](./26-studio-live-operations.md), [`27`](./27-studio-production-tools.md), [`28`](./28-studio-backend-architecture.md).  
> **Does not** rewrite Babylon, WorldMap, or working docks — extends them.

---

# 0. Commercial Bar (definition of done)

Saints Studio is **commercially complete** when:

1. A mid-size team can co-author without clobbering (locks + 409 UX).  
2. Every content mutate is auditable, searchable, reloadable, and CI-validatable.  
3. Localization and accessibility are pipelines, not afterthoughts.  
4. Import/export and packages move content between projects safely.  
5. Creators can Play-In-Editor without harming live players.  
6. Diagnostics explain publish/reload/perf failures without SSH.  
7. Naming/editors/workflows follow 29–31 with no obvious forks.  
8. Remaining “Advanced / later” items are **listed and non-blocking**, not silent holes.

---

# 1. Collaboration & Presence

## 1.1 Soft locks (v1 — ship)

```ts
type SoftLock = {
  resource: ResourceRef;
  userId: string;
  displayName: string;
  at: string;
  expiresAt: string; // heartbeat refresh
};
```

* Acquiring edit focus on def/map section takes soft lock.  
* Others: read-only banner “Locked by Ada” · Take Over (admin) · Open Read-Only.  
* Heartbeat 30s; expire 90s.  
* Socket: `studio_lock` / `studio_unlock` / `studio_presence`.

## 1.2 Presence (v1)

* Viewport cursors optional (flag); always show **who is in project** in Project Browser.  
* No CRDT (28 non-goal). Conflicts = expectedVersion + lock.

## 1.3 Review workflow

* Task status `review` + linked Resources.  
* Request Review menu → assignees.  
* Publish gate may require completed review task (27 project setting).

---

# 2. Version Control UX (content)

Not Git-for-maps in v1 — **ContentRevision-native**:

| Feature | Behaviour |
| :--- | :--- |
| History dock | List revisions for ResourceRef |
| Annotate | Hover revision → author, message, diff summary |
| Restore | Creates new revision (never mutate history) — 26 |
| Compare | Side-by-side JSON/semantic diff (fields) |
| Changelist | Group dirty defs into named CL before publish |
| Branch (v2) | Soft branch = parallel draft gameId clone |

Git remains for **code**. Content blame ≠ git blame.

Conflict UX (409):

1. Show server version meta  
2. Diff local vs server  
3. Reload / Overwrite (if canPublish) / Merge fields (map entities by id)

---

# 3. Autosave, Crash Recovery, Drafts

| Mechanism | Spec |
| :--- | :--- |
| Autosave map | Interval preference default **120s** if dirty; never autosave if soft validation hard-fail |
| Autosave defs | Debounced 5s per dock or on blur |
| Local draft buffer | `localStorage`/`IDB` key `studioDraft:{gameId}:{resource}` |
| Crash recovery | On load, if draft newer than server → Recovery dialog |
| Force quit | Flush draft sync on `beforeunload` when possible |

Recovery dialog: Restore draft · Discard · Diff.

---

# 4. Play-In-Editor (PIE) hardening

| Option | Default |
| :--- | :--- |
| Use draft map version | On |
| Isolate from public shard | On → private `studio_pie_{userId}` room |
| Pause spawners | On |
| Pause world events | On |
| God mode / ignore encounter | Off (preference) |
| Play as class | Current character or picker |
| Mock inventory kit | Optional preset |

Walk mode without PIE isolation on shared live shards is **Advanced-only** and warns.

Return from PIE: restore locks, dirty state, camera.

---

# 5. Localization pipeline (E2E)

```
Author strings as keys
  → extract (save hooks + CI job)
  → LocaleString DB
  → Export CSV/XLIFF
  → Translate
  → Import
  → Preview locale in Studio (status locale switch)
  → Publish gate completeness
  → Runtime resolve
```

| Step | Owner |
| :--- | :--- |
| Key pattern | 29/31 |
| Dock | `l10n` (27) |
| CI extract | `npm run l10n:extract` |
| Screenshot QA | Optional future; caption preview in cutscene scrub |

RTL: layout mirror flag for preview (v2). Fallback chain: selected → defaultLocale → key shown in `[brackets]` (Studio) / default (player).

---

# 6. Accessibility

## 6.1 Studio a11y (19 +)

* Focus rings, dock titles, live region on selection  
* Prefers-reduced-motion → disable pulse/gizmo spin  
* Scalable chrome density (compact/comfortable)  
* High-contrast chrome theme  

## 6.2 Player content a11y (authoring support)

| Feature | Authoring |
| :--- | :--- |
| Captions | Cutscene caption tracks + l10n |
| Colorblind safe markers | Region/overlay palettes tested; avoid color-only logic |
| Motion | Cutscene `reduceMotion` alternate |
| Input | Remap player actions in Preferences (game); Studio documents required actions |

Input Remap Editor PanelId: fold into Preferences + Game Settings (player), not a Studio graph.

---

# 7. CI / Headless validation & bake

## 7.1 Jobs (canonical)

| Job | Command (target) | Fails on |
| :--- | :--- | :--- |
| Unit | `npm test` | assertion |
| Lint | `npm run lint` | errors |
| Content validate | `npm run validate:content` | hard refs, schema, map save rules |
| Dep graph | `npm run validate:deps` | hard cycles/breaks on live |
| L10n | `npm run l10n:check` | missing keys if flag |
| Audit hook lint | `npm run validate:audit-coverage` | mutate without audit |
| Migrate dry | `prisma migrate diff` / deploy staging | drift |
| Smoke reload | staging save→content_reload | no event / version |

## 7.2 Headless bake

Nightly / on publish:

* Rebuild DependencyIndex  
* Rebuild SearchDocument index  
* Optional nav grid bake for companion path overlays  
* Asset path existence scan  

Artifacts: JSON reports in CI + downloadable from Diagnostics.

---

# 8. Import Hub

Dialog **Import Hub…** (File menu):

| Pipeline | Input | Output |
| :--- | :--- | :--- |
| TMX / Tiled | `.tmx` | WorldMap layers/tilesets |
| Spritesheet / atlas | image + JSON | GameAsset rows |
| Dialogue CSV | csv | NpcDialogueTree |
| Quest CSV | csv | QuestTemplate stubs |
| Creature YAML | Tuxemon import | CreatureTemplate → CreatureDef sync |
| Items CSV | csv | ItemTemplate |
| ContentPackage | `.sgpkg` | Package import |
| Modpack adapter | community modpack | Best-effort ContentPackage |

Every pipeline: dry-run report → apply → audit → reload.

---

# 9. Plugin & Package SDK

## 9.1 Content packages (27) — ship first

Semver, deps, export/import, publish — already designed.

## 9.2 Code plugins (guarded)

```ts
type StudioPluginManifest = {
  id: string;
  version: string;
  minStudioApi: string;
  contributes: {
    panelIds?: string[];
    schemaTypes?: string[];
    logicTags?: string[];
    commands?: string[];
    reloadTypes?: string[];
  };
};
```

Rules (18 §10 +):

* Plugins register into kernel — no new Studio binary  
* Sandbox: no raw Prisma; use services APIs  
* Install requires Developer 1000  
* ContentPackage may **reference** plugin id as soft dep  

v1 may ship manifest-only hooks; full VM sandbox is v2. Documented so architecture has no hole.

---

# 10. Creator telemetry & diagnostics UX

## 10.1 Analytics events (27)

Funnel required:

* `studio.open`  
* `editor.first_paint`  
* `editor.first_walk`  
* `editor.save` / `editor.save_fail`  
* `publish` / `publish_fail`  
* `search.zero_results`  
* `pie.enter` / `pie.exit`  
* `conflict.409`  

Privacy: no player PII in creator analytics; project-scoped.

## 10.2 Diagnostics dock tabs

| Tab | Content |
| :--- | :--- |
| Problems | 30 validation aggregate |
| Reload bus | last N ContentReloadEvents |
| Performance | map rebuild ms, FPS, asset cost |
| Locks | soft locks |
| CI reports | last validate:content |
| Logs | filtered studio errors |

Dev Tools (`dev`, level 1000) keeps engine probes; Diagnostics is creator-facing.

---

# 11. Timeline / Audio / VFX baselines

## 11.1 Shared Timeline (extends 24 cutscenes)

Tracks: Camera · Caption · Audio · Entity visibility · Quest flag pulses.  
Cutscene editor becomes Timeline consumer. WorldEvent can reference timeline id.

## 11.2 Audio

Keep region music/ambience (21). Add:

* Bus list: Master / Music / SFX / Voice  
* Per-region bus gains  
* Ducking preset on dialogue  

Full mixer graph = Advanced v2; buses are enough for commercial audio authoring baseline.

## 11.3 VFX

* Attach VFX prefab ids on abilities/entities (sprite FX / particles later)  
* Preview button in Inspector  
* Particle graph = explicit later item (not silent gap)

---

# 12. Networking & replication diagnostics

Diagnostics → **Net** tab (Developer):

* Room / shard id  
* Entity count interest  
* Last content_reload delivery  
* RTT / tick  

Not a full Unreal net profiler — enough to debug “PIE saw old loot.”

---

# 13. Batch operations & scale UX

| Op | Spec |
| :--- | :--- |
| Batch rename | Select ResourceRefs → slug pattern → remap refs (20 §9.2) |
| Bulk tag assets | Assets dock |
| Multi-edit Inspector | Intersection fields only |
| Search reindex | Ops command |
| Map chunk load | Already engine; Studio progress on rebuild |

Scalability debt controls (28): serializer layer; ContentCache; migrate deploy; audit retention policy (90d hot / archive).

---

# 14. Technical debt retirement schedule

| Debt | Retire by phase |
| :--- | :--- |
| admin_save_map | BE1 |
| SaintsMap model | BE1–BE2 |
| GameMap writes | BE4–BE8 |
| GameQuest writes | BE3 |
| GameItem dual | ECO1/BE3 |
| Orphan SchemaFieldRenderer | EK2 |
| ITEM_DB writers | ECO1 |
| RESOURCE_NODE_MAP | after GatherNodeDef |
| JSON string soup | serializer now; native Json optional later |
| db push prod | LO6/BE7 |
| Mode UI legacy labels | EK1 / 29 |
| EntityRef name overload | 29 now |

ALIGNMENT must track this table.

---

# 15. Explicit later list (not gaps — parked)

These are **acknowledged**, not undefined:

* Full CRDT co-editing  
* Git branch UX for maps  
* RTL production polish  
* Particle node graph  
* Shader/material graph  
* Marketplace storefront for UGC packages (Slice E)  
* Navmesh 3D bake (2.5D grid overlays suffice)  
* Heavy microservice split  

Parking is allowed; silence is not.

---

# 16. Completeness matrix (systems × concerns)

| System | Kernel 30 | Ids 29 | Integrate 31 | Collab | L10n | CI | PIE | Diag |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Maps / Paint | ✓ | ✓ | ✓ | lock | labels | validate | ✓ | rebuild |
| Entities / Prefabs | ✓ | ✓ | ✓ | lock | names | deps | ✓ | — |
| NPC / AI | ✓ | ✓ | ✓ | lock | ✓ | ✓ | pause AI | — |
| Quests / Dialogue | ✓ | ✓ | ✓ | lock | ✓ | ✓ | test bench | — |
| Economy / Loot / Items | ✓ | ✓ | ✓ | lock | ✓ | ✓ | simulate | — |
| Creatures / Combat | ✓ | ✓ | ✓ | lock | ✓ | ✓ | Walk | — |
| Live ops / Publish | ✓ | ✓ | ✓ | review | gate | ✓ | preview | bus |
| Production tools | ✓ | ✓ | ✓ | tasks | dock | index | — | dock |
| Backend services | — | ✓ | ✓ | locks API | LocaleString | migrate | rooms | metrics |

Any future system must add a row before implementation.

---

# 17. Phased delivery (commercial)

| Phase | Ship |
| :--- | :--- |
| **CC0** | Docs 29–32 |
| **CC1** | Soft locks + 409 dialog + PIE isolation flag |
| **CC2** | Autosave + recovery dialog |
| **CC3** | Import Hub v1 (TMX + package + CSV items) |
| **CC4** | l10n extract/check CI + publish gate |
| **CC5** | validate:content + deps + audit-coverage CI |
| **CC6** | Diagnostics Problems/Reload/Perf tabs unify |
| **CC7** | Timeline buses baseline; batch rename |
| **CC8** | Plugin manifest hooks (optional) |

Parallel with BE/LO/EK/product phases — CC does not block LO1.

---

# 18. Anti-Patterns

1. Shipping a dock without 29 PanelId + 30 scorecard + 31 contracts  
2. Calling “collab done” without locks or 409 UX  
3. Treating l10n as English columns forever  
4. CI that only builds Next and never validates content refs  
5. PIE on live shards without warning  
6. Silent “later” features with no parked list  
7. New graph runtime per feature  
8. Creator analytics that track players  
9. Plugin that bypasses studio services / permissions  
10. Reopening GameMap/SaintsMap/GameQuest as SoT  

---

# Final Rule

**A finished commercial MMORPG creation suite is not more docks — it is one vocabulary, one kernel, every integration contracted, and every industry expectation either shipped or honestly parked.**  
When 29–32 and domain bibles 16–28 agree, Saints Studio has no obvious architectural gaps left to design — only implementation.
