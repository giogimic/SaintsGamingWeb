# Local Changelog

## 2026-08-06 — Lobby entities visible (#40 on main)

Merged + browser-confirmed avatar/NPCs on `/lobby` grass.  
See `logs/2026-08-06-lobby-entities-visible.md`.

---

## 2026-08-06 — Lobby entities visible (only-grass fix)

Stop Babylon remount wiping sprites; entity alphatest + render group above grass; live NPC fallback; no poisoned empty map cache.  
See `logs/2026-08-06-lobby-entities-visible.md`.

---

## 2026-08-06 — Lobby MP peer presence UI

Nameplates + amber minimap peers + Nearby HUD; `session_replaced` when same account takes the seat.  
See `logs/2026-08-06-lobby-mp-peer-presence-ui.md`.

---

## 2026-08-06 — Lobby MP peer wipe (base instanceId)

Character load no longer sets base `instanceId`; lobby empty `map_players` keeps peers; `map_joined` before snapshot; Babylon keeps visual during same-base reload.  
See `logs/2026-08-06-lobby-mp-peer-wipe-base-instance.md`.

---

## 2026-08-06 — Lobby MP join-storm / peer wipe

Soft rejoin same socket on public shard; coalesce late `join_map`; empty `map_players` no longer wipes peers.  
See `logs/2026-08-06-lobby-mp-join-storm-fix.md`.

---

## 2026-08-05 — Party invite + TB creature swap

Real party invite accept/decline path; Turn Battle CREATURES switches to next healthy party member.  
See `logs/2026-08-05-lobby-player-stubs.md`.

---

## 2026-08-05 — Manual smokes (create/save + lobby MP)

API create→save→reload and two-socket same-shard peer visibility both PASS; scripts under `scripts/smoke-*.ts`.  
See `logs/2026-08-05-studio-manual-smokes.md`.

---

## 2026-08-05 — Catalog definition undo (Creature + Dialogue)

Blur-stack definition undo shared via `useDefinitionFormHistory`; wired into Creature + Dialogue catalogs (Quest already had v1).  
See `logs/2026-08-05-studio-catalog-def-undo.md`.

---

## 2026-08-05 — Studio author overlays (warp + spawn)

Editor-only gate / NPC / spawn-pin markers with Paint HUD toggles.  
See `logs/2026-08-05-studio-author-overlays.md`.

---

## 2026-08-05 — Studio NPC live spawn

Populate place NPC emits `studio_spawn_npc` so warm shards get `creature_spawned` without rejoin.  
See `logs/2026-08-05-studio-npc-live-spawn.md`.

---

## 2026-08-05 — Lobby MP reconnect + map_reloaded harden

Soft disconnect keeps peers; `map_reloaded` scoped to shard rooms + in-place hot remesh (no Babylon remount).  
See `logs/2026-08-05-lobby-mp-reconnect-harden.md`.

---

## 2026-08-05 — Studio live batched remesh

Paint/erase patches `tileset_mesh_*` quads in place (cell index + UV/collapse/append); overlays are fallback only.  
See `logs/2026-08-05-studio-live-tile-remesh.md`.

---

## 2026-08-05 — Studio gate warp map document sync

Gate/Playtest warps load destination `activeMapData` with `currentMapId`; canvas rejects stale docs.  
See `logs/2026-08-05-studio-gate-warp-mapdata.md`.

---

## 2026-08-05 — P2/P3 finish (definition undo + PIE options)

`pickPublicShardAssignment` wired into `WorldManager`; definition snapshot undo in Quest catalog; PIE pause-spawners/god-mode on Playtest chip gate encounters.  
See `logs/2026-08-05-studio-p2-mp-p3-polish.md`.

---

## 2026-08-05 — P2 lobby MP + P3 polish

Public shard filter no longer picks Studio private/PIE rooms; party/warp/join hardened; erase void overlay + brush reset on layer switch.  
See `logs/2026-08-05-studio-p2-mp-p3-polish.md`.

---

## 2026-08-05 — P1 Studio map create / save

Create New Map no longer copies logic→visual GIDs; Save requires live `activeMapData`; louder auth/validation toasts; API repairs bad visuals on create/write.  
See `logs/2026-08-05-studio-p1-map-create-save.md`.

---

## 2026-08-05 — P0 DEMO north depth + paint

Batched tileset alpha-blend buried northern sprites/overlays. Switched to ALPHATEST depth write, pick-plane-only hits, softer camera margin, slightly higher avatar clearance.  
See `logs/2026-08-05-studio-p0-demo-depth-paint.md`.

---

## 2026-08-05 — Studio / game priority plan

