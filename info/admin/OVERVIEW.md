# Admin Panel Overview

Staff console under `/admin`. Writers may enter for news tools even without full MOD level.

---

## Access

| Check | Where |
| :--- | :--- |
| Shell gate | `app/(main)/admin/layout.tsx` — MODERATOR (200) **or** `isWriter` |
| Nav visibility | `app/(main)/admin/admin-overlay-shell.tsx` — per-item level |
| Page/API re-checks | Each page / `app/api/admin/*` / `admin/actions.ts` |

Never rely on nav hiding alone.

---

## Navigation map (high level)

| Area | Routes (under `/admin/…`) | Typical gate |
| :--- | :--- | :--- |
| Dashboard | `/admin` | Moderator |
| Forum | `forum`, `forum/settings` | Head Mod (+ Dev to save AI settings) |
| News / streams / RSS | `news`, `streams`, `rss` | Admin / writer / CM |
| Users / roles / tickets | `users`, `roles`, `tickets` | Admin / Dev / Mod |
| Site settings | `settings` | Developer |
| Realtime | `realtime` | Staff (metrics / breaker) |
| Game servers / modpacks | `game-servers`, `modpacks`, `characters` | Admin |
| Achievements / tiers | `achievements`, `tiers` | Admin |
| Game / studio | `game`, `game-dev/*`, `dev/*` | Developer |
| FiveM txAdmin | `server-manager` | **Back-line** (FIVEM_DEVELOPER) |

---

## Detailed permission map

Full nav gates + admin APIs + new-page checklist: [`PERMISSIONS.md`](./PERMISSIONS.md).

## Key files

- Overlay: `admin-overlay-shell.tsx`
- Site settings form: `admin/settings/page.tsx` + `updateSiteSettings`
- Forum settings: `admin/forum/settings` → [`../forum/TEXT_ENHANCE.md`](../forum/TEXT_ENHANCE.md) (**back-line** for local models)
- Admin APIs: `app/api/admin/**` — also listed in [`../backend/API_CATALOG.md`](../backend/API_CATALOG.md)
- Realtime dashboard: `admin/realtime` → [`../realtime/ARCHITECTURE.md`](../realtime/ARCHITECTURE.md)

---

## Rules

1. New admin pages must set nav visibility **and** server-side permission checks (see checklist in `PERMISSIONS.md`).
2. `SiteSetting` upserts are Developer-gated unless a dedicated action says otherwise.
3. Prefer extending existing managers (users, categories, news) over new parallel CRUDs.
