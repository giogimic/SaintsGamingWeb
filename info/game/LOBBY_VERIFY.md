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

1. Chrome DevTools phone viewport on `/lobby` (width &lt; 768)
2. Launcher: single **Open Game** button (no dual fullscreen CTA) → scaled HUD, full-size touch controls
3. Only **one** movement control (joystick default)
4. Options → Controls → switch to Static D-Pad → only one pad still
5. Action cluster (inventory / skills / options / fullscreen / interact) remains usable
6. Site Navbar / Footer / cookie / Messenger FAB must **not** paint over the lobby

## 3. Multiplayer (two real browsers)

1. Two accounts, both load `/lobby` into **Demo Sandbox** (same base map)
2. Both appear as sprites; movement updates for the other client
3. Local chat shows in the other client’s chat log + brief bubble over head
4. Staff `/announce hi` (mod+) appears as system/staff line for everyone on the shard
5. Kill network briefly on one client → toast “reconnecting…”, **stay in-world** (no title menu dump); on restore, peer sprites refresh via `map_players`
6. Staff kick → toast + no soft-rejoin; kicked client stays out until they reload / re-enter
