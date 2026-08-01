# Saints Gaming — Development Rules

**Version**: 2.0 | **Last Updated**: 2026-08-01 | **Supersedes**: v1.0

These rules are mandatory before modifying the codebase. The biggest source of breakage is skipping research and creating duplicate systems.

---

## Before Modifying Anything — Mandatory Checklist

Complete **all five steps** before writing code.

### 1. Read Relevant Documentation

| Task | Files to Read |
| :--- | :--- |
| Anything realtime | `/info/realtime/ARCHITECTURE.md` then `/info/realtime/EVENTS.md` |
| Any new feature | `/info/PROJECT_REPORT.md` → "Completed Systems" section |
| Frontend / routing / theme | `/info/frontend/OVERVIEW.md` + `ROUTES.md` |
| API / actions / server.ts | `/info/backend/OVERVIEW.md` + `API_CATALOG.md` |
| Auth, session, permissions | `/info/auth/OVERVIEW.md` + `src/web/lib/permissions.ts` |
| Social / messenger | `/info/social/OVERVIEW.md` + `ACTIONS.md` |
| Admin panel | `/info/admin/OVERVIEW.md` + `PERMISSIONS.md` |
| MMO / lobby | `/info/game/OVERVIEW.md` + `SOCKETS.md` |
| Forum | `/info/forum/OVERVIEW.md` |
| Database changes | `prisma/schema.prisma` (full file) + `/info/database/WORLDMAP.md` if maps |
| Any API route | Check `app/api/` tree first — the route may already exist |

### 2. Inspect Existing Code

Before writing a new function, hook, or API route, search the codebase:

```bash
# Check if a server action already does this
grep -r "functionName" app/actions/

# Check if an API route already handles this
grep -r "keyword" app/api/

# Check if a component already exists
grep -r "ComponentName" src/web/components/
```

### 3. Identify Existing Solutions

These systems already exist. Do not rebuild them:

| Need | Existing Solution |
| :--- | :--- |
| Send a realtime event | `RealtimeService.publishEvent()` in `src/server/realtime/RealtimeService.ts` |
| Read realtime state on client | `useRealtimeStore` in `src/web/hooks/useRealtimeStore.ts` |
| Authentication check | `const session = await auth()` from `@/auth` |
| Permission check | `hasPermission(userLevel, PERMISSION_LEVELS.X)` from `src/web/lib/permissions.ts` |
| File upload | `uploadFile()`, `uploadSocialMedia()`, `deleteUploadedFile()` in `src/web/lib/upload.ts` |
| Award XP | `awardXP(userId, amount)` from `src/web/lib/xp.ts` |
| Send email | `sendPasswordResetEmail()`, `sendVerificationEmail()` in `src/web/lib/email.ts` |
| Discord webhook | `sendDiscordWebhook(url, payload)` from `src/web/lib/discord.ts` |
| Discord OAuth token | `getValidDiscordToken(userId)` from `src/web/lib/discord.ts` |
| Rate limit an endpoint | `rateLimit(key, limit, windowMs)` from `src/web/lib/rate-limit.ts` |
| Mention parsing | `processMentions(body, authorId)` from `src/web/lib/mentions.ts` |
| Text enhancement | `POST /api/ai/enhance` using `gemini-2.5-flash` streaming |
| Global site search | `GET /api/search?q=` (searches threads, articles, modpacks, users) |

### 4. Avoid Duplicate Systems

> [!CAUTION]
> **Never create a second version of:**
> - Notification system (`Notification` model + `notifications-menu.tsx` + `useRealtimeStore`)
> - Messaging system (`DirectMessage` model + `messenger-provider.tsx` + `messenger-popup.tsx`)
> - Socket connection (`RealtimeProvider.tsx` is the single socket client)
> - Auth system (`next-auth` v5 + `auth.ts` + `auth.config.ts`)
> - Game loop (`GameEngine.ts` + `server.ts` tick — no second setInterval)
> - File upload handler (`src/web/lib/upload.ts` covers all upload types)
> - Permission check (always use `hasPermission()` from `permissions.ts`)
> - XP/level system (`awardXP()` in `src/web/lib/xp.ts` — already auto-promotes tiers and rewards FiveM characters)
> - Text enhance (already exists at `/api/ai/enhance`)

### 5. Explain Architecture Impact Before Acting

For any change touching a shared system, state in plain language:
- Which existing systems are affected
- Which files will be modified
- Whether this is an extension (adding to an existing system) or a replacement (requires migration)

If it is a replacement, **plan the migration explicitly** — do not delete working code first.

---

## System-Specific Rules

### Realtime Platform Rules

- **Server broadcast**: Always via `RealtimeService.publishEvent()`. **Never** `io.emit()` directly.
- **Client state**: Always via `useRealtimeStore`. **Never** `socket.on()` in a component.
- **New events**: Must be registered in `src/shared/events/registry.ts` first. Check `/info/realtime/EVENTS.md`.
- **MMO data stays in the MMO**: Player position, combat ticks, collision — these live in `SocketHandler` and `GameEngine`. They must **never** enter the website realtime bus.
- **Notification emitters**: When creating a `prisma.notification.create()`, always follow it with `realtime.emitToUser()`. See `app/api/forum/reply/route.ts` for the pattern.