Status + ordered plan for reported gaps (north DEMO depth/paint, map create/save, lobby MP).  
No application code changed. See `logs/2026-08-05-studio-game-priority-plan.md`; `info/CONTINUE.md` updated.

---

## 2026-08-04 — Studio resume notes + CONTINUE update

Strip pause lifted. Handoff: `logs/2026-08-04-studio-resume-after-strip.md` + updated `info/CONTINUE.md`. Studio author `join_map` explicitly sets `lobby: false` so DEMO force never applies in Studio.

---

## 2026-08-04 — Lobby multiplayer map + inventoryService gaps

### Multiplayer map (`DEMO_SANDBOX`)
- Lobby `join_map` (character load, reconnect, late-join) always uses `DEMO_SANDBOX` + `lobby: true`
- Server `PlayerManager` honors `lobby`/`forceDemo` → forces `DEMO_MAP_ID` shard
- Lobby gate warps off-DEMO blocked (Studio still free to warp)

### InventoryService
- Tx-aware `addItem`/`removeItem`/`inventorySnapshot` (GTC purchase/list via `app/actions/gtc.ts` + EconomyManager)
- `addItemWithMeta` for craft durability/affixes
- `wearToolDurability` for gather tool wear
- CraftingManager + InventoryManager wired through service

Tests: 191 pass. Lint clean.

---

## 2026-08-04 — Post-strip re-audit

Re-audited after destructive strip. **Verdict: no further same-degree ghost strip needed.** Remaining HIGH items are consolidation (dual map loaders; inventoryService gaps in GTC/craft/durability), not competing live systems. See audit log post-strip section.

---

## 2026-08-04 — Destructive duplicate strip (complete)

Studio paused. RT+TB combat modes kept. All plan phases done. Tests: **191 pass**.

- **P1 ghosts:** killed party `:3001` client, BattleOverlay/Pixi/battle-engine, PartyUI, JagexHudOrbs, dex-overlay, EntityManager, audio, legacy game-server, unused deps (pixi/howler/easystarjs/dompurify/rehype-sanitize)
- **P2 creatures:** CreatureDb+JSON gone; saints-dex adapts catalog; shared `elementMatchups`
- **P3 inventory/Prisma:** `inventoryService` + shared prisma on live managers
- **P4 classes:** Phase-5 ClassEditor/GameConfigManager stack deleted; DevTools → ClassEditorPanel
- **P5 forum/leftovers:** create-thread → `/api/forum/threads` only; FloatingHealthBars only; lobby achievements stub deleted

Details: `logs/2026-08-04-duplicate-systems-audit.md` implementation status section.

---

## 2026-08-04 — Full duplicate-systems audit

Read-only audit of overlapping/parallel systems. In-progress paths ignored as primary findings. Full report: `logs/2026-08-04-duplicate-systems-audit.md`. No application code changed.

Top live risks: dead client party socket (`:3001`), triple creature catalogs, inventory CRUD fan-out, leftover TB/Pixi battle UIs, many ad-hoc `PrismaClient`s.

---

## 2026-08-04 — Deleted obsolete `giogimic/*` remotes

