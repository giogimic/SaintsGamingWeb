# Frontend Routes Map

Companion to [`OVERVIEW.md`](./OVERVIEW.md).  
App Router groups under `app/`; URL paths omit group folders like `(main)`.

---

## Main nav (`navbar.tsx`)

| Path | Label |
| :--- | :--- |
| `/home` | Home |
| `/news` | News |
| `/modpacks` | Modpacks |
| `/servers` | Servers |
| `/forum` | Forum |
| `/forum/leaderboard` | Leaderboard |
| `/streams` | Streams |
| `/lobby` | The Lobby |

Optional UCP link when `show_ucp_in_nav` SiteSetting is true.

---

## Public / community (`(main)`)

| Path | Notes |
| :--- | :--- |
| `/` | Landing (`app/page.tsx`) |
| `/home` | Home dashboard |
| `/news`, `/news/[slug]` | News |
| `/gaming-news` | Gaming news surface |
| `/modpacks` | Modpacks |
| `/servers` | Server list |
| `/status` | Status page |
| `/streams` | Streams |
| `/leaderboards` | Leaderboards |
| `/support` | Support tickets |
| `/forum` | Forum index |
| `/forum/search` | Forum search |
| `/forum/leaderboard` | Forum leaderboard |
| `/forum/[slug]` | Category / board |
| `/forum/[slug]/new` | New thread |
| `/forum/t/[slug]` | Thread view |
| `/forum/t/[slug]/edit` | Edit thread |
| `/lobby` | MMO player client — [`../game/OVERVIEW.md`](../game/OVERVIEW.md) |
| `/studio` | Developer Studio client (server-gated Developer+) |
| `/user/[username]` | Public profile |
| `/dashboard` | User dashboard (if used) |

---

## Auth & account

| Path | Notes |
| :--- | :--- |
| `/login`, `/register` | Credentials + Discord OAuth |
| `/forgot-password`, `/reset-password` | Reset flow |
| `/force-password-change` | Forced reset gate |
| `/settings`, `/settings/stream` | Account / stream settings |
| `/profile` | Profile hub |
| `/profile/inbox` | The Feed / inbox — [`../social/OVERVIEW.md`](../social/OVERVIEW.md) |
| `/profile/bookmarks`, `/history`, `/analytics` | Social extras |
| `/profile/terminal` | Redirects to `/lobby` |

---

## Admin (`/admin/*`)

Staff overlay — full gate table in [`../admin/PERMISSIONS.md`](../admin/PERMISSIONS.md).

Highlights: `forum`, `forum/settings`, `news`, `users`, `tickets`, `settings`, `realtime`, `game`, `game-dev/*`, `dev/*`.  
FiveM `server-manager` is **back-line**.

---

## Writer

| Path | Notes |
| :--- | :--- |
| `/writer` | Writer home |
| `/writer/news`, `/writer/news/new` | News tools (`isWriter` / admin) |

---

## Other app surfaces

| Path | Notes |
| :--- | :--- |
| `/game` | Single-player / engine prototype (not MMO lobby) |
| `/standalone-3d` | Standalone 3D experiment |
| `/ucp/*` | FiveM UCP — **back-burner** (uncertain ship; needs FiveM plugin plan first) |

---

## Component homes (not routes)

| Area | Directory |
| :--- | :--- |
| Shared UI | `src/shared/ui/`, `src/shared/components/` |
| Feature UIs | `src/web/components/` |
| Messenger (global) | `src/web/components/messenger/` (via main layout) |
| Realtime client | `src/web/components/realtime/`, `src/web/hooks/useRealtimeStore.ts` |
| Lobby | `src/web/components/the-lobby/` |

---

## Rules

1. Prefer existing layouts — don’t invent a third “app chrome.”  
2. Live UI must go through `RealtimeProvider` / `useRealtimeStore`, not ad-hoc sockets.  
3. When adding a page: place under the right group, wire nav if public/staff, document here if it’s a primary surface.
