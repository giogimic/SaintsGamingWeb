# Public Profile Redesign Plan

## Goal

Turn `/user/[username]` into a useful Saints Gaming identity and activity page. The page should feel like a creator profile in the way YouTube profiles make a creator's work easy to find, while remaining a Saints profile: community-first, game-aware, and built on the site's tropical neon atmosphere.

The profile page must not let a user replace or hide the Saints site background. Users can personalize the profile header within bounded choices, but the site theme remains the visual owner of the page.

## Product Decisions

### Default public profile

Every profile shows, without the owner configuring anything:

- Avatar, display name (falling back to username), username, join date, level, XP progress, role/status badges, and a short bio.
- A social activity feed that combines the owner's public social posts, forum threads, and forum replies in reverse chronological order.
- Public interaction totals: posts, comments/replies received, likes received, shares received, and forum contribution count.
- Pinned achievements and a compact achievement count.
- Existing public media and Steam wishlist only when content exists.

Bookmarks must never be public. They are a private organizing tool, so the profile can show an owner-only bookmark count in profile settings but must not expose bookmarked items or a public total.

### Opt-in sections, all disabled by default

- Friends: only accepted friendships; no pending, blocked, or private relationship state. The owner enables a visible list and selects `Everyone` or `Friends only` as its audience.
- Saints characters: show a compact character card/grid. Do not expose inventory, GTC listings, currency, equipment, exact coordinates, or other gameplay state through a public profile.
- SA-MP identity: show only linked player names and an optional latest-server/last-seen summary. Do not show session history, IP information, authentication/link codes, or detailed presence by default.
- Game collection extras: Steam wishlist, pinned companion, gallery, and YouTube embeds each get their own visibility toggle. Default to hidden until explicitly enabled, except already-public legacy media should be migrated to visible after owner confirmation or retained with a migration notice.

### Visibility rules

Use only three visibility values: `PUBLIC`, `FRIENDS`, and `HIDDEN`. Guest visitors see `PUBLIC`; an authenticated accepted friend sees `PUBLIC` and `FRIENDS`; the profile owner and moderators can preview all sections. A section with no visible content should not render an empty panel.

## Experience and Layout

### Header

Use a full-width profile masthead over the existing `MidnightTropicalBackground`. It should have a fixed height, with the avatar overlapping its lower edge. The content layer uses a dark translucent scrim so user-selected accent colors never weaken text contrast.

Desktop structure:

1. Left: avatar, name, verification/status badges, `@username`, bio, and join date.
2. Below identity: a compact level chip with XP progress and five social counters.
3. Right: Friend/Message actions for visitors; `Edit profile` for the owner.
4. Lower edge: tabs for `Activity`, `About`, and each enabled optional section.

Mobile structure:

- Stack avatar and identity above actions.
- Make counters horizontally scrollable or a two-row grid with fixed-width values.
- Keep the activity tab first and avoid horizontal page overflow.

### Main content

`Activity` is the default tab and the only tab guaranteed to exist. It contains a unified activity timeline with type labels:

- Social post, including its reactions, reply count, and share count.
- Forum thread, with category and reply count.
- Forum reply, with the source thread link and reply-like count.
- Optional lightweight system milestones, such as an achievement earned, only when the owner enables milestones.

Do not expose a raw list of everything a user has liked, shared, commented on, or bookmarked. Those are engagement actions, not authored profile content. The public counters can summarize received engagement; the profile activity shows content the member authored.

`About` holds bio, joined date, role badges, pinned achievements, and enabled media. Keep it concise; it is not a second dashboard.

Optional tabs appear only after their visibility check succeeds: `Saints Characters`, `SA-MP`, `Friends`, `Games`, and `Gallery`.

### Controlled header personalization

Provide a small profile appearance picker rather than a banner uploader:

- Accent palette: `Sunset Gold`, `Ocean Cyan`, `Vice Pink`, `Palm Green`, and `Electric Violet`.
- Header treatment: `Horizon`, `Night Drive`, or `Wave Grid`.
- Optional pinned achievement badge and optional pinned companion.

The picker writes an accent CSS variable and a `data-profile-treatment` attribute on the masthead. It must not accept arbitrary CSS, remote background URLs, video backgrounds, custom fonts, or colors outside the approved token set. The global theme still controls the sky, water, palms, particles, and page background.

Use the existing rounded glass treatment, but keep the masthead and tab rail as page bands rather than nesting cards. Reserve cards for feed items, character tiles, friend tiles, and media items. Keep radii at the current design-system scale.

## Data Contract

Add a one-to-one `ProfileSettings` model rather than spreading unrelated visibility fields across `User`:

```prisma
enum ProfileVisibility {
  PUBLIC
  FRIENDS
  HIDDEN
}

model ProfileSettings {
  userId                    String            @id
  user                      User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  accent                    String            @default("SUNSET_GOLD")
  headerTreatment           String            @default("HORIZON")
  activityVisibility        ProfileVisibility @default(PUBLIC)
  achievementsVisibility    ProfileVisibility @default(PUBLIC)
  mediaVisibility           ProfileVisibility @default(HIDDEN)
  gameCharactersVisibility  ProfileVisibility @default(HIDDEN)
  sampVisibility            ProfileVisibility @default(HIDDEN)
  friendsVisibility         ProfileVisibility @default(HIDDEN)
  steamWishlistVisibility   ProfileVisibility @default(HIDDEN)
  galleryVisibility         ProfileVisibility @default(HIDDEN)
  showMilestones            Boolean           @default(false)
  updatedAt                 DateTime          @updatedAt
}
```

