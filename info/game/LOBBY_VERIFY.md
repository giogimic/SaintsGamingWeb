# Lobby / Studio / Mobile / MP — Manual Verify

Companion to [`CLIENT_SPLIT_MOBILE_MP_PLAN.md`](./CLIENT_SPLIT_MOBILE_MP_PLAN.md).

## 1. Client split

| Account | Expect |
| :--- | :--- |
| Normal player | `/lobby` plays; no Studio dock; no Staff FAB |
| Moderator | `/lobby` + Staff FAB (announce, nearby); `/studio` redirects to `/lobby` |
| Admin | Staff FAB + map kick; no Studio unless also Developer |
| Developer | `/lobby` shows Open Studio; `/studio` loads Studio tools (Ctrl+E) |

## 2. Mobile

1. Chrome DevTools phone viewport on `/lobby`
2. Launcher: **Enter Fullscreen** → one composition, game fills screen
3. Only **one** movement control (joystick default)
4. Options → Controls → switch to Static D-Pad → only one pad still
5. Action cluster (inventory / skills / options / fullscreen / interact) remains usable

## 3. Multiplayer (two real browsers)

Use **`/lobby` only** (not `/studio` — Studio is private/PIE). Two **different** accounts.

**Same account in two tabs will never work** — the second login displaces the first (`session_replaced`). DEMO NPCs are not peers.

1. Both load characters → forced `DEMO_SANDBOX` + `join_map.lobby: true`
2. Presence HUD (top-left): same **Ch. N**, **Nearby ≥ 1**, other name listed
3. Amber minimap dot + gold nameplate over peer sprite; toast `is nearby @ (x, y)`
4. DevTools: both `[lobby] map_joined` → same `instanceId` (`DEMO_SANDBOX_chN`)
5. Movement + local chat bubble on the other client
6. Staff `/announce hi` (mod+) appears as system/staff line for everyone on the shard

Automated socket check (dev server + bypass auth):

```bash
npx tsx scripts/smoke-lobby-mp.ts
npx tsx scripts/smoke-lobby-mp-session-replaced.ts
```

If alone: HUD says Nearby 0 → wrong seat (studio / same account / mismatched channel). Nearby ≥ 1 but no sprite → render path.

**Quick split:** toast / Nearby ≥ 1 = store got the join; nameplate missing = render; Nearby 0 = seat/shard.
