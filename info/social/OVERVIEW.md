# Social & Messenger Overview

Covers **The Feed**, reactions/tips, friends, and DMs/groups. XP awards and notifications often cross this boundary.

---

## Feed (“The Feed”)

| Piece | Path |
| :--- | :--- |
| Inbox / feed UI | `app/(main)/profile/inbox/` (`the-feed.tsx`, `inbox-client.tsx`) |
| Domain logic | `app/actions/social.ts` — `getTheFeed`, `createSocialPost`, reactions, bookmarks, tips, mute, subscribe |
| Folders | `app/actions/social-folders.ts` |
| Media upload | `POST /api/upload/social` → [`../uploads/STORAGE.md`](../uploads/STORAGE.md) |

Related profile pages: `/profile/bookmarks`, `/profile/history`, `/profile/analytics`.

---

## Messenger & friends

| Piece | Path |
| :--- | :--- |
| Actions | `app/actions/messenger.ts` — friend requests, DMs, groups |
| UI shell | `src/web/components/messenger/` (`messenger-provider`, `messenger-popup`, `friends-list`, `chat-window`) |
| E2E crypto | `src/web/lib/crypto.ts` |

Wired into main layout via `MessengerProvider` so the popup is site-wide.

---

## Realtime touchpoints

| Event | Consumer |
| :--- | :--- |
| `notification.created` | Bell / toasts |
| `chat.message.created` | `ChatWindow` refetch |
| `presence.updated` | `FriendsList` online / playing |

Emit via `src/web/lib/realtime-emit.ts` or `RealtimeService` — never raw socket from actions.  
Catalog: [`../realtime/EVENTS.md`](../realtime/EVENTS.md).

---

## XP & achievements

- XP: `src/web/lib/xp.ts` (`awardXP`) — do not duplicate leveling.
- Achievements: `src/web/lib/achievements.ts` — auto-award hooks exist for several social/forum actions.

---

## Action inventory

Full export map: [`ACTIONS.md`](./ACTIONS.md).

## Rules

1. Prefer extending `social.ts` / `messenger.ts` over new parallel “feed” APIs.
2. `social.ts` is large — split by domain carefully if refactoring; keep action names stable.
3. Mute / ban checks belong in permissions helpers, not ad-hoc in UI.
