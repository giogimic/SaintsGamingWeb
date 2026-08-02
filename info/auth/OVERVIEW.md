# Auth & Permissions Overview

**Stack:** NextAuth (Auth.js) · Prisma adapter · JWT sessions · Discord OAuth optional

---

## Core files

| File | Role |
| :--- | :--- |
| `auth.ts` | Providers (Credentials + Discord), PrismaAdapter, JWT callbacks, DB sync |
| `auth.config.ts` | Edge-safe config; pages `/login`; authorized gate for `/admin`, `/profile` |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth HTTP handlers |
| `src/shared/types/next-auth.d.ts` | Session fields: `id`, `permissionLevel`, `username`, flags |
| `src/web/lib/permissions.ts` | **Source of truth** for levels + `hasPermission` |
| `src/web/components/auth-provider.tsx` | Client `SessionProvider` |

Also: `app/api/auth/register`, `forgot-password`; actions in `app/actions/auth.ts`.

---

## Session usage

**Server:** `import { auth } from "@/auth"` then `await auth()`.  
**Client:** `useSession()` from `next-auth/react` (inside AuthProvider).

JWT session is also read by `SocketHandler` via `getToken` + `AUTH_SECRET` for MMO joins.

---

## Permission levels

Defined in `src/web/lib/permissions.ts` (`PERMISSION_LEVELS`). Common gates:

| Level (approx) | Examples |
| :--- | :--- |
| User | Forum post (if `canPostToForum`), social |
| Moderator (200) | Admin shell entry |
| Head Moderator (300) | Forum categories / Forum Settings view |
| Admin (400) | Users, news (or `isWriter`), streams |
| Developer (1000) | Site settings, Forum Settings save, game-dev tools |

Always use `hasPermission(level, PERMISSION_LEVELS.X)` — do not hardcode magic numbers in new code.

User flags that matter: `canPostToForum`, `isWriter`, `isBanned`, mute fields, `forcePasswordChange`, `devConsoleEnabled`.

---

## Pages

`/login` · `/register` · `/forgot-password` · `/reset-password` · `/force-password-change`

Discord OAuth linking may set `User.discordId` — see [`../discord/BRIDGE.md`](../discord/BRIDGE.md) (back-line).

---

## Rules

1. Never invent a parallel auth store or cookie session.
2. Admin UI visibility is controlled in `admin-overlay-shell.tsx` **and** re-checked in page/API handlers.
3. Password hashing / reset must go through existing auth actions — do not roll a new crypto path.
