/**
 * Saints Gaming — Headless Studio Omnisearch Query Engine (Bible 19 & Bible 29)
 * Multi-domain search index for maps, items, loot tables, quests, creatures, NPCs, and studio commands.
 */

export type OmnisearchDomain =
  | 'map'
  | 'item'
  | 'loot'
  | 'quest'
  | 'creature'
  | 'npc'
  | 'dialogue'
  | 'ability'
  | 'class'
  | 'action'
  | 'dock'
  | 'asset';

export interface OmnisearchEntry {
  id: string;
  domain: OmnisearchDomain;
  title: string;
  subtitle?: string;
  keywords?: string[];
  payload?: Record<string, unknown>;
}

export interface OmnisearchMatch extends OmnisearchEntry {
  score: number;
}

export interface OmnisearchQueryOptions {
  domainFilter?: OmnisearchDomain;
  limit?: number;
}

export class StudioOmnisearchIndex {
  private entries: OmnisearchEntry[] = [];

  public add(entry: OmnisearchEntry): void {
    this.entries.push(entry);
  }

  public addBatch(entries: OmnisearchEntry[]): void {
    this.entries.push(...entries);
  }

  public clear(): void {
    this.entries = [];
  }

  public size(): number {
    return this.entries.length;
  }

  /**
   * Searches the index and returns scored, ranked results.
   * Supports @domain query prefix filtering (e.g. "@map village" or "@npc luna").
   */
  public search(query: string, options: OmnisearchQueryOptions = {}): OmnisearchMatch[] {
    let cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    let domainFilter = options.domainFilter;

    // Check for @domain prefix syntax
    if (cleanQuery.startsWith('@')) {
      const parts = cleanQuery.split(' ');
      const prefixDomain = parts[0].slice(1) as OmnisearchDomain;
      domainFilter = prefixDomain;
      cleanQuery = parts.slice(1).join(' ').trim();
    }

    const matches: OmnisearchMatch[] = [];

    for (const entry of this.entries) {
      if (domainFilter && entry.domain !== domainFilter) {
        continue;
      }

      const score = this.calculateMatchScore(entry, cleanQuery);
      if (score > 0) {
        matches.push({
          ...entry,
          score,
        });
      }
    }

    // Sort descending by match score
    matches.sort((a, b) => b.score - a.score);

    const limit = options.limit ?? 20;
    return matches.slice(0, limit);
  }

  private calculateMatchScore(entry: OmnisearchEntry, query: string): number {
    const titleLower = entry.title.toLowerCase();
    const idLower = entry.id.toLowerCase();
    const subLower = entry.subtitle?.toLowerCase() || '';

    // If query is empty after stripping @domain, return all domain matches
    if (!query) return 10;

    // 1. Exact match
    if (titleLower === query || idLower === query) return 100;

    // 2. Starts with query (prefix)
    if (titleLower.startsWith(query) || idLower.startsWith(query)) return 75;

    // 3. Contains full query word
    if (titleLower.includes(query)) return 50;

    // 4. Subtitle contains query
    if (subLower.includes(query)) return 30;

    // 5. Keyword matches
    if (entry.keywords) {
      for (const kw of entry.keywords) {
        if (kw.toLowerCase().includes(query)) return 25;
      }
    }

    return 0;
  }
}