Deleted all 12 leftover feature branches on `origin` (nothing unmerged; #26 + later studio work already on main). Skipped salvaging duplicate audit docs — main already has `logs/2026-08-04-studio-paint-and-permission-audit.md`, `studio-systems-audit.md`, `studio-dev-mode-ux.md`.

Remote now: `origin/main` only (plus `HEAD`).

---

## 2026-08-04 — Dialogue + Class panels → CatalogEditorShell

### Change
- `DialogueEditorPanel.tsx` and `ClassEditorPanel.tsx` now use shared `CatalogEditorShell` chrome (same pattern as `QuestEditorPanel.tsx`).
- Custom headers / grid list-form layouts replaced with `title` / `blurb` / `dirty` / `toolbar` / `list` + children.
- Removed unused header icons (`MessageSquare`, `UserCheck`). Form bodies, save/delete/seed/json/shiny/nodes behavior preserved.

---

## 2026-08-04 — Remote branch cleanup audit (vs `origin/main` @ `2b8af68`)

Fetch pruned 3 already-deleted remotes: `lobby-click-pass-all-49b4`, `realtime-milestone-2-1aba`, `ucp-back-line-1aba`.

**Nothing left to merge.** All remaining `origin/giogimic/*` tips are either ancestors of main or squash-landed via #26 / later studio commits; merging any tip would regress (tips are behind main by 4–38 commits).

| Branch | Status | Action |
| :--- | :--- | :--- |
| `branch-cleanup-defeat-fix-49b4` | Ancestor (0 ahead) | **Delete** |
| `studio-architecture-phase1-370c` | Ancestor | **Delete** |
| `studio-demo-tileset-seed-370c` | Ancestor | **Delete** |
| `studio-demo-visible-ground-49b4` | Ancestor | **Delete** |
| `studio-master-architecture-49b4` | Ancestor | **Delete** |
| `studio-systems-audit-e53a` | Patch on main (`git cherry -`) | **Delete** |
| `studio-dev-mode-ux-e53a` | Landed via #26 squash | **Delete** |
| `studio-paint-and-permission-audit-56ee` | Landed via #26 | **Delete** |
| `studio-paint-and-permission-fixes-72c8` | Landed via #26 | **Delete** |
| `studio-paint-permissions-ux-49b4` | Landed via #26 | **Delete** |
| `studio-paint-permissions-audit-7229` | Code on main; only unique file is alternate audit doc | **Delete** (optional salvage doc first) |
| `studio-paint-permissions-audit-d3a5` | Same; unique `info/audits/...` doc only | **Delete** (optional salvage) |

Local: only `main` checked out. No open feature branches locally.

---

## 2026-08-04 — Hide The Lobby nav link for guests

### Change
- `src/shared/components/navbar.tsx`: desktop + mobile nav now omit `/lobby` (“The Lobby”) unless `session.user` is present.
- Public visitors no longer see a site-chrome link into the game; logged-in users still do.

### Note
- UI-only gate — direct `/lobby` URLs are unchanged. Route auth can be added separately if needed.

---

## 2026-08-04 — Staging build break (duplicate import)

### Problem
Docker deploy on staging failed at `next build`:

`GameCanvasBabylon.tsx` — `Identifier 'useEditorStore' has already been declared`

Cause: PR #26 (`e015f61`) added a second identical import of `useEditorStore` (lines 7 and 22).

### Fix
- Removed duplicate import in `src/web/components/the-lobby/babylon/GameCanvasBabylon.tsx`
- Ran `npx prisma generate` (stale client missing `globalShinyChancePercent`)
- `npm install` (missing `@aws-sdk/client-s3` after pull)
- **Verified:** `npm run build` succeeds on `main` + this one-line fix
- Committed and pushed to `origin/main` (`4d1ba70`)

### Deploy note
Staging: pull latest `main`, rebuild the web container.

---

## 2026-08-04 — Game engine editor foundation (Phase 1 + 2a)

See `logs/studio-first-hybrid-foundation.md`.

- Phase 1: Editor/Playtest hard split, worldDocument paint path, EditorOp undo, canonical mode labels
- Phase 2a: editor camera pan (MMB / Space+drag), CatalogEditorShell, SchemaFieldRenderer on NPC panel

---

## 2026-08-04 — Remote branch merge readiness

Compared all `origin/giogimic/*` tips to `origin/main` (`e015f61`).

### Already in main (safe to delete remote branches)
| Branch | Notes |
| :--- | :--- |
| `giogimic/realtime-milestone-2-1aba` | Merged via PR #1 |
| `giogimic/branch-cleanup-defeat-fix-49b4` | Tip is ancestor of main |
| `giogimic/studio-architecture-phase1-370c` | Tip is ancestor of main |
| `giogimic/studio-demo-tileset-seed-370c` | Tip is ancestor of main |
| `giogimic/studio-demo-visible-ground-49b4` | Tip is ancestor of main |
| `giogimic/studio-master-architecture-49b4` | Tip is ancestor of main |
| `giogimic/studio-paint-permissions-ux-49b4` | **0 file diff** vs main (squash #26) |
| `giogimic/studio-dev-mode-ux-e53a` | Content landed in #26 |
| `giogimic/studio-paint-and-permission-fixes-72c8` | Content landed in #26 |
| `giogimic/studio-paint-and-permission-audit-56ee` | Content landed in #26 |
| `giogimic/studio-systems-audit-e53a` | Audit docs on main; tip behind #26 |

### Do **not** merge (stale / would regress)
| Branch | Why |
| :--- | :--- |
| `giogimic/lobby-click-pass-all-49b4` | Older than main; removes Admin-only Start Realm gate already on main |
| `giogimic/ucp-back-line-1aba` | Docs-only intent already on main `CONTINUE` / `PROJECT_REPORT`; tip is ~80 commits behind |
| `giogimic/studio-paint-permissions-audit-*` | Older audit docs; merging would drop newer #26 code |

### Verdict
**No feature branches need merging right now.** Main already has the Studio paint/permission/Dev Mode work via #26. Only blocker for staging is the duplicate-import fix above.
