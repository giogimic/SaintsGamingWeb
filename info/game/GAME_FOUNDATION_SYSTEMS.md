# Game Foundation Systems — Progress Log

**Branch:** `giogimic/game-foundation-systems-fae4`  
**PR:** https://github.com/giogimic/SaintsGamingWeb/pull/4  
**Updated:** 2026-08-02 (Q5 + smoke:spyder)

## Done

- Classes / shinies / Tuxemon import / campaign maps
- Spyder on-ramp Q1–**Q5** (welcome → townsfolk → capture → Cotton arrive → locals)
- Warps, corridors, Guide state, Budaye+film, accountId sync
- Offline smoke: `npm run smoke:spyder`

## Pipeline

```bash
npm run ensure:campaign && npm run seed:campaign-npcs
npm run smoke:spyder
npm run dev
```

Smoke: [`SPYDER_SMOKE.md`](./SPYDER_SMOKE.md)
