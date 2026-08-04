# Duplicate Systems Audit — Saints Gaming

**Date:** 2026-08-04  
**Scope:** Full-repo read-only audit for overlapping implementations, parallel architectures, redundant modules, dual codepaths, copy-pasted near-duplicates, and competing abstractions.  
**Method:** package.json deps, `src/` tree (`engine`/`game`/`server`/`web`/`shared`/`editor`), `app/api`, `legacy/`, Grep/Glob/Read across 15 audit domains.  
**Ignored paths** (in-progress; not treated as primary findings unless they reveal broader duplicates):  
`src/web/components/the-lobby/index.tsx`, `public/game-assets/monster/battle/*`, `public/game-assets/saints_roster_tracker.md`, `info/AI_DEVELOPMENT_RULES.md`, `logs/2026-08-01-status-and-plans.md`, `logs/dependency-coherence-2026-07-06.md`, `logs/dependency-repair-plan-2026-07-06.md`.

No application code was modified.

---

## Executive summary

The codebase has one live MMO stack (custom `server.ts` + `GameEngine` + Babylon client + Socket.io), but it carries **multiple generation layers** of creature/combat/party/auth/forum APIs that were never fully retired. The highest-severity live risks are: **triple creature catalog**, **dual turn-battle UIs still present**, **client party-manager pointing at a dead port**, **inventory mutations scattered across 6+ managers**, and **many `new PrismaClient()` instances** beside the shared singleton.

---

## Findings

### 1. Triple rendering stacks (Babylon + Pixi + Three/R3F)

| | |
|---|---|
| **Severity** | HIGH (dual maintenance / bundle weight); CRITICAL only if Pixi battle were remounted alongside live TB |
| **Paths** | `c:\Users\Matth\OneDrive\Desktop\Saints Web\src\engine\BabylonEngine.ts`, `...\the-lobby\babylon\GameCanvasBabylon.tsx`, `...\the-lobby\CreatureBattleScene.tsx`, `...\landing\sg-logo-true-3d.tsx`, `package.json` (`@babylonjs/*`, `pixi.js`, `three`, `@react-three/fiber`, `@react-three/drei`) |
| **What each does** | Babylon = live overworld renderer. Pixi `CreatureBattleScene` = alternate WebGL battle scene wired to `battle-engine`. R3F/Three = marketing logo only. |
| **Overlap** | Three GPU frameworks in one Next app; battle path historically split Pixi vs DOM TB overlays. |
| **Recommendation** | Keep Babylon for MMO. Keep R3F for landing if desired (or SVG). Delete/archive Pixi battle scene + `pixi.js` unless a visual battle milestone reuses it. |

### 2. Dual battle systems: RT combat vs turn-based (plus legacy UIs)

| | |
|---|---|
| **Severity** | CRITICAL (legacy TB UI still exists; comment documents prior dual-mount bug) / HIGH for logic duplication |
| **Paths** | Live RT: `...\server\CombatManager.ts`, `...\shared\game\combatAbilities.ts`. Live TB UI: `...\battle\TurnBattleOverlay.tsx` + server `EncounterManager`. Orphan/legacy: `...\BattleOverlay.tsx`, `...\CreatureBattleScene.tsx`, `...\game\battle-engine.ts`, client `...\combat.ts` |
| **Overlap** | Three type charts (`combat.ts` 8-element Solar/Hydro…, `creature-dex.ts` TYPE_CHART, `battle-engine.ts` creature_TYPE_CHART). Two TB overlays implementing the same `battle_submit_action` flow. RT hotbar vs TB film are both live by design but share no single damage model with client `combat.ts`. |
| **Recommendation** | Keep `CombatManager` (RT) + `EncounterManager`/`TurnBattleOverlay` (TB). Delete `BattleOverlay.tsx`. Archive or delete Pixi scene + `battle-engine.ts` after confirming no imports. Fold type charts into one shared module. Treat `combat.ts` as lobby-equipment leftover or migrate to shared combat stats. |

### 3. Dual party managers (live server vs dead client)

