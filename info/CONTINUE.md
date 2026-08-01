# CONTINUE HERE — AI / Dev Handoff

**Last updated:** 2026-08-01  
**Point every new agent session at this file first.**

This folder (`/info/`) and `/logs/` are internal knowledge. Public repo docs are: `README.md`, `CHANGELOG.md`, `docs/TUXEMON_ATTRIBUTION.md`.

---

## Current Focus

**Realtime Milestone 2 — mostly wired; polish remaining**

Infrastructure (Milestone 1) is done. Milestone 2 producers/consumers for notifications, presence, chat push, and admin dashboard are implemented in **v2.1.96**.

### Done this session (v2.1.96)

1. Wired `notification.created` after DB create in:
   - `app/actions/social.ts` (like / reply / tip)
   - `app/api/forum/replies/route.ts` (author + subscribers)
   - `app/(main)/support/actions.ts` (ticket replies)
   - `app/api/forum/reply/[id]/like/route.ts`
   - `src/web/lib/mentions.ts` (mention creates + emit)
   - Shared helper: `src/web/lib/realtime-emit.ts`
2. Wired `presence.updated` on socket connect/disconnect in `SocketHandler.ts` (friend fan-out)
3. Wired `chat.message.created` in `app/actions/messenger.ts` (DM + group fan-out)
4. Consumed presence in `friends-list.tsx`; chat refetch signal in `chat-window.tsx`
5. Built Admin Realtime Dashboard → `/admin/realtime` + `/api/admin/realtime`
6. Wired `forum.reply.created` + `LiveThreadReplies` + `join_room`/`leave_room` for `thread:{id}`

### Next concrete steps (in order)

1. Smoke-test on running `npx tsx server.ts`: notifications toast, friend online/`In game` dots, DM instant refetch, live forum refresh, admin circuit breaker
2. **Milestone 3:** `game.player.online` — coarse status only; never push movement/combat ticks
3. Medium-term: MMO spatial partitioning / binary packing / Redis adapter

---

## Mandatory Read Order (before coding)

1. **This file** — current task
2. `info/AI_DEVELOPMENT_RULES.md` — constraints + existing solutions
3. `info/PROJECT_REPORT.md` — what exists / broken / order
4. If realtime: `info/realtime/ARCHITECTURE.md` then `info/realtime/EVENTS.md`
5. `/logs/LOCAL_CHANGELOG.md` — recent local work notes

---

## Rules Snapshot (non-negotiable)

- Realtime: `RealtimeService.publishEvent()` / `emitToUser()` only — never raw `io.emit()` from API routes
- Prefer `src/web/lib/realtime-emit.ts` helpers from server actions / API routes
- Client realtime state: `useRealtimeStore` only — never `socket.on()` in page components
- New events: register in `src/shared/events/registry.ts` + update `info/realtime/EVENTS.md`
- MMO ticks stay in MMO — website bus gets coarse ecosystem events only
- After meaningful local work: append `/logs/LOCAL_CHANGELOG.md` and update **Current Focus** / **Next steps** above
