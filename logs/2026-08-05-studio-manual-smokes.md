# Studio / Lobby — Manual smoke pass (P10)

**Date:** 2026-08-05  
**Branch:** `giogimic/studio-manual-smokes-2d3d`

## Goal

Verify (fix only if broken):

1. `/studio` Create → paint → Save → reload  
2. Two `/lobby` accounts on the same `DEMO_SANDBOX_chN`

## Results

| Check | Result | How |
| :--- | :--- | :--- |
| Unit: map create + save validation | **PASS** (40 related tests across 6 files) | `vitest` studioMapCreate / mapSaveValidation / mapIds / joinMapId / lobbyReconnect / mapSwitch |
| DEMO_SANDBOX visuals | **PASS** | `GET /api/maps/DEMO_SANDBOX` → 5 tilesets, Ground GID 17 × 900 |
| Create → Save → reload (API) | **PASS** | `scripts/smoke-studio-map-save.ts` → Admin session POST `TEST_P10_*` → GET reload GID17 + tilesets |
| Two-client same shard + peers | **PASS** | `scripts/smoke-lobby-mp.ts` → both `DEMO_SANDBOX_ch1`; B `map_players` has A; A `player_joined` name `SmokeB` |

No hotfix required.

## Scripts added

- `scripts/smoke-studio-map-save.ts` — Auth.js credentials + map POST/GET  
- `scripts/smoke-lobby-mp.ts` — two sockets via dev bypass `auth.token = userId`

```bash
npm run dev
npx tsx scripts/smoke-studio-map-save.ts
npx tsx scripts/smoke-lobby-mp.ts
```

## Still manual (UI-only)

- In-browser brush paint + Save Map toast (API path covers persist/reload contract)  
- Visual peer sprites / chat bubbles (socket peer events covered)

## Out of scope

Party invite / TB creature swap (P12).
