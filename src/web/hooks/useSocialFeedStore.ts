import { create } from "zustand";

/**
 * Saints Gaming — Client-Side SWR In-Memory Social Feed Store
 *
 * Provides instant 0ms rendering of social feeds, tabs, and comments across
 * client navigation, backed by background stale-while-revalidate revalidation.
 */

interface FeedCacheEntry {
  posts: any[];
  cursor?: string;
  hasMore: boolean;
  lastFetchedAt: number;
}

interface SocialFeedState {
  // Feed cache keyed by `${feedTab}:${activeFilter}:${activeHashtag || 'all'}`
  cache: Record<string, FeedCacheEntry>;

  // Global shared metadata
  trendingTags: any[];
  suggestedCreators: any[];
  mutedKeywords: any[];
  loadedReplies: Record<string, any[]>;

  // Actions
  getFeedCache: (key: string) => FeedCacheEntry | undefined;
  setFeedCache: (key: string, data: { posts: any[]; cursor?: string; hasMore: boolean }) => void;
  appendFeedPosts: (key: string, posts: any[], cursor?: string, hasMore?: boolean) => void;
  
  // Instant targeted mutations
  prependPost: (post: any) => void;
  patchPost: (postId: string, updater: Partial<any> | ((prev: any) => any)) => void;
  removePost: (postId: string) => void;
  patchPostLikes: (postId: string, likesCount: number, hasLiked?: boolean) => void;
  patchPostRepliesCount: (postId: string, delta: number) => void;
  patchPoll: (postId: string, poll: any) => void;
  
  // Replies cache
  setLoadedReplies: (postId: string, replies: any[]) => void;
  appendReply: (postId: string, reply: any) => void;
  
  // Metadata setters
  setTrendingTags: (tags: any[]) => void;
  setSuggestedCreators: (creators: any[]) => void;
  setMutedKeywords: (keywords: any[]) => void;
  
  // Cache invalidation
  invalidateFeed: (key?: string) => void;
}

const CACHE_STALE_MS = 60_000; // 60 seconds SWR window

export const useSocialFeedStore = create<SocialFeedState>((set, get) => ({
  cache: {},
  trendingTags: [],
  suggestedCreators: [],
  mutedKeywords: [],
  loadedReplies: {},

  getFeedCache: (key: string) => {
    return get().cache[key];
  },

  setFeedCache: (key: string, data: { posts: any[]; cursor?: string; hasMore: boolean }) => {
    set((state) => ({
      cache: {
        ...state.cache,
        [key]: {
          posts: data.posts,
          cursor: data.cursor,
          hasMore: data.hasMore,
          lastFetchedAt: Date.now(),
        },
      },
    }));
  },

  appendFeedPosts: (key: string, posts: any[], cursor?: string, hasMore: boolean = true) => {
    set((state) => {
      const existing = state.cache[key];
      const existingPosts = existing?.posts || [];
      const seenIds = new Set(existingPosts.map((p) => p.id));
      const uniqueNew = posts.filter((p) => !seenIds.has(p.id));

      return {
        cache: {
          ...state.cache,
          [key]: {
            posts: [...existingPosts, ...uniqueNew],
            cursor,
            hasMore,
            lastFetchedAt: Date.now(),
          },
        },
      };
    });
  },

  prependPost: (post: any) => {
    set((state) => {
      const updatedCache: Record<string, FeedCacheEntry> = {};
      for (const [key, entry] of Object.entries(state.cache)) {
        if (!entry.posts.some((p) => p.id === post.id)) {
          updatedCache[key] = {
            ...entry,
            posts: [post, ...entry.posts],
          };
        } else {
          updatedCache[key] = entry;
        }
      }
      return { cache: updatedCache };
    });
  },

  patchPost: (postId: string, updater: Partial<any> | ((prev: any) => any)) => {
    set((state) => {
      const updatedCache: Record<string, FeedCacheEntry> = {};
      for (const [key, entry] of Object.entries(state.cache)) {
        updatedCache[key] = {
          ...entry,
          posts: entry.posts.map((p) => {
            if (p.id !== postId) return p;
            return typeof updater === "function" ? updater(p) : { ...p, ...updater };
          }),
        };
      }
      return { cache: updatedCache };
    });
  },

  removePost: (postId: string) => {
    set((state) => {
      const updatedCache: Record<string, FeedCacheEntry> = {};
      for (const [key, entry] of Object.entries(state.cache)) {
        updatedCache[key] = {
          ...entry,
          posts: entry.posts.filter((p) => p.id !== postId),
        };
      }
      return { cache: updatedCache };
    });
  },

  patchPostLikes: (postId: string, likesCount: number, hasLiked?: boolean) => {
    get().patchPost(postId, (prev) => ({
      ...prev,
      likesCount,
      ...(hasLiked !== undefined ? { hasLiked } : {}),
    }));
  },

  patchPostRepliesCount: (postId: string, delta: number) => {
    get().patchPost(postId, (prev) => ({
      ...prev,
      repliesCount: Math.max(0, (prev.repliesCount || 0) + delta),
    }));
  },

  patchPoll: (postId: string, poll: any) => {
    get().patchPost(postId, (prev) => ({
      ...prev,
      polls: prev.polls?.map((pl: any) => (pl.id === poll.id ? poll : pl)) || [poll],
    }));
  },

  setLoadedReplies: (postId: string, replies: any[]) => {
    set((state) => ({
      loadedReplies: {
        ...state.loadedReplies,
        [postId]: replies,
      },
    }));
  },

  appendReply: (postId: string, reply: any) => {
    set((state) => {
      const existing = state.loadedReplies[postId] || [];
      // If temporary reply exists with matching temp id, replace it; else append
      const filtered = existing.filter((r) => r.id !== reply.id && !r.id.startsWith("temp_"));
      return {
        loadedReplies: {
          ...state.loadedReplies,
          [postId]: [...filtered, reply],
        },
      };
    });
    get().patchPostRepliesCount(postId, 1);
  },

  setTrendingTags: (tags: any[]) => set({ trendingTags: tags }),
  setSuggestedCreators: (creators: any[]) => set({ suggestedCreators: creators }),
  setMutedKeywords: (keywords: any[]) => set({ mutedKeywords: keywords }),

  invalidateFeed: (key?: string) => {
    if (key) {
      set((state) => {
        const next = { ...state.cache };
        delete next[key];
        return { cache: next };
      });
    } else {
      set({ cache: {} });
    }
  },
}));
