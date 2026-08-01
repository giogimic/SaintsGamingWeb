# Saints Gaming — AI Development Rules

**Version**: 1.0 | **Last Updated**: 2026-08-01

These rules govern how AI assistants (Cursor, Claude, Gemini, GPT, Copilot, etc.) must behave when working on the Saints Gaming codebase. Failure to follow these rules is the primary cause of duplicate systems, broken integrations, and wasted sessions.

---

## Before Modifying Anything — Mandatory Checklist

Before writing a single line of code, complete all of the following:

### 1. Read the Relevant Documentation
- Check `/info/` for the system you are modifying.
- If a `/info/` doc exists for your domain, **read it first**. It contains current status, boundaries, and known patterns.
- Check `/docs/` for architectural overviews and game design references.
- Check `.agents/AGENTS.md` for project-specific behavioral rules.

### 2. Inspect Existing Code Before Writing New Code
- Use `grep` or file search to check if a similar pattern, hook, API route, or component already exists.
- Check `src/shared/events/registry.ts` before adding any realtime event.
- Check `app/actions/` before creating a new server action.
- Check `app/api/` before creating a new API route.
- Check `src/server/` before adding new game server logic.

### 3. Identify Existing Solutions
- If a service already handles the feature (e.g., `RealtimeService`, `MessengerProvider`, `social.ts`), **extend it**, do not create a parallel system.
- If a Prisma model already captures the data, add fields to it, do not create a new model.

### 4. Avoid Duplicate Systems
The biggest source of technical debt in this project is parallel, disconnected implementations.

> [!CAUTION]
> **Never create**:
> - A second notification system alongside `Notification` model + `notifications-menu.tsx`
> - A second messaging system alongside `DirectMessage` + `messenger-provider.tsx`
> - A second socket connection alongside the `RealtimeProvider` + `SocketHandler`
> - A second auth flow alongside `next-auth` + `auth.ts`
> - A second game loop alongside `GameEngine` + `SocketHandler`

### 5. Explain Architecture Impact Before Acting
For any change that affects more than one file or touches a shared system (realtime, auth, game engine, database), write a brief summary of:
- What existing systems are affected
- What the migration path is (if replacing something)
- Which files will be modified

---

## Realtime Platform Rules

> [!IMPORTANT]
> These rules are non-negotiable. The Realtime Platform was carefully designed to be the single source of truth for live events.

- **Server**: All socket broadcasts must go through `RealtimeService.publishEvent()` in `src/server/realtime/RealtimeService.ts`. **Never** call `io.emit()` directly from API routes.
- **Client**: All realtime state must be read from `useRealtimeStore` (`src/web/hooks/useRealtimeStore.ts`). **Never** call `socket.on()` directly from page components.
- **New Events**: Must be registered in `src/shared/events/registry.ts` before being emitted.
- **MMO Separation**: High-frequency game ticks (movement, combat) stay inside `SocketHandler` / `GameEngine`. They **must not** be routed through the website realtime bus.

---

## Database Rules

- **Source of Truth**: The Prisma database (SQLite / MariaDB) is always the authoritative source. Realtime is a delivery mechanism, not a store.
- **Schema Changes**: Any `schema.prisma` edit must be followed immediately by `npx prisma db push` (dev) or `npx prisma migrate dev` (production).
- **New Models**: Before adding a new Prisma model, verify the data isn't already captured in an existing model or JSON field.

---

## Route & Page Architecture Rules

- **Route Groups**: Pages that belong to the main website UI **must** live under `app/(main)/`. Pages for the game client must live under `app/(main)/lobby/`. UCP pages live under `app/(ucp)/ucp/`.
- **No Orphaned Routes**: Never create `app/[feature]/page.tsx` directly — it will conflict with the main layout group.
- **Admin Pages**: Admin tools live under `app/(main)/admin/`. Always check if the admin panel section already exists before creating a new one.

---

## Game Engine Rules

- **Server Authority**: The client requests actions via `socket.emit()`. The server (`GameEngine`, `PlayerManager`, etc.) decides the outcome. The client **never** decides the result of movement, combat, trading, or encounters.
- **No `setInterval` Game Loops**: The game loop runs via `requestAnimationFrame` on the client and `setInterval(tick, TICK_RATE)` on the server via `GameEngine.ts`. Do not create additional loops.
- **No React State for Game Physics**: Player X/Y, velocity, and entity state must live in `useRef` or the `store.ts` Zustand store — never in React `useState`.

---

## After Major Changes — Required Follow-Up

1. **Update `/info/` documentation** for the system you modified.
2. **Update the Status** field (🟢 Complete, 🟡 In Progress, 🔴 Planned) in the relevant doc.
3. **Bump the version** in `package.json`, `app/actions/settings.ts`, and `app/(main)/layout.tsx`.
4. **Update `CHANGELOG.md`** with a concise, formatted summary.
5. **Run** `npx tsc --noEmit` to verify zero TypeScript errors before committing.
6. **Run** `git add . && git commit -m "..."` and `git push`.

---

## Things That Must Never Happen

| Action | Why |
| :--- | :--- |
| `io.emit()` directly in an API route | Bypasses validation, auth, and circuit breaker |
| Creating a new notifications API when `/api/notifications` exists | Duplicate system |
| Storing game state (player XY) in React `useState` | Causes re-render storms |
| Skipping `prisma db push` after schema changes | Runtime Prisma errors |
| Replacing working UI with `// TODO: implement later` | Loss of existing business logic |
| Creating `/app/[feature]/page.tsx` for a site page | Route group collision |
| Calling `socket.on()` in a page component | Bypasses deduplication, causes memory leaks |
| Emitting an unregistered event type | Bypasses Zod validation, silent failures |