| | |
|---|---|
| **Severity** | CRITICAL (client opens wrong socket to `:3001`) |
| **Paths** | Live: `...\server\PartyManager.ts` (wired in `server.ts`). Dead/parallel: `...\game\party-manager.ts` (hardcodes `io('http://localhost:3001')`), still imported from `...\messenger\friends-list.tsx`. UI: `PartyOverlay` live; `PartyUI.tsx` unreferenced. |
| **Overlap** | Two party protocols; friends-list can spawn a second Socket.io client that never hits the real server. |
| **Recommendation** | Delete `src/game/party-manager.ts`. Wire friends-list invites through lobby `emitSocketEvent` / RealtimeService. Delete unused `PartyUI.tsx` or merge into `PartyOverlay`. |

### 4. Triple+ creature / dex catalogs

| | |
|---|---|
| **Severity** | CRITICAL (authoritative data ambiguity) |
| **Paths** | Canonical path: `...\shared\game\creatureCatalog.ts` + `...\server\creatureDefs.ts` (Prisma `CreatureDef`). Parallel JSON: `...\game\CreatureDb.ts` → `public/data/creature_db.json` (still used by `GameCanvasBabylon` `resolveEncounter`). Static dexes: `...\data\saints-dex.ts` (SAINTS_DEX), `...\data\dex.ts` (DAEMON_DEX), `...\data\creature-dex.ts` (15-type Prisma helper + TYPE_CHART). Deprecated: `...\shared\game\testCreature.ts`. |
| **Overlap** | Encounters, dex UI, combat stats, and sprites can resolve from different sources with incompatible element systems (8 vs 15 type). |
| **Recommendation** | Keep `creatureCatalog` + `creatureDefs` + DB. Stop client encounter rolls via `CreatureDb` (server `EncounterManager` should own). Delete or re-export `saints-dex`/`dex.ts` as thin adapters. Merge `creature-dex` type chart into shared combat module. |

### 5. Dual class / game-config systems

| | |
|---|---|
| **Severity** | HIGH |
| **Paths** | Canonical: `...\shared\game\classCatalog.ts`, `...\server\classDefs.ts`, `app\actions\character-classes.ts`, Studio `ClassEditorPanel`. Parallel Phase-5: `...\game\CharacterClassSystem.ts`, `...\game\GameConfigManager.ts`, DevTools `ClassEditor.tsx` + `GameConfigEditor.tsx`. **Duplicated** `ensureDefaultGameConfig` in both `classDefs.ts` and `character-classes.ts`. |
| **Overlap** | Two class editors / config managers against the same conceptual GameConfig/CharacterClass tables. |
| **Recommendation** | Keep shared catalog + server actions + `ClassEditorPanel`. Delete or thin-wrap `CharacterClassSystem`/`GameConfigManager`/`ClassEditor` into the panel path. Deduplicate `ensureDefaultGameConfig` into one module. |

### 6. Dual map loaders (client `maps.ts` vs server `map-loader.js`)

| | |
|---|---|
| **Severity** | HIGH |
| **Paths** | Client: `...\the-lobby\data\maps.ts` (+ `map-index.ts`, `campaign-maps.ts`). Server: `...\engine\map-loader.js` required by `WorldManager`, `InventoryManager`, `DemoBootstrap`. |
| **Overlap** | Two loaders for the same `/api/maps` / DB maps; schema drift risk (gates shapes, tilesets, shards). |
| **Recommendation** | Extract shared `loadMapData` into `src/shared/game/` (or keep one TS module used by both). Retire `.js` map-loader after port. Keep `map-index` as thin UI helper (not a second source of truth). |

### 7. Dual Socket.io client connections (site realtime vs lobby game)

| | |
|---|---|
| **Severity** | MEDIUM (intentional split, but double connections) / HIGH if party-manager :3001 is counted |
| **Paths** | Site: `...\realtime\RealtimeProvider.tsx` + `useRealtimeStore.ts` + `...\server\realtime\RealtimeService.ts`. Game: lobby opens its own `io()` (see ignored `index.tsx`). Emit helpers: `...\web\lib\realtime-emit.ts`. |
| **Overlap** | Authenticated users on lobby/studio may hold two sockets to the same server process. |
| **Recommendation** | Document as intentional dual channels for now; long-term multiplex game + site events on one connection with namespaces/rooms. Remove any third client (`party-manager`). |

