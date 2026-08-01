# Frontend Overview

**Stack:** Next.js App Router · React · Tailwind · shadcn-style UI · Zustand (game) · socket.io-client (realtime)

---

## Layouts / shells

| Layout | Path | Role |
| :--- | :--- | :--- |
| Root | `app/layout.tsx` | ThemeProvider, AuthProvider, fonts, `globals.css` |
| Main site | `app/(main)/layout.tsx` | Navbar/Footer, RealtimeProvider, MessengerProvider |
| Lobby | `app/(main)/lobby/layout.tsx` | Full-bleed game chrome |
| Admin | `app/(main)/admin/layout.tsx` | Admin overlay + MOD/writer gate |
| UCP | `app/(ucp)/layout.tsx` | FiveM UCP shell (back-line) |
| Writer | `app/writer/layout.tsx` | News writer tools |

Landing: `app/page.tsx`. Feature UIs live under `src/web/components/`. Shared chrome under `src/shared/`.

---

## UI kit & theming

- Primitives: `src/shared/ui/*` (button, card, dialog, select, …)
- Chrome: `src/shared/components/navbar.tsx`, `theme-switcher.tsx`, `ambient-background.tsx`, `global-search.tsx`
- Themes: `src/web/components/theme-provider.tsx` + CSS variables in `app/globals.css`
- Modes: `.light` / `.dark` / `.hacker` (default theme is **hacker**)

Prefer existing primitives over one-off styled divs.

---

## Important routes (main nav)

`/home` · `/news` · `/modpacks` · `/servers` · `/forum` · `/streams` · `/lobby`

Auth pages: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/force-password-change`  
Profile hub: `/profile/*` (inbox/feed, bookmarks, history, analytics, settings)

Full route inventory: [`ROUTES.md`](./ROUTES.md).

---

## Client realtime

Do **not** open raw `socket.on` in feature components. Use:

- `src/web/components/realtime/RealtimeProvider.tsx`
- `src/web/hooks/useRealtimeStore.ts`

See [`../realtime/ARCHITECTURE.md`](../realtime/ARCHITECTURE.md).

---

## Rules of thumb

1. Server Components by default; `"use client"` only when needed.
2. Permissions: import `PERMISSION_LEVELS` / `hasPermission` from `src/web/lib/permissions.ts`.
3. Uploads: never write files from components — hit `/api/upload/*` (see [`../uploads/STORAGE.md`](../uploads/STORAGE.md)).
4. Large game UI: `src/web/components/the-lobby/` — treat `GameCanvasBabylon.tsx` and `store.ts` carefully.
