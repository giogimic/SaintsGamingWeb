# Forum Overview

Community boards: categories → subcategories → threads → replies. Markdown editor shared with news.

---

## Surfaces

| Surface | Path |
| :--- | :--- |
| Public forum UI | `app/(main)/forum/` |
| Admin categories | `/admin/forum` → `CategoryManager` |
| Forum Settings | `/admin/forum/settings` |
| Text enhance (back-line) | [`TEXT_ENHANCE.md`](./TEXT_ENHANCE.md) |

---

## APIs & posting

- Threads / replies: `app/api/forum/**`
- Subcategory flags: `reqWriter`, VIP, etc. — via `canAccessRestrictedBoard` in `src/web/lib/forum-access.ts` (+ `canPostToForum`)
- Slugs: shared `generateSlug` in `src/web/lib/slug.ts`
- Mentions: `src/web/lib/mentions.ts` (`extractMentions` is pure; `processMentions` writes notifications)
- Markdown editor: `src/web/components/forum/markdown-editor.tsx`  
  Grammar/Polish buttons appear only when Forum Settings enable enhancement.
- Zod schemas: `src/shared/lib/validators.ts`

---

## Realtime

`forum.reply.created` → live thread consumers (`LiveThreadReplies`).  
See [`../realtime/EVENTS.md`](../realtime/EVENTS.md).

---

## Related

- Uploads for inline images: `/api/upload/forum` → [`../uploads/STORAGE.md`](../uploads/STORAGE.md)
- News writer reuses the same markdown editor under `/admin/news` / writer layout