### 8. Inventory / economy mutation fan-out

| | |
|---|---|
| **Severity** | CRITICAL |
| **Paths** | `InventoryManager.ts`, `ShopManager.ts` (`addItem`), `DialogueManager.ts` (`addItems`), `EconomyManager.ts`, `CraftingManager.ts`, `EncounterManager.ts` (capture costs/rewards), `PersistenceManager.modifyInventory`, stub `PlayerManager.addItem` (always `false`), client `items.ts` + store `modifyInventory`. |
| **Overlap** | Same `playerInventoryItem` CRUD copy-pasted; persistence interface unused/stubbed relative to live managers. |
| **Recommendation** | Single `InventoryService` used by all managers. Make `PlayerManager.addItem` delegate or delete stubs. Keep client `items.ts` as presentation catalog only. |

### 9. Prisma: shared singleton vs many ad-hoc `new PrismaClient()`

| | |
|---|---|
| **Severity** | HIGH |
| **Paths** | Singleton: `...\web\lib\prisma.ts`. Extra clients in: `DialogueManager`, `PersistenceManager`, `ShopManager`, `QuestManager`, `SkillManager`, `classDefs`, `creatureDefs`, `GameConfigManager`, plus most `scripts/*` and `prisma/seed.ts`. |
| **Overlap** | Multiple connection pools against SQLite/Postgres in one Node process (server.ts loads several managers). |
| **Recommendation** | Server managers must import `@/web/lib/prisma`. Scripts may keep ephemeral clients. |

### 10. Dual auth login UIs (site vs game)

| | |
|---|---|
| **Severity** | MEDIUM |
| **Paths** | Site: `...\auth\login-form.tsx`, `register-form.tsx`, `auth.ts`, `auth.config.ts`. Game: `...\the-lobby\GameLogin.tsx`. Both call `signIn('credentials')`. |
| **Overlap** | Duplicate validation/UX; game form skips shared `loginSchema`. |
| **Recommendation** | Extract shared credentials submit helper; keep two skins. One NextAuth pipeline is correct (not a duplicate auth backend). |

### 11. Dual HUD orb implementations

| | |
|---|---|
| **Severity** | MEDIUM |
| **Paths** | Live: `...\hud\SaintsHudOrbs.tsx`. Orphan: `...\hud\JagexHudOrbs.tsx` (no importers). |
| **Recommendation** | Delete `JagexHudOrbs.tsx`. |

### 12. Dual health-bar rendering

| | |
|---|---|
| **Severity** | MEDIUM |
| **Paths** | Babylon mesh bars: `BabylonEngine.renderHealthBar`. React DOM bars: `...\babylon\FloatingHealthBar.tsx` (mounted from `GameCanvasBabylon`). |
| **Overlap** | Two HP visualization pipelines for world entities. |
| **Recommendation** | Pick one (prefer React overlay or engine meshes, not both). |

### 13. Dual / overlapping forum API routes

| | |
|---|---|
| **Severity** | HIGH |
| **Paths** | Create reply: `app\api\forum\reply\route.ts` vs `...\replies\route.ts`. Create thread: `...\thread\route.ts` vs `...\threads\route.ts`. Singular routes sanitize HTML; plural routes enforce `canPostToForum`/PIN/XP/achievements. |
| **Overlap** | Clients can bypass moderation rules by hitting the weaker route. |
| **Recommendation** | Keep one create path per resource (prefer plural + access checks); redirect or delete singular duplicates. |

### 14. Dual server-status APIs

| | |
|---|---|
| **Severity** | MEDIUM |
| **Paths** | MMO: `app\api\game\server-status\route.ts` (+ early handle in `server.ts`). Community/GameDig: `app\api\servers\status\route.ts`. FiveM: `app\api\fivem\status\route.ts`. |
| **Overlap** | Naming collision for “server status”; different products. |
| **Recommendation** | Not true duplicates — rename for clarity (`/api/mmo/status`, `/api/tracked-servers`, `/api/fivem/status`). |

### 15. Dual achievement systems

