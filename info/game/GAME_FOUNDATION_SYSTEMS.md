# Game Foundation Systems — Progress Log

**Branch:** `giogimic/game-foundation-systems-fae4`  
**PR:** https://github.com/giogimic/SaintsGamingWeb/pull/4  
**Updated:** 2026-08-02 (Q7 + Scoop shop/nurse)

## Done

- Spyder **Q1–Q7**: Azure → Route 1 → Cotton → Tunnel (Carlos 2-foe) → Route 2 scout
- Scoop film merchant + nurse full-party heal; soft-heal client sync
- Ambient NPC densify / wall prune / dialogue stubs
- Post-Q7 tracker empty-state; Guide state-aware through Route 2
- `npm run smoke:spyder` (**145** checks)

## Pipeline

```bash
npm run ensure:campaign && npm run seed:campaign-npcs
npm run smoke:spyder
npm run dev
```

Smoke: [`SPYDER_SMOKE.md`](./SPYDER_SMOKE.md)
