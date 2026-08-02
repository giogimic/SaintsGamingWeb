# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

---

## Current Focus

**Game Foundation Systems (PR #4) — post-battle + TMX densify**

Progress: [`info/game/GAME_FOUNDATION_SYSTEMS.md`](./game/GAME_FOUNDATION_SYSTEMS.md)  
Smoke: [`info/game/SPYDER_SMOKE.md`](./game/SPYDER_SMOKE.md)

### Just shipped

- Carlos **post-win / post-lose** dialogue after trainer TB (rematch options)
- Trainer lose soft-heals party for rematch
- TMX NPC import mirrors `SPYDER_COTTON_*` → playable `COTTON_*` (walkable only)
- Cotton plaza densified from Tuxemon create_npc (14 NPCs)

### Suggested next

1. Human smoke Q1–Q6 + Carlos rematch dialogue
2. Multi-monster trainer parties
3. Azure TMX NPC densify (azure_town.tmx has no create_npc in upstream)

### Pipeline

```bash
npm run ensure:campaign
npm run seed:campaign-npcs
# optional densify:
#   git clone --filter=blob:none --sparse --depth 1 https://github.com/Tuxemon/Tuxemon.git /tmp/Tuxemon
#   cd /tmp/Tuxemon && git sparse-checkout set mods/tuxemon/maps
#   TUXEMON_PATH=/tmp/Tuxemon npm run import:map-npcs -- --map cotton
#   npm run seed:campaign-npcs
npm run smoke:spyder
npm run dev
```

---

## Mandatory Read Order

1. **This file**
2. `info/game/GAME_FOUNDATION_SYSTEMS.md`
3. `info/game/SPYDER_SMOKE.md`
4. `info/game/CLASS_SKILLS_SHINY.md`