| | |
|---|---|
| **Severity** | MEDIUM |
| **Paths** | Site/DB: `...\web\lib\achievements.ts` + `achievements-catalog`. Lobby local: `...\the-lobby\data\achievements.ts` (console.log only). Showcase: `...\achievements\achievement-showcase.tsx` vs `achievements-overlay.tsx`. |
| **Recommendation** | Delete lobby `data/achievements.ts` or wire it to DB awards. |

### 16. Dual chat surfaces (intentional + partial merge)

| | |
|---|---|
| **Severity** | LOW–MEDIUM |
| **Paths** | Game chat: `...\chat\GameChat.tsx` (socket `chat_message`). Messenger DM: `...\messenger\*` + `app\actions\messenger.ts`. GameChat already embeds FriendsList/ChatWindow. |
| **Recommendation** | Keep separation (in-world vs E2EE DM). Avoid a third chat stack. |

### 17. Dual audio systems

| | |
|---|---|
| **Severity** | MEDIUM |
| **Paths** | Live SFX: `...\engine\sound-synth.ts` (Web Audio, used by canvas). Unused Howler module: `...\the-lobby\audio.ts` (`playTownBgm` etc., no importers). Dep `howler` in package.json. |
| **Recommendation** | Delete unused `audio.ts` or adopt it and drop synth; remove unused howler if unused. |

### 18. Dead / leftover modules

| Item | Severity | Paths | Recommendation |
|---|---|---|---|
| Legacy standalone game server | HIGH leftover | `...\legacy\game-server.js` (requires missing `./lib/game/map-loader`) | Delete or move to archive; superseded by `server.ts` |
| `EntityManager` | LOW | `...\server\EntityManager.ts` — zero importers | Delete or wire into PlayerManager |
| `useStore` sidebar zustand | LOW | `...\web\lib\store.ts` — zero importers | Delete |
| `dex-overlay.tsx` | LOW | unused (SaintsDexOverlay is live) | Delete |
| `PartyUI.tsx` | LOW | unused | Delete |
| `easystarjs` | LOW | in package.json, zero imports; custom `pathfinding.ts` used | Remove dep |
| `dompurify`, `rehype-sanitize` | LOW | deps with zero src imports; forum uses `sanitize-html` | Remove unused deps or use one sanitizer |
| `xml2js` + `fast-xml-parser` | LOW | scripts only (tileset vs tuxemon import) | Standardize on one XML parser in scripts |
| Generated sprite lists | LOW | `data\sprites.ts` vs `data\generated-assets.ts` | Generate one list from AssetManager/API |
| Client quest static DB | MEDIUM | `data\quests.ts` QUEST_DB vs server `demoQuests`/`spyderQuests`/`saintsTrailQuests` + DB templates | Prefer server/DB as source; client cache only |
| Deprecated dpad re-export | LOW | `dpad.tsx` → MobileControls | OK thin shim; delete when imports gone |
| Dual UI-edit flags | LOW | `isUiEditMode` + `isEditingInterface` in store | Already aliased; drop deprecated name |

### 19. Dual seed / bootstrap pipelines

| | |
|---|---|
| **Severity** | MEDIUM |
| **Paths** | Runtime: `DemoBootstrap.ts` + `demoMapSeed.ts` on server start. Prisma: `prisma/seed.ts`. Many `scripts/seed-*.ts`, `ensure-*.ts`, tuxemon import scripts. Data dirs: `tuxemon-data/` (tilesets XML) vs `tuxemon-db/` (YAML content). |
| **Overlap** | Multiple ways to populate creatures/maps/quests; order dependency (“run server once for DemoBootstrap”). |
| **Recommendation** | Document one bootstrap DAG. Keep tuxemon-data vs tuxemon-db as distinct inputs (tiles vs content — not duplicates). Collapse overlapping ensure/seed scripts where possible. |

### 20. Dual upload UI components

| | |
|---|---|
| **Severity** | LOW |
| **Paths** | `...\admin\image-upload.tsx` vs `image-upload-button.tsx`; both should go through `...\web\lib\upload.ts` (good single backend). |
| **Recommendation** | Merge UI wrappers; keep `upload.ts` as sole I/O. |

### 21. Dual moderation surfaces

