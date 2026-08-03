# CONTINUE HERE — Dev Handoff

**Last updated:** 2026-08-02  
**Point every new session at this file first.**

---

## Current Focus

**v2.1.119 — Demo bones hardened for local/dev smoke**

Smoke checklist: [`info/game/DEMO_SMOKE.md`](./game/DEMO_SMOKE.md)

**On your running dev server:** pull this branch, restart `npm run dev` (bootstrap must re-seed map/tiles), then walk `DEMO_SMOKE.md`.

Shipped:
- Walkable `DEMO_SANDBOX` + Q1–Q4 + Vance + film + lab + bramble
- Client tile sync / creature_moved / lobby demo entry / lab party hydrate
- Shop + bramble visible props

Bible: [`info/gameplay-bible/README.md`](./gameplay-bible/README.md)

### Suggested next (after human smoke)

1. File gaps from `DEMO_SMOKE.md` run
2. Per-character bramble flags if shards fight over shared grid — **Done 2026-08-03:** personal overlay (shared DEMO grid stays tile 11; walk/visuals per account; Q4 hydrate on join)
3. ALIGNMENT D — Studio Quest dock **done 2026-08-03** (templates list + ACCEPT_QUEST assign); optional per-dock permission matrix later
4. ALIGNMENT E — **E.1–E.3 done**; Studio asset client load improved; **CONTINUE #2 per-account bramble done 2026-08-03**; next: human `DEMO_SMOKE` / remaining Studio polish from docs

---

## Mandatory Read Order

1. **This file**
2. `info/game/DEMO_SMOKE.md`
3. `info/gameplay-bible/ALIGNMENT.md`
4. `/logs/LOCAL_CHANGELOG.md`