Add `profileSettings ProfileSettings?` to `User`. Keep `displayName`, `bio`, avatar, level/XP, and account badges on `User` because they are core identity data.

Before implementing the enum, verify the repository's Prisma migration workflow and database provider in the target environment. The current local schema is SQLite, so the migration must be reviewed for production compatibility if deployment uses a different provider.

## Query and Authorization Design

Replace the broad `getPublicProfile` selection with a profile-view model built for this page.

1. Resolve the profile owner and viewer relationship once.
2. Convert the viewer to an access level: `OWNER_OR_MODERATOR`, `FRIEND`, or `PUBLIC`.
3. Filter each optional section at query time using the section's visibility. Never fetch hidden inventories, detailed game state, private bookmarks, SA-MP codes, or protected session data and then hide it in the client.
4. Fetch activity with a cursor-based server query returning a normalized union:

```ts
type ProfileActivityItem =
  | { kind: "social-post"; createdAt: Date; post: PublicSocialPost }
  | { kind: "forum-thread"; createdAt: Date; thread: PublicForumThread }
  | { kind: "forum-reply"; createdAt: Date; reply: PublicForumReply }
  | { kind: "milestone"; createdAt: Date; milestone: PublicMilestone };
```

5. Calculate received social counts with aggregate queries. Use `SocialReaction` for likes received, `SocialPost.shareCount` for shares received, and comments/replies authored by others for comments received. Define the labels precisely in product copy so forum and feed interactions are not conflated.
6. Reuse existing post/thread renderers where possible; introduce a thin `ProfileActivityItem` adapter instead of copying feed markup into the profile route.

## Implementation Phases

### Phase 1: Profile foundation

- Add `ProfileSettings`, migration, defaults, and a server action to update it with allowlisted values.
- Extend the existing settings page with `Profile appearance` and `Profile visibility` sections.
- Update `getPublicProfile` to return display name, bio, role, profile settings, and a viewer access level.
- Rebuild the header with identity, level, badges, compact social counters, and profile actions.
- Add unit coverage for visibility resolution and server-action authorization.

Acceptance: a new user gets a complete public identity header and activity tab without enabling any optional surface.

### Phase 2: Social-first activity

- Build the normalized cursor-paginated activity query and its feed renderer.
- Include public social posts, public forum threads, and public forum replies.
- Add counters for posts, comments received, likes received, and shares received.
- Ensure bookmarks remain owner-private; do not add them to the public query or interface.
- Add empty, loading, and pagination states.

Acceptance: a visitor can scan a member's authored community activity without seeing private or friends-only material.

### Phase 3: Optional profile modules

- Add gated `Saints Characters` cards that expose only selected display-safe character fields.
- Add gated SA-MP summary cards using linked `SampPlayerSession` data, after defining the exact safe fields and freshness policy.
- Add gated friends list using `Friendship.status = ACCEPTED`, ordered deterministically and paginated.
- Gate existing gallery, YouTube, pinned companion, and Steam wishlist behind settings.

Acceptance: disabled modules produce no public trace, while owners can enable and preview each module independently.

### Phase 4: Polish and rollout

- Implement the three predefined header treatments and five approved accents on top of the fixed Saints atmosphere.
- Add responsive visual regression coverage for the masthead, counters, tabs, empty activity, long names, and all three site themes.
- Add profile SEO using display name/bio and a safe OG image fallback.
- Instrument profile tab views and activity pagination only with aggregate analytics; never log private audience decisions or detailed SA-MP activity.

Acceptance: every theme remains legible, profiles are usable on mobile, and personalized headers still unmistakably belong to Saints Gaming.

## Existing Implementation Anchors

- `app/(main)/user/[username]/page.tsx` is the route to replace incrementally; it currently renders all game characters publicly and has no visibility gate.
- `app/actions/user/users.ts` owns the current profile query and is the right boundary for viewer-aware filtering.
- `prisma/schema.prisma` already contains `SocialPost`, `SocialReaction`, `SocialBookmark`, `Friendship`, `GameCharacter`, and `SampPlayerSession`.
- `src/client/ui/shared/MidnightTropicalBackground.tsx` and `app/globals.css` define the site atmosphere and the three global themes that profile customization must preserve.
- `src/web/components/profile/activity-stats.tsx` can be refactored into the header counters rather than expanded into another dashboard section.

## Non-negotiable Privacy and Safety Checks

- Test unauthenticated, unrelated authenticated, accepted-friend, owner, moderator, blocked, and pending-friend viewers.
- Test every optional section against `PUBLIC`, `FRIENDS`, and `HIDDEN`.
- Confirm that profile queries exclude private bookmarks, private messages, SA-MP link codes, IPs, session history, game inventories, GTC listings, and exact player location.
- Rate-limit settings updates and validate every enum/string value server-side.
- Keep a moderator audit path for profile-settings changes without making that audit data public.