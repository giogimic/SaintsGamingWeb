/**
 * Saints Gaming — Studio Bookmarks & Tagging Engine (Bible 19 & Bible 27)
 * Headless bookmark management with folder organization, tagging, search, and serialization.
 */

export interface StudioBookmarkItem {
  id: string;
  type: 'map' | 'npc' | 'creature' | 'loot' | 'item' | 'quest' | 'asset' | 'custom';
  title: string;
  folder?: string;
  tags?: string[];
  targetMapId?: string;
  coordinates?: { x: number; y: number };
  createdAt: string;
}

export class StudioBookmarksEngine {
  private bookmarks: Map<string, StudioBookmarkItem> = new Map();

  constructor(initialBookmarks: StudioBookmarkItem[] = []) {
    for (const b of initialBookmarks) {
      this.bookmarks.set(b.id, b);
    }
  }

  public addBookmark(item: Omit<StudioBookmarkItem, 'createdAt'>): StudioBookmarkItem {
    const existing = this.bookmarks.get(item.id);
    if (existing) return existing;

    const newBookmark: StudioBookmarkItem = {
      ...item,
      createdAt: new Date().toISOString(),
    };

    this.bookmarks.set(item.id, newBookmark);
    return newBookmark;
  }

  public removeBookmark(id: string): boolean {
    return this.bookmarks.delete(id);
  }

  public toggleBookmark(item: Omit<StudioBookmarkItem, 'createdAt'>): boolean {
    if (this.bookmarks.has(item.id)) {
      this.bookmarks.delete(item.id);
      return false; // Removed
    } else {
      this.addBookmark(item);
      return true; // Added
    }
  }

  public hasBookmark(id: string): boolean {
    return this.bookmarks.has(id);
  }

  public getBookmark(id: string): StudioBookmarkItem | undefined {
    return this.bookmarks.get(id);
  }

  public getAll(): StudioBookmarkItem[] {
    return Array.from(this.bookmarks.values());
  }

  public filterByFolder(folder: string): StudioBookmarkItem[] {
    return this.getAll().filter((b) => b.folder === folder);
  }

  public filterByType(type: StudioBookmarkItem['type']): StudioBookmarkItem[] {
    return this.getAll().filter((b) => b.type === type);
  }

  public filterByTag(tag: string): StudioBookmarkItem[] {
    const clean = tag.toLowerCase();
    return this.getAll().filter((b) =>
      b.tags?.some((t) => t.toLowerCase() === clean)
    );
  }

  public search(query: string): StudioBookmarkItem[] {
    const clean = query.trim().toLowerCase();
    if (!clean) return this.getAll();

    return this.getAll().filter((b) => {
      if (b.title.toLowerCase().includes(clean)) return true;
      if (b.folder?.toLowerCase().includes(clean)) return true;
      if (b.tags?.some((t) => t.toLowerCase().includes(clean))) return true;
      return false;
    });
  }

  public serialize(): string {
    return JSON.stringify(this.getAll());
  }

  public deserialize(rawJson: string): void {
    try {
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed)) {
        this.bookmarks.clear();
        for (const item of parsed) {
          if (item && item.id && item.title) {
            this.bookmarks.set(item.id, item);
          }
        }
      }
    } catch {
      // Invalid JSON ignored
    }
  }
}
