/**
 * Saints Gaming — Navigation History Stack & Breadcrumbs Engine (Bible 19 & Bible 29)
 * Manages creator map navigation history, back/forward traversals, and breadcrumb trails.
 */

export interface NavigationHistoryEntry {
  mapId: string;
  mapName: string;
  timestamp: number;
  cameraPos?: { x: number; y: number };
}

export class NavigationHistoryStack {
  private past: NavigationHistoryEntry[] = [];
  private current: NavigationHistoryEntry | null = null;
  private future: NavigationHistoryEntry[] = [];
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 30) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Pushes a new navigation target onto the history stack, clearing the forward stack.
   */
  public push(entry: Omit<NavigationHistoryEntry, 'timestamp'>): void {
    const fullEntry: NavigationHistoryEntry = {
      ...entry,
      timestamp: Date.now(),
    };

    // If navigating to the exact same map consecutively, update camera position instead of pushing duplicate
    if (this.current && this.current.mapId === fullEntry.mapId) {
      this.current = fullEntry;
      return;
    }

    if (this.current) {
      this.past.push(this.current);
      if (this.past.length > this.maxHistorySize) {
        this.past.shift(); // Evict oldest
      }
    }

    this.current = fullEntry;
    this.future = []; // Clear redo stack on new branch
  }

  public canGoBack(): boolean {
    return this.past.length > 0;
  }

  public canGoForward(): boolean {
    return this.future.length > 0;
  }

  public back(): NavigationHistoryEntry | null {
    if (!this.canGoBack() || !this.current) return null;

    this.future.unshift(this.current);
    this.current = this.past.pop()!;
    return this.current;
  }

  public forward(): NavigationHistoryEntry | null {
    if (!this.canGoForward() || !this.current) return null;

    this.past.push(this.current);
    this.current = this.future.shift()!;
    return this.current;
  }

  public getCurrent(): NavigationHistoryEntry | null {
    return this.current;
  }

  /**
   * Returns an array representing the breadcrumb trail (past history + current).
   */
  public getBreadcrumbs(limit: number = 5): NavigationHistoryEntry[] {
    const trail = [...this.past];
    if (this.current) trail.push(this.current);
    return trail.slice(-limit);
  }

  public clear(): void {
    this.past = [];
    this.current = null;
    this.future = [];
  }
}
