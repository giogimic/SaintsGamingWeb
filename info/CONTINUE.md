# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-04  
**Point every new session at this file first.**

---

## Current Focus

**Game engine editor foundation** — Phase 1–2c on `main` (Editor/Playtest, camera, CatalogEditorShell across NPC/Creature/Quest/Loot/Dialogue/Class, avatar-hide). See `logs/studio-first-hybrid-foundation.md`.

**Studio world profiles + Saints Trail + Viewfinder UI (on `main`)**

- Profiles: Tuxemon / Custom 1 / Custom 2 (+ blank / Clone Trail)
- Custom 1 = Saints Trail on `DEMO_SANDBOX` (editable quests + dialogue)
- Spyder showcase remains on **Tuxemon** (Q1–Q12)
- Interface Editor Viewfinder Edit Mode shipped (#8)

Progress log: `logs/STUDIO_PHASES_3_7.md` (local)  
Trail smoke: [`info/game/SAINTS_TRAIL_SMOKE.md`](./game/SAINTS_TRAIL_SMOKE.md)  
Spyder smoke: [`info/game/SPYDER_SMOKE.md`](./game/SPYDER_SMOKE.md)

### Just shipped

- Phases 1–7: quests dock, world profiles, Saints Trail, Talk dock, catalog scope, Spyder Q12, gather
- Clone Trail → Custom 2 (namespaced)
- Playthrough fixes (tools ≠ Q6 accept; DB dialogue; real sprites)
- Lobby World picker (localStorage) + dialogue cache freshness
- Classes panel scoped by world **`profileId`** (null/empty = shared; GameConfig FK stays `saints`)
- Viewfinder Interface Editor (auto-close Options, floating toolbar, Escape)

### Verified
- `npm run smoke:saints-trail:play` — 21/21 greeter→gather
- `npm run visual:saints-trail` — Custom 1 → Demo Sandbox + Trail Greeter tracker
- `npm run smoke:spyder` — Spyder path incl. Q12
- `node scripts/visual-interface-editor.mjs` — Viewfinder UX

### Pipeline

```bash
npx prisma db push
npm run ensure:world-profiles && npm run ensure:starter-heroes
FORCE_TRAIL_SEED=1 npm run seed:saints-trail
FORCE_QUEST_SEED=1 npm run seed:campaign-npcs
SMOKE_CLONE_SLUG=custom_2 npm run smoke:saints-trail
npm run smoke:saints-trail:play
npm run visual:saints-trail   # needs npm run dev
npm run smoke:spyder
npm run dev
```

### Back-line (do not prioritize)

| Area | Why |
| :--- | :--- |
| **UCP** (`/ucp/*`) | Uncertain if we ship it; needs a planned FiveM plugin first — likely much later |
| Discord bot bridge | Ecosystem nice-to-have |
| FiveM bridges / UCP depth | Same lane as UCP — wait for plugin design |
| S3/CDN as default | Optional path exists; local uploads fine |
| Heavy AI | Forum enhance exists; don’t expand |

---

## Mandatory Read Order

1. **This file**
2. `info/game/SAINTS_TRAIL_SMOKE.md` (Custom 1) and/or `info/game/SPYDER_SMOKE.md` (Tuxemon)
3. `info/game/GAME_FOUNDATION_SYSTEMS.md`
4. `info/game/CLASS_SKILLS_SHINY.md`
