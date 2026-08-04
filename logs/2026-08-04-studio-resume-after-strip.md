# Studio resume after duplicate strip (2026-08-04)

**Status:** Ready to continue Studio work. Strip pause is lifted.

**Read with:** `info/CONTINUE.md` · `logs/studio-first-hybrid-foundation.md` · `logs/2026-08-04-duplicate-systems-audit.md`

---

## What happened while Studio was paused

A destructive duplicate-systems strip ran (keep best paths, delete ghosts). Studio feature work was intentionally not advanced. Shared shell files (`the-lobby/index.tsx`, canvas, class panels) were touched only where the strip required it.

Tests after strip + follow-ups: **191 pass**, lint clean.

---

## Contracts Studio must respect (do not regress)

### 1. Lobby vs Studio map policy (NEW / tightened)

| Route | Map join behavior |
| :--- | :--- |
| **`/lobby`** | Always multiplayer map **`DEMO_SANDBOX`**. `join_map` sends `lobby: true`. Server forces `DEMO_MAP_ID`. Off-DEMO gate warps blocked. |
| **`/studio`** | Keeps character/author map (except retired `SAINTS_VILLAGE` → DEMO). `join_map` sends `lobby: false` / omits force. Gate warps allowed. |

- Client: `index.tsx` (`enableStudio`), `GameCanvasBabylon.tsx` (`getIsEditorMode()`)
- Server: `PlayerManager.resolvePlayableMapId(..., { lobby })` when `data.lobby === true`

**Do not** force DEMO on Studio joins. **Do not** remove `lobby: true` from lobby-only emits.

### 2. Combat (intentional dual — not duplicates)

- **RT overworld:** `CombatManager` + hotbar
- **TB wild:** `EncounterManager` + `TurnBattleOverlay` only

Deleted ghosts: `BattleOverlay`, `CreatureBattleScene`, Pixi `battle-engine`. Do not remount them.

### 3. Creatures

- Authority: `src/shared/game/creatureCatalog.ts` + Prisma `CreatureDef` via `creatureDefs.ts`
- Lobby UI adapter only: `the-lobby/data/saints-dex.ts` (maps catalog → presentation shape)
- Type chart helpers: `src/shared/game/elementMatchups.ts`
- Gone: `CreatureDb`, `creature_db.json`, `creature-dex.ts`, `dex.ts` / DAEMON_DEX

Studio creature editor = `CreatureDefEditorPanel` + catalog/actions — keep using catalog, not static dex forks.

### 4. Classes / config

- Keep: `classCatalog` + `classDefs` + **`ClassEditorPanel`** + `app/actions/character-classes.ts`
- Single `ensureDefaultGameConfig` in `src/server/classDefs.ts` (actions import it)
- Gone: `CharacterClassSystem`, `GameConfigManager`, DevTools `ClassEditor` / `GameConfigEditor`
- DevTools “Class Registry” tab now mounts **`ClassEditorPanel`**
- `SpriteBrowser` uses local `SpriteClassFilter` (no CharacterClassSystem)

### 5. Inventory

- All server mutations should go through **`src/server/inventoryService.ts`**
  - `addItem` / `removeItem` / `inventorySnapshot` (optional Prisma tx client)
  - `addItemWithMeta` (craft durability/affixes)
  - `wearToolDurability` (gather tools)
- Wired: Shop, Dialogue, Encounter loot/film, Crafting, Economy GTC, `app/actions/gtc.ts`, Persistence, PlayerManager add/remove

### 6. Party

- Live: server `PartyManager` + `party-overlay`
- Friends-list invites: lobby `emitSocketEvent('party_invite', username)` — not deleted `:3001` client

### 7. Prisma

- Live managers use `@/web/lib/prisma` singleton
- `map-loader.js` reuses `globalThis.prisma` when present

---

## Studio paths still valid

- Avatar-free author: `enterStudioAuthorSession` (default DEMO, World Builder can warp)
- Paint / Playtest / Catalog docks unchanged in role
- `ClassEditorPanel` / `CreatureDefEditorPanel` / `QuestEditorPanel` / `DialogueEditorPanel` via CatalogEditorShell
- `setEditorMode(enableStudio)` + creation/playtest gates in `studioSession.ts`

---

## Suggested next Studio session

1. Warm `/studio` once after `npm run dev` (cold compile can be slow).
2. Confirm author session → Paint brush → Save Map still works on DEMO (tileset bootstrap).
3. Warp via World Builder to a rich map; confirm paint state survives remap (`setCurrentMapId` / base-id compare still applies).
4. Open Catalog → Classes / Creatures — edit via panels (not deleted DevTools editors).
5. Resume whatever paint/permission/UX item was mid-flight before the strip pause.

Uncommitted strip work is still local (large diff). Commit when the human asks — do not mix a huge strip commit with a tiny Studio paint fix unless requested.

---

## Quick “don’t reinvent” table

| Need | Use |
| :--- | :--- |
| Creature def / sprite URL | `creatureCatalog` / `creatureDefs` |
| Class edit UI | `ClassEditorPanel` |
| Inventory grant/consume | `inventoryService` |
| Lobby MP map | Always `DEMO_SANDBOX` + `lobby: true` |
| Studio map | Character/author map; no lobby force |
| TB battle UI | `TurnBattleOverlay` only |
| Party invite | Game socket `party_invite` |
