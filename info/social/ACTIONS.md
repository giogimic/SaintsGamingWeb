# Social & Messenger Actions Map

Companion to [`OVERVIEW.md`](./OVERVIEW.md).  
Primary files: `app/actions/social.ts` (barrel), `app/actions/social/*.ts`, `social-folders.ts`, `messenger.ts`.  
UI: `app/(main)/profile/inbox/`, `src/web/components/messenger/`.

**Import path:** always `@/app/actions/social` (barrel). Domain modules are implementation detail.  
Barrel has **no** `"use server"` (Next rejects re-export lists); each `social/*.ts` module is `"use server"`.

---

## Feed (barrel → domain modules)

| Module | Actions |
| :--- | :--- |
| `social/feed.ts` | `getTheFeed`, `getMiniFeed`, `searchFeed`, `getTrendingTags`, `getUserFeedPreferences`, `updateFeedPreferences` |
| `social/posts.ts` | `createSocialPost`, `updateSocialPost`, `deleteSocialPost`, `replyToSocialPost`, `getPostReplies`, `pinSocialPost`, `votePoll` |
| `social/engagement.ts` | `togglePostReaction`, `toggleBookmark`, `incrementShareCount`, `incrementViewCount`, `tipSocialPost`, `subscribeToCreator` |
| `social/history.ts` | `recordWatchHistory`, `getWatchHistory`, `clearWatchHistory` |
| `social/moderation.ts` | `getMutedKeywords`, `addMutedKeyword`, `removeMutedKeyword`, `reportSocialPost`, `appealSocialPost` |
| `social/analytics.ts` | `getPostAnalytics`, `getCreatorTopPosts` |

| Action | Purpose |
| :--- | :--- |
| `getTheFeed` | Paginated main feed (hashtag / broaden / cursor) |
| `getMiniFeed` | Compact feed for messenger sidebar |
| `searchFeed` | Query posts |
| `createSocialPost` | New post (+ optional media) |
| `updateSocialPost` / `deleteSocialPost` | Edit / remove |
| `replyToSocialPost` / `getPostReplies` | Threaded replies |
| `togglePostReaction` | Like / react |
| `pinSocialPost` | Pin (creator/staff) |
| `votePoll` | Poll vote |
| `tipSocialPost` | Tip creator (XP/economy side effects) |
| `subscribeToCreator` | Creator follow/subscribe |
| `toggleBookmark` | Bookmark |
| `incrementShareCount` / `incrementViewCount` | Counters |
| `recordWatchHistory` / `getWatchHistory` / `clearWatchHistory` | Watch history |
| `getMutedKeywords` / `addMutedKeyword` / `removeMutedKeyword` | Mute filters |
| `getUserFeedPreferences` / `updateFeedPreferences` | Broaden feed toggle |
| `getTrendingTags` | Trending hashtags |
| `getPostAnalytics` / `getCreatorTopPosts` | Creator analytics |
| `reportSocialPost` / `appealSocialPost` | Moderation |

### Bookmark folders (`social-folders.ts`)

| Action | Purpose |
| :--- | :--- |
| `createBookmarkFolder` / `deleteBookmarkFolder` / `renameBookmarkFolder` | Folder CRUD |
| `getBookmarkFolders` | List folders |
| `moveBookmarkToFolder` | Move bookmark |
| `toggleBookmarkWithFolder` | Bookmark into optional folder |
| `getBookmarksWithFolders` | List bookmarks (optional folder filter) |

Media: `POST /api/upload/social` → [`../uploads/STORAGE.md`](../uploads/STORAGE.md).

---

## Messenger (`messenger.ts`)

| Action | Purpose |
| :--- | :--- |
| `uploadPublicKey` / `getPublicKey` | E2E key exchange |
| `searchUsers` | Find users to friend/message |
| `sendFriendRequest` / `acceptFriendRequest` / `removeFriend` | Friendship |
| `getFriendsList` | Friends + pending |
| `sendMessage` / `getMessages` | E2E DMs (ciphertext + IV) |
| `deleteMessage` / `clearChatHistory` | DM cleanup |
| `createGroupChat` / `getGroupChats` / `leaveGroupChat` | Groups |
| `sendGroupMessage` / `getGroupMessages` | Group chat (plaintext today) |

Crypto helpers: `src/web/lib/crypto.ts` (ECDH + AES-GCM; covered by `crypto.test.ts`).

---

## Live / realtime hooks

When mutating, prefer existing emit helpers so the UI updates without reload:

| Mutation area | Typical event |
| :--- | :--- |
| Tips / likes / replies that notify | `notification.created` |
| DM / group send | `chat.message.created` |
| Friend online status | `presence.updated` (socket lifecycle + game/FiveM back-line) |

Catalog: [`../realtime/EVENTS.md`](../realtime/EVENTS.md).  
Helpers: `src/web/lib/realtime-emit.ts`.

Achievements / XP may run after tips, posts, etc. — use `src/web/lib/achievements.ts` and `xp.ts`; do not duplicate.

---

## UI entry points

| Surface | Path |
| :--- | :--- |
| Inbox / The Feed | `/profile/inbox` |
| Bookmarks / history / analytics | `/profile/bookmarks`, `history`, `analytics` |
| Floating messenger | `MessengerProvider` in main layout |
| Mini feed | `mini-social-feed.tsx` inside messenger |

---

## Layout note

Split complete (v2.1.109): barrel `app/actions/social.ts` re-exports domain modules under `app/actions/social/`. Keep **exported action names stable**; prefer barrel imports at call sites.
