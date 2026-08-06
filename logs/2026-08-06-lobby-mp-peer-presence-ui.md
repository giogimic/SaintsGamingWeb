# Lobby MP — peer presence UI + same-account seat (2026-08-06)

**Branch:** `giogimic/lobby-mp-peer-render-fix-2d3d`  
**Follow-up to:** #39 peer-wipe / base `instanceId` (socket smokes green; users still “alone”)

## What we learned

Socket smokes (`smoke-lobby-mp`, `smoke-lobby-mp-ui-storm`) still **PASS** — two different accounts share `DEMO_SANDBOX_chN` and get `player_joined` / `map_players`.

Browser “8 sprites on grass” is **not** proof of MP: DEMO_SANDBOX seeds several NPCs. Real peers had **no nameplates**, **no minimap dots**, and the HUD never showed peer count — so a second client off-camera (or mistaken for an NPC) looked like “MP broken.”

Also: **one account = one seat**. A second browser with the same login kicks the first off the shard; neither tab sees “another player.” That is the most common manual-test failure mode.

## Fixes

| Change | Where |
| :--- | :--- |
| Nameplates above `multiplayer_*` sprites | `BabylonEngine` |
| Amber minimap dots for `otherPlayers` | `MiniMapRadar` |
| “Shard / Nearby N” presence strip (+ names) | `PeerPresenceHud` on `/lobby` |
| Toast includes peer tile `(x, y)` | `index.tsx` `player_joined` |
| `session_replaced` to displaced socket | `PlayerManager` + client toast |

## Verify

```bash
npx tsx scripts/smoke-lobby-mp.ts
npx tsx scripts/smoke-lobby-mp-ui-storm.ts
npx tsx scripts/smoke-lobby-mp-session-replaced.ts
```

Manual (two **different** accounts, `/lobby` only):

1. Presence HUD: same **Ch. N**, **Nearby ≥ 1**, other name listed  
2. Amber dot on minimap + gold nameplate over peer sprite  
3. Toast `\<name\> is nearby @ (x, y)`  
4. Same account two tabs → first gets “Signed in elsewhere…”; still alone until a second account joins  