### Database Rules

- **Prisma is the only ORM**. Never use raw SQL except inside `prisma.$queryRaw` calls.
- **After any `schema.prisma` change**: Immediately run `npx prisma db push` (dev) or `npx prisma migrate dev` (prod).
- **Live DB migration** (SQLite → MariaDB): The admin route `POST /api/admin/database` handles this safely. Never do it manually.
- **Before adding a model**: Check schema.prisma for existing models that may already capture the data with a JSON field.
- **Large data in DB**: Campaign maps (`WorldMap`), tile layers, NPC data, encounter pools — stored as JSON strings in the DB. Seed dump: `scripts/data/campaign-maps.generated.ts`. Migrate with `npx tsx scripts/migrate-campaign-maps-to-db.ts`. Never import the seed dump from `app/` or `src/web/` (use `/api/maps` / `loadMap()`).

### Permissions Rules

- **Permission levels are numeric**: Lurker=0, User=20, Moderator=200, Admin=400, Developer=1000. See full table in `src/web/lib/permissions.ts`.
- **Always use `hasPermission()`**: Never hardcode permission level numbers in page/component logic. Import from `permissions.ts`.
- **Owner-only actions** require `permissionLevel >= 1000` (Developer). The admin DB migration route enforces this.
- **XP auto-promotion**: `awardXP()` automatically promotes non-staff users through community tiers. Do not duplicate this logic.

### Route & Page Architecture Rules

- **Main website pages**: `app/(main)/[feature]/page.tsx`
- **UCP pages**: `app/(ucp)/ucp/[feature]/page.tsx`
- **Admin pages**: `app/(main)/admin/[feature]/page.tsx`
- **Game client**: `app/(main)/lobby/page.tsx` → `src/web/components/the-lobby/`
- **API routes**: `app/api/[category]/[action]/route.ts`
- **Never**: `app/[feature]/page.tsx` for a site page — this bypasses the layout group.

### Game Engine Rules

- **Server authority is absolute**: Client sends input events; server decides movement, combat, encounter outcomes.
- **No game state in React `useState`**: Player position, entity data, and game loop state must live in `useRef` or the `store.ts` Zustand store (`src/web/components/the-lobby/store.ts`).
- **No `setInterval` for game loops**: The server tick loop is in `GameEngine.ts`. The client render loop uses `requestAnimationFrame` in `GameCanvasBabylon.tsx`.
- **Babylon.js sprite atlas**: The 96x128px, 4-row sprite sheet layout is fixed. Row 0=Down, 1=Left, 2=Right, 3=Up. Do not change the vOffset/texture coordinate math without testing.

### Upload Rules

- **All uploads go through `src/web/lib/upload.ts`**. MIME validation, size limits, magic bytes, local disk, and optional S3 live here (plus `s3-storage.ts`). Never write uploads from routes directly.
- **Default = local** (`public/uploads`). **Optional S3/CDN** when `S3_BUCKET` + credentials + `CDN_BASE_URL` are set — see `info/uploads/STORAGE.md`. On S3 failure, fall back to local.
- Forum uploads are images only (`uploadFile`). Social/modpack archives use `uploadSocialMedia` via `/api/upload/social`.

---

## After Major Changes — Required Follow-Up

1. **Update `/info/PROJECT_REPORT.md`** — move the changed system from "Partial" to "Complete" or update its notes.
2. **Update `/info/realtime/EVENTS.md`** if you added or changed a realtime event.
3. **Update version** in `package.json`, `app/actions/settings.ts`, `app/(main)/layout.tsx`.
4. **Add entry to `CHANGELOG.md`** with a concise summary of changes.
5. **Run** `npx tsc --noEmit` — confirm zero TypeScript errors.
6. **Run** `git add .` → `git commit -m "..."` → `git push`.

---

## Things That Must Never Happen

| Action | Consequence |
| :--- | :--- |
| `io.emit()` directly in an API route | Bypasses validation, auth check, and circuit breaker |
| `socket.on()` in a page or component | Memory leak, duplicated listeners, bypasses dedup |
| New notification creation without realtime emit | Bell icon doesn't update live |
| Skipping `prisma db push` after schema change | Prisma client/DB out of sync, runtime crashes |
| Emitting an unregistered event type | Bypasses Zod validation, silent failures |
| Duplicate permission level constants | Causes inconsistent auth — use `permissions.ts` |
| Creating a new XP/level system | Already exists in `xp.ts`; it also auto-handles FiveM rewards |
| Adding game physics state to `useState` | Re-render storm at 60fps |
| Replacing the Babylon.js sprite atlas math | Breaks all character sprite directions |
| Creating `app/[feature]/page.tsx` for a site page | Route group collision, broken navbar layout |
