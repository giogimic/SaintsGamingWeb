# Plan: Game/Studio Client Split, Mobile Controls, Multiplayer Visibility

**Date:** 2026-08-02  
**Status:** Planning — awaiting user decisions on open questions  
**Branch:** `giogimic/lobby-client-mobile-mp-plan-862a`  
**Source:** User prompt + Gemini draft, validated against current codebase

---

## Goals (from product feedback)

1. **Permission-based client split** — Players get a player client; Devs/Admins get Studio with tools still gated by role (moderation / administration / development).
2. **Mobile overhaul** — Simple enter → fullscreen UX; one touch pad (optionally multiple control styles later); polish.
3. **Multiplayer visibility + chat** — Other players and their chats must show in-world and in the chat UI.

---

## What the codebase already has (facts)

### Permissions (cross-site — reuse, do not reinvent)

| Constant | Level | Role |
| :--- | ---: | :--- |
| `MODERATOR` | 200 | Moderation |
| `ADMIN` | 400 | Administration |
| `DEVELOPER` | 1000 | Development |

Source: `src/web/lib/permissions.ts`, `useAuth()`, `info/admin/PERMISSIONS.md`.

Current lobby Studio gate is coarse: `checkAdminPermission()` in `app/actions/game-admin.ts` requires **≥ ADMIN (400)**. Studio button / Options “Studio” uses `isAdminUser`. There is **no** panel-level mod vs admin vs developer split inside `StudioEditorShell`.

Site pattern for fine tools already exists: `src/editor/dev-overlay-loader.tsx` requires **DEVELOPER + `devConsoleEnabled`**.

### Routing today

- Single route: `/lobby` → `app/(main)/lobby/page.tsx` → `TheLobby` (`index.tsx`).
- No `/studio` route.
- `StudioEditorShell` is always imported/mounted; it returns `null` when not in creation mode. That still ships Studio JS to players and has a **Ctrl+E** handler with **no permission check** (permission only on the Studio button / index hotkey).

### Mobile today

| Control surface | Where | Notes |
| :--- | :--- | :--- |
| `MobileGameLauncher` | `index.tsx` | Enter + fullscreen + landscape lock already exists |
| `dpad.tsx` | rendered from `index.tsx` | Left D-Pad + right action grid + fullscreen |
| Inline pad in `GameCanvasBabylon.tsx` | bottom-right | Second D-Pad + Talk |
| `VirtualDPad.tsx` | **orphaned** | Not imported anywhere |

**Critical bug:** `dpad.tsx` / `VirtualDPad` call `enqueuePath()`, but **`dequeuePath()` is never called** outside tests. Path queue is never drained. So the left pad does not drive real movement; the canvas inline pad (`tryMoveDirection` → `tryMovePlayerTo` → `emit('input')`) is the one that works.

Fullscreen toggle already exists on `dpad.tsx`, Options menu, and MobileGameLauncher.

### Multiplayer today

Plumbing exists end-to-end:

- Client join: `join_map` from `index.tsx`
- Snapshot: `map_players` → `setOtherPlayers`
- Presence: `player_joined` / `player_left`
- Movement: `input` → server `PlayerManager` → AOI `player_moved` (binary or JSON) → `updateOtherPlayer`
- Render: `GameCanvasBabylon` → `babylonEngine.updateEntity(\`multiplayer_${socketId}\`)`
- Local chat: `chat_message` → server `player_chat` (map room) → bubble + `game_chat_msg` → `GameChat`

So this is a **debug/fix** track, not greenfield. Likely failure points to verify first:

1. Both clients authenticated and on the **same `mapId`** after character load.
2. `emitSocketEvent` wired before movement/chat (null if socket not connected).
3. Binary `player_moved` decode path (`normalizeBinaryPayload` / `decodePlayerMoved`).
4. Mesh/sprite URL failures for other players (`/game-assets/npc/...` vs broken `/assets/sprites/` for map entities).
5. Chat bubble TTL / own-message filtering masking “no chat” perception.
6. D-Pad path-queue bug masking “I moved but others didn’t see me” on mobile.

---

## Proposed architecture (revised from Gemini)

### A. Client architecture & routing

**Do not** dump Studio into a second copy of the whole lobby blindly. Prefer:

```
app/(main)/lobby/page.tsx          → PlayerClient (default)
app/(main)/studio/page.tsx         → StudioClient (staff only)   [OPTION — see Q1]
  OR keep both on /lobby with dynamic import + role gate
```

Shared core (socket, store hydrate, character select, canvas props):

- Extract shared hook/module: e.g. `useLobbySession`, `LobbyWorld` (canvas + player HUD + chat).
- `PlayerClient`: game only — no Studio import.
- `StudioClient`: same world + `StudioEditorShell` + UI edit tools, with **panel-level** permission gates.

**Permission matrix (proposed — align with site):**

