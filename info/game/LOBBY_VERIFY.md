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

1. Two accounts, same character start map (e.g. both load into same campaign map)
2. Both appear as sprites; movement updates for the other client
3. Local chat shows in the other client’s chat log + brief bubble over head
4. Staff `/announce hi` (mod+) appears as system/staff line for everyone on the shard
