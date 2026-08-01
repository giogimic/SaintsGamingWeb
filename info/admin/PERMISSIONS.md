# Admin Permissions & Navigation Map

Companion to [`OVERVIEW.md`](./OVERVIEW.md).  
**Source of truth for levels:** `src/web/lib/permissions.ts` (`PERMISSION_LEVELS`, `hasPermission`).  
**Nav visibility:** `app/(main)/admin/admin-overlay-shell.tsx`.  
**Shell entry:** `app/(main)/admin/layout.tsx` — requires **Moderator (200)** or `isWriter`.

Always re-check permissions in the page / API — nav hiding is not security.

---

## Staff levels (numeric)

| Constant | Value | Role name |
| :--- | ---: | :--- |
| `HELPER` | 100 | Helper |
| `MODERATOR` | 200 | Moderator |
| `HEAD_MODERATOR` | 300 | Head Moderator |
| `ADMIN` | 400 | Admin |
| `HEAD_ADMIN` | 500 | Head Admin |
| `COMMUNITY_MANAGER` | 600 | Community Manager |
| `FIVEM_DEVELOPER` | 900 | FiveM Developer (**back-line**) |
| `DEVELOPER` | 1000 | Developer |

Progressive member tiers (0–60) are for community badges / gates, not admin nav.

---

## Navigation (matches overlay)

### Community

| Path | Label | Visible when |
| :--- | :--- | :--- |
| `/admin/forum` | Forum | ≥ Head Moderator |
| `/admin/forum/settings` | Forum Settings | ≥ Head Moderator (save/download models ≥ Developer) |
| `/admin/news` | News | ≥ Admin **or** `isWriter` |
| `/admin/streams` | Streams | ≥ Moderator |
| `/admin/tiers` | Level Tiers | ≥ Admin |
| `/admin/achievements` | Achievements | ≥ Admin |

### Game Servers

| Path | Label | Visible when |
| :--- | :--- | :--- |
| `/admin/game-servers` | Game Servers | ≥ Admin |
| `/admin/modpacks` | Modpacks | ≥ Admin |
| `/admin/characters` | Characters | ≥ Admin |
| `/admin/server-manager` | FiveM txAdmin | ≥ FiveM Developer (**back-line**) |

### System Control

| Path | Label | Visible when |
| :--- | :--- | :--- |
| `/admin` | Dashboard | ≥ Moderator |
| `/admin/users` | Users | ≥ Admin |
| `/admin/roles` | Roles | ≥ Developer |
| `/admin/tickets` | Tickets | ≥ Moderator |
| `/admin/rss` | RSS Feeds | ≥ Community Manager |
| `/admin/settings` | Settings | ≥ Developer |

### Game Dev

| Path | Label | Visible when |
| :--- | :--- | :--- |
| `/admin/game-dev/tuxemon` | Tuxemon Database | ≥ Developer |
| `/admin/game-dev/quests` | Quest Creator | ≥ Developer |
| `/admin/game-dev/assets` | Asset Studio | ≥ Developer |
| `/admin/dev/lobby` | Lobby Mgmt | ≥ Developer |
| `/admin/game` | MMO Sandbox Admin | ≥ Developer |

### Developer Tools

| Path | Label | Visible when |
| :--- | :--- | :--- |
| `/admin/dev` | Console Home | ≥ Developer |
| `/admin/realtime` | Realtime Bus | ≥ Developer |
| `/admin/dev/system` | System State | ≥ Developer |
| `/admin/dev/database` | DB Health | ≥ Developer |
| `/admin/dev/metrics` | Metrics | ≥ Developer (if linked in overlay) |
| `/admin/dev/tasks` | Tasks | ≥ Developer (if linked) |
| `/admin/dev/sandbox` | Sandbox | ≥ Developer (if linked) |

Confirm exact Developer Tools list in `admin-overlay-shell.tsx` when adding items.

---

## Admin APIs (`app/api/admin/`)

| API | Typical use |
| :--- | :--- |
| `admin/users` | User moderation / edits |
| `admin/forum/categories`, `…/subcategories` | Board structure |
| `admin/news` | News CRUD |
| `admin/streams` | Stream CRUD |
| `admin/modpacks` | Modpack CRUD |
| `admin/realtime` | Metrics, circuit breaker, force-disconnect |
| `admin/database` | DB health / tooling |
| `admin/system/update` | System update hooks |

Each handler must authenticate and check `permissionLevel` (or writer flag) independently.

---

## Common actions

| Action | File | Gate |
| :--- | :--- | :--- |
| `updateSiteSettings` | `admin/actions.ts` | Developer |
| `updateForumAiSettings` | `admin/actions.ts` | Developer |
| Category CRUD | forum category APIs + `CategoryManager` | Head Mod+ |

---

## Checklist for new admin pages

1. Add route under `app/(main)/admin/…`  
2. Add nav item in `admin-overlay-shell.tsx` with correct `isVisible`  
3. Gate the page server-side with `auth()` + `permissionLevel` / flags  
4. Gate any new `app/api/admin/…` the same way  
5. Document the row in this file  

Related: [`../auth/OVERVIEW.md`](../auth/OVERVIEW.md) · [`../backend/API_CATALOG.md`](../backend/API_CATALOG.md) · [`../realtime/ARCHITECTURE.md`](../realtime/ARCHITECTURE.md)