| Capability | Min level | Notes |
| :--- | ---: | :--- |
| Play lobby | authenticated | PlayerClient |
| Studio shell entry | `ADMIN` (400) or `DEVELOPER` (1000) — decide Q2 | Entry only |
| Moderation panels / player tools | `MODERATOR` (200) | Kick/mute style tools when they exist |
| Admin world ops / give-item / server control | `ADMIN` (400) | Matches `checkAdminPermission` |
| World builder, assets, NPC editor, DevTools, heroes | `DEVELOPER` (1000) | Prefer also `devConsoleEnabled` like site console |

Implementation notes:

- Gate Studio **entry** server-side on the page (or server action), not only client button.
- Dynamic-import Studio so PlayerClient never bundles editor panels.
- Remove unguarded Ctrl+E from `StudioEditorShell` (or require permission callback).
- Keep using `hasPermission()` / `PERMISSION_LEVELS` — no parallel role system.

### B. Mobile UI & controls

**Iteration 1 (ship):**

1. Remove inline D-Pad from `GameCanvasBabylon.tsx` (duplicate).
2. Delete or fold unused `VirtualDPad.tsx`.
3. Keep **one** control surface (`dpad.tsx` or renamed `MobileControls`):
   - Wire movement to the same path as keyboard (`tryMovePlayerTo` / store action that emits `input`) — **must not** rely on undrained `pathQueue`.
   - Keep action cluster (Inventory / Skills / Options / Interact).
   - Prominent fullscreen control (launcher already handles first enter; in-game toggle stays).
4. Polish MobileGameLauncher + pad to Saints look (frosted glass / gold accents already in Studio — avoid stacking a second purple-generic theme if site language is gold/`#cbb26a`).

**Iteration 2 (optional control types — after Q3):**

- Static D-Pad (current shape)
- Floating joystick (touch-origin)
- Persist choice in `uiSettings` / localStorage

### C. Multiplayer sync fixes

Order of work:

1. **Repro checklist** — two sessions, same map, keyboard move + local chat; log socket events (`map_players`, `player_joined`, `player_moved`, `player_chat`).
2. **Movement pipeline** — fix mobile path-queue so mobile emits `input` like canvas/keyboard.
3. **Render path** — confirm `otherPlayers` updates → mesh spawn; sprite URL consistency; chat bubble property on entity.
4. **Chat UI** — confirm `player_chat` → `game_chat_msg` → `GameChat` for remote senders; self vs other.
5. **Server** — verify `chat_message` resolves sender map room; `admin_save_map` still needs real auth (out of scope unless touching).

Bot script: optional later; prefer two real clients first.

---

## Work phases

### Phase 0 — Decisions (blocking)

Answer open questions below before coding the split/route.

### Phase 1 — Mobile (smallest, high UX win)

- Deduplicate pads; fix movement wiring; fullscreen polish.
- Verify touch + DevTools mobile emulation.

### Phase 2 — Multiplayer visibility/chat

- Instrumentation + fixes from repro.
- Same-map visibility + chat bubbles + GameChat log.

### Phase 3 — Client split + permission tiers

- Extract shared lobby core.
- PlayerClient vs StudioClient (+ route decision).
- Panel-level gates; dynamic import; remove Ctrl+E hole.
- Update `info/game/OVERVIEW.md` + `SOCKETS.md` if routes/events change.

### Phase 4 — Verification

- `npx tsc --noEmit` / build
- Manual: player vs admin/dev sessions
- Manual: mobile one-pad + fullscreen
- Manual: two-browser multiplayer move + chat

---

## Open questions (need your call)

1. **Studio route:** Keep Studio on `/lobby` for staff, or dedicated `/studio` (staff-only page) while `/lobby` is always PlayerClient?
2. **Who may open Studio at all?** Admin+ only (current), Developer+ only, or Admin+ for light tools and Developer+ for build tools?
3. **Touch control style for v1:** Static D-Pad only, floating joystick only, or ship one default + a simple Options toggle?
4. **Multiplayer testing:** Two real accounts in two browsers OK for this pass, or do you also want a local simulated bot?

---

## Out of scope for this pass

- Discord / FiveM / S3 / heavy AI (per `info/CONTINUE.md`)
- Full Studio feature build-out beyond permission gates
- Redesigning the entire HUD/desktop layout

---

## Files most likely touched (when implementation starts)

| Area | Files |
| :--- | :--- |
| Routing | `app/(main)/lobby/page.tsx`, optional `app/(main)/studio/page.tsx` |
| Client split | `the-lobby/index.tsx`, new `PlayerClient.tsx` / `StudioClient.tsx`, `dynamic.tsx` |
| Studio gates | `editor/StudioEditorShell.tsx`, `editor/panels/*`, `GameOptionsMenu.tsx` |
| Mobile | `dpad.tsx`, `GameCanvasBabylon.tsx`, `MobileGameLauncher.tsx`, delete/fold `VirtualDPad.tsx` |
| Multiplayer | `index.tsx` socket listeners, `GameCanvasBabylon.tsx` entity sync, `GameChat.tsx`, `SocketHandler.ts` / `PlayerManager.ts` as needed |
| Docs | `info/game/OVERVIEW.md`, this log, `logs/LOCAL_CHANGELOG.md` |
