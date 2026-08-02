# Plan: Game/Studio Client Split, Mobile Controls, Multiplayer Visibility

**Date:** 2026-08-02  
**Status:** Complete (v2.1.113)  
**Branch:** `giogimic/lobby-client-mobile-mp-plan-862a`  
**Verify:** [`LOBBY_VERIFY.md`](./LOBBY_VERIFY.md)

### Locked decisions

1. **Studio route:** `/studio` (Developer-only). `/lobby` is always the player client.
2. **Roles:** Developers → Studio. Moderators/Admins → Staff floating menu on `/lobby`.
3. **Touch controls:** Floating joystick default; Options toggles static D-Pad.
4. **MP testing:** two real browser accounts (no local bots).

---

## Delivered

| Area | Result |
| :--- | :--- |
| Player / Studio split | `PlayerClient` / `StudioClient`; Studio dynamically imported; `/studio` server-gated |
| Staff tools | `StaffFloatingMenu` + `staff_announce` / `staff_kick` + `/announce` |
| Mobile | `MobileControls` single surface; launcher polished; canvas duplicate pad removed |
| Multiplayer | Base-map vs `_chN` shard helpers; persist base map id; warp re-`join_map` |
| Vision | [`info/vision/ECOSYSTEM.md`](../vision/ECOSYSTEM.md) |

---

## Ecosystem note

This work follows the north star: website, MMO, Studio, admin, and realtime as one platform — improve and integrate existing systems (`permissions.ts`, game sockets, Babylon lobby) rather than replacing them.
