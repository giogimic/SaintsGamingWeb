/**
 * Social actions barrel — stable import path for call sites.
 * Implementation split by domain under ./social/*.
 *
 * Do NOT add `"use server"` here: Next.js only allows exporting async
 * functions from `"use server"` files (re-export lists are rejected).
 * Each domain module is marked `"use server"`; re-exports stay actions.
 */

export {
  createSocialPost,
  deleteSocialPost,
  updateSocialPost,
  votePoll,
  pinSocialPost,
  replyToSocialPost,
  getPostReplies,
} from "./social/posts";

export {
  getTheFeed,
  getTrendingTags,
  getMiniFeed,
  getUserFeedPreferences,
  updateFeedPreferences,
  searchFeed,
} from "./social/feed";

export {
  togglePostReaction,
  toggleBookmark,
  incrementShareCount,
  incrementViewCount,
  tipSocialPost,
  subscribeToCreator,
} from "./social/engagement";

export {
  recordWatchHistory,
  getWatchHistory,
  clearWatchHistory,
} from "./social/history";

export {
  getMutedKeywords,
  addMutedKeyword,
  removeMutedKeyword,
  reportSocialPost,
  appealSocialPost,
} from "./social/moderation";

export {
  getPostAnalytics,
  getCreatorTopPosts,
} from "./social/analytics";
