# Social & Messenger Actions Map

Companion to [`OVERVIEW.md`](./OVERVIEW.md).  
Primary files: `app/actions/social.ts`, `social-folders.ts`, `messenger.ts`.  
UI: `app/(main)/profile/inbox/`, `src/web/components/messenger/`.

---

## Feed (`social.ts`)

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

Folders: `app/actions/social-folders.ts` (bookmark folder CRUD — open file for exact names).

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

Crypto helpers: `src/web/lib/crypto.ts`.

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

## Refactor note

`social.ts` is large (~900+ lines). If splitting, keep **exported action names stable** and group by domain (posts, reactions, tips, prefs, moderation) so call sites do not break.
