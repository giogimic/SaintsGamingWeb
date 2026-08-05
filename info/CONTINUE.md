# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-05 (P0–P7 on main; author overlays next)  
**Point every new session at this file first.**

---

## Current Focus

**Game / Studio / lobby only** — do not prioritize marketing site, forum, UCP, Discord, FiveM.

One PR → merge to `main` → then next:

1. **Done on main:** #28–#32 (product gaps → … → NPC live spawn)  
2. **In flight:** Warp/spawn author overlays — `logs/2026-08-05-studio-author-overlays.md`  
3. **Queued:** NPC edit/delete/despawn · manual smokes · definition undo Creature/Dialogue · player stubs

| Priority | Issue | Status |
| :--- | :--- | :--- |
| **P0–P7** | Depth → NPC live spawn | **On main** (#28–#32) |
| **P8** | Warp/spawn author overlays | **This branch** |

Strip pause remains lifted. Editor foundation Phase 1–2f is on `main` — do not rebuild it.

Before coding, read:

1. **This file**
2. **`logs/2026-08-05-studio-game-priority-plan.md`**
3. Latest P0/P1/P2 impl logs under `logs/2026-08-05-studio-*`
4. **`logs/2026-08-04-studio-resume-after-strip.md`** — lobby vs Studio map contracts
5. `logs/studio-first-hybrid-foundation.md`
6. Trail/Spyder smokes as needed

**Do not** reintroduce deleted ghosts (Pixi battle, Phase-5 ClassEditor/GameConfigManager, CreatureDb, `:3001` party client, dual TB overlays).

---

## Strip follow-ups already landed (adapt to these)

| Area | Behavior |
| :--- | :--- |
| `/lobby` map | Always **`DEMO_SANDBOX`** + `join_map.lobby: true` (multiplayer shard) |
| `/studio` map | Author/character map preserved; `lobby: false`; off-DEMO warps OK |
| Creatures | `creatureCatalog` + DB; `saints-dex` is UI adapter only |
| Classes | **`ClassEditorPanel` only** (DevTools tab uses it too) |
| Inventory | Server writes via **`src/server/inventoryService.ts`** |
| Combat | Keep RT + TB modes; TB UI = `TurnBattleOverlay` only |

Full audit: `logs/2026-08-04-duplicate-systems-audit.md`

---

## Studio foundation (unchanged goals)

**Game engine editor** — Phase 1–**2f** on `main` (catalogs, author session, **PIE private shard**). See `logs/studio-first-hybrid-foundation.md` · `logs/2026-08-04-studio-pie-shard.md`.

**Just fixed:** Lobby was stuck in Studio create-mode (`isDevEditorOpen={isCreationMode}`). Play is gated with `studioToolsOpen = enableStudio && isCreationMode` only. See `logs/2026-08-04-lobby-studio-walk-fix.md`.

**World profiles + Saints Trail + Viewfinder UI (on `main`)**

- Profiles: Tuxemon / Custom 1 / Custom 2 (+ blank / Clone Trail)
- Custom 1 = Saints Trail on `DEMO_SANDBOX` (editable quests + dialogue)
- Spyder showcase remains on **Tuxemon** (Q1–Q12)
- Interface Editor Viewfinder Edit Mode shipped (#8)

Progress log: `logs/STUDIO_PHASES_3_7.md` (local)  
Trail smoke: [`info/game/SAINTS_TRAIL_SMOKE.md`](./game/SAINTS_TRAIL_SMOKE.md)  
Spyder smoke: [`info/game/SPYDER_SMOKE.md`](./game/SPYDER_SMOKE.md)

### First checks this session

```bash
npm run dev
# warm cold compile once
curl --max-time 120 http://localhost:3000/studio
# Paint: tools on → brush → ground → Save Map
# Warp via World Builder; confirm lobby still sticks to DEMO_SANDBOX
```

### Pipeline (when reseeding)

```bash
npx prisma db push
npm run ensure:world-profiles && npm run ensure:starter-heroes
FORCE_TRAIL_SEED=1 npm run seed:saints-trail
FORCE_QUEST_SEED=1 npm run seed:campaign-npcs
SMOKE_CLONE_SLUG=custom_2 npm run smoke:saints-trail
npm run smoke:saints-trail:play
npm run visual:saints-trail   # needs npm run dev
npm run smoke:spyder
```

### Back-line (do not prioritize)

| Area | Why |
| :--- | :--- |
| **UCP** (`/ucp/*`) | Uncertain if we ship it; needs a planned FiveM plugin first — likely much later |
| Discord bot bridge | Ecosystem nice-to-have |
| FiveM bridges / UCP depth | Same lane as UCP — wait for plugin design |
| S3/CDN as default | Optional path exists; local uploads fine |
| Heavy AI | Forum enhance exists; don’t expand |
| Dual map-loader merge | Maintenance only; not blocking Studio |

---

## Mandatory Read Order

1. **This file**
2. `logs/2026-08-04-studio-resume-after-strip.md`
3. `info/game/SAINTS_TRAIL_SMOKE.md` (Custom 1) and/or `info/game/SPYDER_SMOKE.md` (Tuxemon)
4. `info/game/GAME_FOUNDATION_SYSTEMS.md`
5. `info/game/CLASS_SKILLS_SHINY.md`
