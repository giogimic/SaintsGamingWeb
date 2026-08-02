# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

---

## Current Focus

**Studio world profiles + Saints Trail (PR #6 / #7)**

- Profiles: Tuxemon / Custom 1 / Custom 2 (+ blank / Clone Trail)
- Custom 1 = Saints Trail on `DEMO_SANDBOX` (editable quests + dialogue)
- Spyder showcase remains on **Tuxemon** (Q1–Q12)

Progress log: `logs/STUDIO_PHASES_3_7.md` (local)  
Trail smoke: [`info/game/SAINTS_TRAIL_SMOKE.md`](./game/SAINTS_TRAIL_SMOKE.md)  
Spyder smoke: [`info/game/SPYDER_SMOKE.md`](./game/SPYDER_SMOKE.md)

### Just shipped

- Phases 1–7: quests dock, world profiles, Saints Trail, Talk dock, catalog scope, Spyder Q12, gather
- Clone Trail → Custom 2 (namespaced)
- Playthrough fixes (tools ≠ Q6 accept; DB dialogue; real sprites)
- Lobby World picker (localStorage) + dialogue cache freshness

### Suggested next

1. Human smoke Custom 1 Trail greeter → gather
2. Optional: scope Classes panel by world profile (still shared under `saints`)
3. Merge PR stack: visual-browser → world-profiles (#6) → phases 3–7 (#7)

### Pipeline

```bash
npx prisma db push
npm run ensure:world-profiles && npm run ensure:starter-heroes
FORCE_TRAIL_SEED=1 npm run seed:saints-trail
FORCE_QUEST_SEED=1 npm run seed:campaign-npcs
SMOKE_CLONE_SLUG=custom_2 npm run smoke:saints-trail
npm run smoke:spyder
npm run dev
```

---

## Mandatory Read Order

1. **This file**
2. `info/game/SAINTS_TRAIL_SMOKE.md` (Custom 1) and/or `info/game/SPYDER_SMOKE.md` (Tuxemon)
3. `info/game/GAME_FOUNDATION_SYSTEMS.md`
4. `info/game/CLASS_SKILLS_SHINY.md`
