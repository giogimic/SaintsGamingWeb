import { StateCreator } from "zustand";
import { AppState } from "../useAppStore";

interface FeedCacheEntry {
  posts: any[];
  cursor?: string;
  hasMore: boolean;
  lastFetchedAt: number;
}

export interface SocialFeedSlice {
  feedCache: Record<string, FeedCacheEntry>;
  trendingTags: any[];
  suggestedCreators: any[];
  mutedKeywords: any[];
  loadedReplies: Record<string, any[]>;

  getFeedCache: (key: string) => FeedCacheEntry | undefined;
  setFeedCache: (key: string, data: { posts: any[]; cursor?: string; hasMore: boolean }) => void;
  appendFeedPosts: (key: string, posts: any[], cursor?: string, hasMore?: boolean) => void;
  
  prependPost: (post: any) => void;
  patchPost: (postId: string, updater: Partial<any> | ((prev: any) => any)) => void;
  removePost: (postId: string) => void;
  patchPostLikes: (postId: string, likesCount: number, hasLiked?: boolean) => void;
  patchPostRepliesCount: (postId: string, delta: number) => void;
  patchPoll: (postId: string, poll: any) => void;
  
  setLoadedReplies: (postId: string, replies: any[]) => void;
  appendReply: (postId: string, reply: any) => void;
  
  setTrendingTags: (tags: any[]) => void;
  setSuggestedCreators: (creators: any[]) => void;
  setMutedKeywords: (keywords: any[]) => void;
  
  invalidateFeed: (key?: string) => void;
}

export const createSocialFeedSlice: StateCreator<AppState, [], [], SocialFeedSlice> = (set, get) => ({
  feedCache: {},
  trendingTags: [],
  suggestedCreators: [],
  mutedKeywords: [],
  loadedReplies: {},

  getFeedCache: (key) => {
    return get().feedCache[key];
  },

  setFeedCache: (key, data) => {
    set((state) => ({
      feedCache: {
        ...state.feedCache,
        [key]: {
          posts: data.posts,
          cursor: data.cursor,
          hasMore: data.hasMore,
          lastFetchedAt: Date.now(),
        },
      },
    }));
  },

  appendFeedPosts: (key, posts, cursor, hasMore = true) => {
    set((state) => {
      const existing = state.feedCache[key];
      const existingPosts = existing?.posts || [];
      const seenIds = new Set(existingPosts.map((p) => p.id));
      const uniqueNew = posts.filter((p) => !seenIds.has(p.id));

      return {
        feedCache: {
          ...state.feedCache,
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

  prependPost: (post) => {
    set((state) => {
      const updatedCache: Record<string, FeedCacheEntry> = {};
      for (const [key, entry] of Object.entries(state.feedCache)) {
        if (!entry.posts.some((p) => p.id === post.id)) {
          updatedCache[key] = {
            ...entry,
            posts: [post, ...entry.posts],
          };
        } else {
          updatedCache[key] = entry;
        }
      }
      return { feedCache: updatedCache };
    });
  },

  patchPost: (postId, updater) => {
    set((state) => {
      const updatedCache: Record<string, FeedCacheEntry> = {};
      for (const [key, entry] of Object.entries(state.feedCache)) {
        updatedCache[key] = {
          ...entry,
          posts: entry.posts.map((p) => {
            if (p.id !== postId) return p;
            return typeof updater === "function" ? updater(p) : { ...p, ...updater };
          }),
        };
      }
      return { feedCache: updatedCache };
    });
  },

  removePost: (postId) => {
    set((state) => {
      const updatedCache: Record<string, FeedCacheEntry> = {};
      for (const [key, entry] of Object.entries(state.feedCache)) {
        updatedCache[key] = {
          ...entry,
          posts: entry.posts.filter((p) => p.id !== postId),
        };
      }
      return { feedCache: updatedCache };
    });
  },

  patchPostLikes: (postId, likesCount, hasLiked) => {
    get().patchPost(postId, (prev) => ({
      ...prev,
      likesCount,
      ...(hasLiked !== undefined ? { hasLiked } : {}),
    }));
  },

  patchPostRepliesCount: (postId, delta) => {
    get().patchPost(postId, (prev) => ({
      ...prev,
      repliesCount: Math.max(0, (prev.repliesCount || 0) + delta),
    }));
  },

  patchPoll: (postId, poll) => {
    get().patchPost(postId, (prev) => ({
      ...prev,
      polls: prev.polls?.map((pl: any) => (pl.id === poll.id ? poll : pl)) || [poll],
    }));
  },

  setLoadedReplies: (postId, replies) => {
    set((state) => ({
      loadedReplies: {
        ...state.loadedReplies,
        [postId]: replies,
      },
    }));
  },

  appendReply: (postId, reply) => {
    set((state) => {
      const existing = state.loadedReplies[postId] || [];
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

  setTrendingTags: (tags) => set({ trendingTags: tags }),
  setSuggestedCreators: (creators) => set({ suggestedCreators: creators }),
  setMutedKeywords: (keywords) => set({ mutedKeywords: keywords }),

  invalidateFeed: (key) => {
    if (key) {
      set((state) => {
        const serapht = { ...state.feedCache };
        delete serapht[key];
        return { feedCache: serapht };
      });
    } else {
      set({ feedCache: {} });
    }
  },
});