| | |
|---|---|
| **Severity** | LOW (domain split) |
| **Paths** | Forum reports: `app\api\forum\report\*`, UCP reports page. Social: `app\actions\social\moderation.ts`. Game staff: `StaffFloatingMenu`. |
| **Recommendation** | Intentional by domain; share permission helpers only. |

### 22. XP systems (site vs game skills)

| | |
|---|---|
| **Severity** | LOW (intentional) |
| **Paths** | Forum/site: `...\web\lib\xp.ts`. Game skills: `...\shared\game\combatSkillXp.ts` + store `gainSkillXp`. |
| **Recommendation** | Keep separate; rename site XP to `forumXp` if confusion persists. |

### 23. Base UI: Base UI + Radix Slot

| | |
|---|---|
| **Severity** | LOW |
| **Paths** | Most `shared/ui/*` use `@base-ui/react`; `button.tsx` also imports `@radix-ui/react-slot`. |
| **Recommendation** | Prefer Base UI Slot if available; otherwise fine as shadcn leftover. |

---

## Intentional dual systems (NOT duplicates)

1. **Lobby (`/lobby`) vs Studio (`/studio`)** — shared shell, different mode/permissions/map policy (`studioSession`, PlayerClient vs StudioClient).  
2. **Client `BabylonEngine` vs server `GameEngine`** — render vs authoritative simulation.  
3. **Client `WorldSimulation` prediction vs server `WorldManager`** — prediction + authority.  
4. **RT combat vs turn-based encounters** — two combat modes by design (consolidate *implementations*, not the modes).  
5. **Site RealtimeProvider vs lobby game socket** — different event domains (presence/forum/DM vs MMO).  
6. **FiveM UCP vs browser MMO** — separate products sharing auth/DB.  
7. **`useGameStore` vs `useEditorStore` vs `useRealtimeStore`** — distinct domains (overlap only where gameMode/editor flags cross).  
8. **Local disk uploads vs optional S3** — feature flag failover, not parallel products.

---

## Priority consolidation order

1. Kill dead party client (`party-manager` :3001) and unused battle overlays.  
2. Single creature authority (`creatureCatalog`/DB); retire `CreatureDb` JSON + static dex forks.  
3. Centralize inventory mutations.  
4. Unify Prisma client on server managers.  
5. Collapse forum create-thread/reply route pairs.  
6. Merge class/config editor dual stack; shared map loader.  
7. Dependency cleanup: easystarjs, unused sanitizers, pixi (if battle scene gone), howler (if audio.ts gone), legacy/game-server.js.

---

## Implementation contract (2026-08-04)

**Studio:** paused for this program — no studio feature work mixed into strip commits.

**Baseline:** `npm test` 189/189 pass; `npm run lint` clean (2026-08-04).

**KEEP (intentional duals / best path):**
- RT overworld: `CombatManager` + hotbar + `combatAbilities`
- TB wild: `EncounterManager` + `TurnBattleOverlay` only
- Party: server `PartyManager` + `party-overlay`
- Creatures: `creatureCatalog` + `creatureDefs` / DB
- Classes: `classCatalog` + `classDefs` + Studio `ClassEditorPanel`
- Inventory: single writer via `InventoryManager` (Phase 3)
- Prisma: `web/lib/prisma` singleton on live server managers
- Forum creates: plural routes with access checks
- Process: `server.ts` (not legacy game-server)

**STRIP (ghosts / worse forks):** see Phase 1–5 in plan `duplicate_systems_strip`.

### Implementation status (2026-08-04 evening)

All phases executed. Final verify: `npm test` **191/191** pass; lint clean.

Kept: RT `CombatManager` + TB `EncounterManager`/`TurnBattleOverlay`, `PartyManager`+`party-overlay`, `creatureCatalog`+DB, `ClassEditorPanel`+`classDefs`, `inventoryService`, plural forum creates, `server.ts`.

Stripped: party :3001 client, Pixi/BattleOverlay/battle-engine, Phase-5 class/config stack, CreatureDb/static dex forks, weak forum singular creates, orphan HUD/UI, unused deps, lobby achievements stub.

---

## Post-strip re-audit (2026-08-04 evening)

**Verdict: no further destructive strip needed at the same degree.** CRITICAL ghost duals are gone (on-disk confirmed).

