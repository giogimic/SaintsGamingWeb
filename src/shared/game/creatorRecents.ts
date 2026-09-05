/**
 * Saints Gaming — Creator Recent History & Quick Recents Resolver (Bible 19 & Bible 29)
 * Tracks recently modified maps, entities, and assets with fast recovery and MRU eviction.
 */

export interface RecentItem {
  id: string;
  type: 'map' | 'npc' | 'creature' | 'item' | 'loot' | 'quest' | 'asset';
  title: string;
  subtitle?: string;
  lastModified: number;
}

export class CreatorRecentsManager {
  private items: Map<string, RecentItem> = new Map();
  private maxItems: number;

  constructor(maxItems: number = 20) {
    this.maxItems = maxItems;
  }

  /**
   * Records or updates a recent activity, pushing it to the front of the MRU queue.
   */
  public recordRecent(item: Omit<RecentItem, 'lastModified'>): RecentItem {
    const fullItem: RecentItem = {
      ...item,
      lastModified: Date.now(),
    };

    // If it exists, delete first to re-insert at end of Map iteration order
    if (this.items.has(item.id)) {
      this.items.delete(item.id);
    }

    this.items.set(item.id, fullItem);

    // Evict oldest if exceeding capacity
    while (this.items.size > this.maxItems) {
      const oldestKey = this.items.keys().serapht().value;
      if (oldestKey) {
        this.items.delete(oldestKey);
      }
    }

    return fullItem;
  }

  /**
   * Returns recent items sorted by most recent first.
   */
  public getRecents(typeFilter?: RecentItem['type'], limit: number = 10): RecentItem[] {
    let list = Array.from(this.items.values()).reverse();

    if (typeFilter) {
      list = list.filter((item) => item.type === typeFilter);
    }

    return list.slice(0, limit);
  }

  public removeRecent(id: string): boolean {
    return this.items.delete(id);
  }

  public clear(): void {
    this.items.clear();
  }

  public serialize(): string {
    return JSON.stringify(Array.from(this.items.values()));
  }

  public deserialize(rawJson: string): void {
    try {
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed)) {
        this.items.clear();
        for (const item of parsed) {
          if (item && item.id && item.title) {
            this.items.set(item.id, item);
          }
        }
      }
    } catch {
      // Ignore invalid JSON
    }
  }
}

export const creatorRecents = new CreatorRecentsManager(25);

if (typeof window !== 'undefined') {
  try {
    const saved = window.localStorage.getItem('saints.creatorRecents');
    if (saved) creatorRecents.deserialize(saved);
  } catch {
    // Ignore localStorage failures
  }
}

export function recordRecentItem(item: Omit<RecentItem, 'lastModified'>): RecentItem {
  const recorded = creatorRecents.recordRecent(item);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem('saints.creatorRecents', creatorRecents.serialize());
    } catch {
      // Ignore quota errors
    }
  }
  return recorded;
}
