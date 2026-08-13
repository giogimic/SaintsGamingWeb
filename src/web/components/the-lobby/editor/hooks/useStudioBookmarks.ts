/**
 * Studio Bookmarks & Favorites — PT1 (bible 27 §3.7).
 *
 * Per-user, per-project bookmarks stored in localStorage.
 * Separate from Social bookmarks (SocialBookmark).
 */
import { useState, useCallback, useEffect } from 'react';

export interface StudioBookmarkEntry {
  id: string;
  type: string;
  title: string;
  folder?: string;
  createdAt: string;
}

const STORAGE_KEY = 'saints.studioBookmarks';

function loadBookmarks(): StudioBookmarkEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks: StudioBookmarkEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch {
    // Storage full or blocked
  }
}

export function useStudioBookmarks() {
  const [bookmarks, setBookmarks] = useState<StudioBookmarkEntry[]>(() => loadBookmarks());

  // Persist on change
  useEffect(() => {
    saveBookmarks(bookmarks);
  }, [bookmarks]);

  const addBookmark = useCallback((entry: Omit<StudioBookmarkEntry, 'createdAt'>) => {
    setBookmarks((prev) => {
      if (prev.some((b) => b.id === entry.id)) return prev;
      return [...prev, { ...entry, createdAt: new Date().toISOString() }];
    });
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const toggleBookmark = useCallback((entry: Omit<StudioBookmarkEntry, 'createdAt'>) => {
    setBookmarks((prev) => {
      const existing = prev.find((b) => b.id === entry.id);
      if (existing) return prev.filter((b) => b.id !== entry.id);
      return [...prev, { ...entry, createdAt: new Date().toISOString() }];
    });
  }, []);

  const isBookmarked = useCallback((id: string) => {
    return bookmarks.some((b) => b.id === id);
  }, [bookmarks]);

  const clearAll = useCallback(() => {
    setBookmarks([]);
  }, []);

  return {
    bookmarks,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    isBookmarked,
    clearAll,
  };
}