### CRITICAL remaining
None.

### HIGH remaining (consolidation, not ghost-kill)
1. **Dual map loaders** — client `the-lobby/data/maps.ts` vs server `engine/map-loader.js` (WorldManager / InventoryManager / DemoBootstrap). Same maps, two parsers/caches.
2. **InventoryService incomplete** — still raw `playerInventoryItem` CRUD in: EconomyManager GTC purchase (tx), `app/actions/gtc.ts`, CraftingManager affix/durability outputs, InventoryManager tool durability wear.

### MEDIUM
- `app/api/game/server-status` still probes `localhost:3001` / `game-server:3001` (dead process leftover)
- Client `QUEST_DB` / `SAINTS_TAMER_QUESTS` vs server/DB quests
- Orphans: `WorldMapNavigator.tsx`, `rpg-stats-overlay.tsx` (zero importers); `generated-assets.ts` unused vs live `sprites.ts`
- `demoQuests.ts` thin re-export shim; `dpad.tsx` unused shim
- PlayerManager `hasItem` / credit stubs always false
- Studio deprecated dual flags (`isUiEditMode` / `isEditingInterface`)

### LOW
- Dead `BabylonEngine.renderHealthBar` method (React FloatingHealthBars is live)
- Dual upload UI wrappers (shared `upload.ts` backend OK)
- Stale docs/scripts naming stripped modules (`refactor.js`, `migrate-imports.js`, PROJECT_REPORT)

### Suggested next work (only if desired)
Consolidation cleanup — shared map loader, finish inventoryService (+ tx helpers for GTC), drop :3001 status probes, delete orphan UIs. **Not** another ghost-strip. Resume studio when ready.

---

## Follow-up landed (2026-08-04 evening)

**Lobby multiplayer map:** `/lobby` joins always force `DEMO_SANDBOX` (`lobby: true` on `join_map`); server remaps; off-DEMO gate warps blocked in lobby.

**InventoryService gaps filled:** tx-aware add/remove; GTC actions + EconomyManager purchase; `addItemWithMeta` (craft); `wearToolDurability` (gather).

---

## Post-strip verification (2026-08-04 evening re-audit)

**Method:** On-disk `Test-Path` (not Grep/Glob alone — Cursor index still surfaces deleted blobs) + Grep of live `src/`/`app/`/`package.json`.

### Confirmed gone on disk
`src/game/*` empty (party-manager, battle-engine, CreatureDb, CharacterClassSystem, GameConfigManager deleted); EntityManager; BattleOverlay/CreatureBattleScene/PartyUI/audio/dex-overlay/JagexHudOrbs; ClassEditor/GameConfigEditor; store.ts useStore; creature_db.json; testCreature; dex.ts/creature-dex; legacy/game-server.js; forum singular thread/reply routes; lobby achievements stub. `package.json` has no pixi/howler/easystar.

### Still open (not same-degree CRITICAL strip)
| Area | Severity | Status |
|---|---|---|
| Dual map loaders `maps.ts` vs `map-loader.js` | HIGH | Both live |
| InventoryService gaps (GTC purchase + craft affixes + tool durability + `app/actions/gtc.ts`) | HIGH→MEDIUM | Partial fan-out remains |
| `map-loader.js` own Prisma via `globalThis` | MEDIUM | Not shared import |
| Client `QUEST_DB` + static seeds vs server DB | MEDIUM | Hydrates from API but keeps static defaults |
| `:3001` probes in `server-status` | MEDIUM | Dead legacy probes; falls through |
| Orphans: `WorldMapNavigator`, `rpg-stats-overlay`, `generated-assets.ts`, `demoQuests` re-export, `dpad` shim | LOW–MEDIUM | Delete/wire |
| Dual health: live React bars; dead `renderHealthBar` method | LOW | Not dual-live |
| `isUiEditMode` deprecated alias | LOW | Shim |
| Dual upload UIs | LOW | Shared `upload.ts` backend |
| Dual DraggablePanel (lobby vs editor) | LOW | Domain split |

### Verdict
**No further destructive strip at the same degree as Phase 1–5.** Next work is consolidation (map loader, inventoryService completion, orphan cleanup), not ghost deletion.
