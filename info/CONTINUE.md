# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-04 (Studio resume after duplicate strip)  
**Point every new session at this file first.**

---

## Current Focus

**Resume Studio / game-engine editor work.** Strip pause is lifted.

Before coding Studio, read:

1. **This file**
2. **`logs/2026-08-04-studio-resume-after-strip.md`** — contracts from the duplicate strip (lobby vs Studio maps, catalogs, inventory, classes)
3. `logs/studio-first-hybrid-foundation.md`
4. Trail/Spyder smokes as needed

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

**Checkpoint:** Playtest joins `studio_pie_{userId}`; Studio author uses private map instance (not lobby DEMO_chN).

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
