/**
 * Saints Gaming — Creator Marketplace, Community Studio Blueprints & Mod Sharing Engine (Bible 17-33)
 * Manages community Studio blueprints, marketplace queries, rating aggregation, and import collision resolution.
 */

export type BlueprintCategory =
  | 'DUNGEON_LAYOUT'
  | 'QUESTLINE'
  | 'CREATURE_PACK'
  | 'TERRAIN_PRESET'
  | 'MINIGAME_ARENA'
  | 'FULL_CAMPAIGN';

export type ConflictResolutionStrategy = 'OVERWRITE' | 'RENAME_WITH_PREFIX' | 'SKIP';

export interface BlueprintContentItem {
  type: string;
  slug: string;
  name: string;
  data: Record<string, any>;
}

export interface BlueprintItem {
  id: string;
  title: string;
  description: string;
  category: BlueprintCategory;
  authorId: string;
  authorName: string;
  isVerifiedCreator: boolean;
  version: string;
  tags: string[];
  downloadCount: number;
  ratingSum: number;
  ratingCount: number;
  contents: BlueprintContentItem[];
  createdAt: number;
  updatedAt: number;
}

export interface ImportConflict {
  type: string;
  existingSlug: string;
  proposedSlug: string;
}

export interface ImportAnalysisResult {
  canImport: boolean;
  conflicts: ImportConflict[];
  resolvedContents: BlueprintContentItem[];
}

export class BlueprintMarketplaceEngine {
  private blueprints = new Map<string, BlueprintItem>();

  /**
   * Publishes a new community Studio blueprint to the marketplace.
   */
  public publishBlueprint(
    input: Omit<
      BlueprintItem,
      'id' | 'downloadCount' | 'ratingSum' | 'ratingCount' | 'createdAt' | 'updatedAt'
    >
  ): BlueprintItem {
    const id = `bp_${input.category.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = Date.now();

    const blueprint: BlueprintItem = {
      id,
      ...input,
      tags: (input.tags || []).map((t) => t.toLowerCase().trim()),
      downloadCount: 0,
      ratingSum: 0,
      ratingCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.blueprints.set(id, blueprint);
    return blueprint;
  }

  /**
   * Retrieves a blueprint by ID.
   */
  public getBlueprint(id: string): BlueprintItem | null {
    return this.blueprints.get(id) || null;
  }

  /**
   * Submits a user star review (1 to 5 stars).
   */
  public submitReview(
    blueprintId: string,
    rating: number
  ): { averageRating: number; totalReviews: number } {
    const bp = this.blueprints.get(blueprintId);
    if (!bp) throw new Error(`Blueprint '${blueprintId}' not found`);

    const cleanRating = Math.max(1, Math.min(5, Math.floor(rating)));
    bp.ratingSum += cleanRating;
    bp.ratingCount += 1;
    bp.updatedAt = Date.now();

    const averageRating = Number((bp.ratingSum / bp.ratingCount).toFixed(1));
    return { averageRating, totalReviews: bp.ratingCount };
  }

  /**
   * Queries and filters marketplace blueprints.
   */
  public queryMarketplace(params: {
    keyword?: string;
    category?: BlueprintCategory;
    tag?: string;
    minRating?: number;
    sortBy?: 'MOST_DOWNLOADED' | 'HIGHEST_RATED' | 'NEWEST';
  }): BlueprintItem[] {
    let results = Array.from(this.blueprints.values());

    if (params.category) {
      results = results.filter((b) => b.category === params.category);
    }

    if (params.tag) {
      const needle = params.tag.toLowerCase().trim();
      results = results.filter((b) => b.tags.includes(needle));
    }

    if (params.keyword) {
      const kw = params.keyword.toLowerCase().trim();
      results = results.filter(
        (b) =>
          b.title.toLowerCase().includes(kw) ||
          b.description.toLowerCase().includes(kw) ||
          b.authorName.toLowerCase().includes(kw)
      );
    }

    if (params.minRating !== undefined) {
      results = results.filter((b) => {
        const avg = b.ratingCount > 0 ? b.ratingSum / b.ratingCount : 0;
        return avg >= params.minRating!;
      });
    }

    // Sort order
    const sort = params.sortBy || 'NEWEST';
    results.sort((a, b) => {
      if (sort === 'MOST_DOWNLOADED') {
        return b.downloadCount - a.downloadCount;
      }
      if (sort === 'HIGHEST_RATED') {
        const avgA = a.ratingCount > 0 ? a.ratingSum / a.ratingCount : 0;
        const avgB = b.ratingCount > 0 ? b.ratingSum / b.ratingCount : 0;
        return avgB - avgA;
      }
      return b.createdAt - a.createdAt;
    });

    return results;
  }

  /**
   * Pre-flight analysis and conflict resolution for importing blueprints into Studio workspace.
   */
  public analyzeAndResolveImport(
    blueprintId: string,
    existingWorkspaceSlugs: Set<string>,
    strategy: ConflictResolutionStrategy = 'RENAME_WITH_PREFIX',
    renamePrefix: string = 'imported_'
  ): ImportAnalysisResult {
    const bp = this.blueprints.get(blueprintId);
    if (!bp) throw new Error(`Blueprint '${blueprintId}' not found`);

    bp.downloadCount++;

    const conflicts: ImportConflict[] = [];
    const resolvedContents: BlueprintContentItem[] = [];

    for (const item of bp.contents) {
      const hasCollision = existingWorkspaceSlugs.has(item.slug);

      if (hasCollision) {
        if (strategy === 'OVERWRITE') {
          conflicts.push({ type: item.type, existingSlug: item.slug, proposedSlug: item.slug });
          resolvedContents.push({ ...item });
        } else if (strategy === 'RENAME_WITH_PREFIX') {
          const newSlug = `${renamePrefix}${item.slug}`;
          conflicts.push({ type: item.type, existingSlug: item.slug, proposedSlug: newSlug });
          resolvedContents.push({
            ...item,
            slug: newSlug,
            name: `${item.name} (Imported)`,
          });
        } else if (strategy === 'SKIP') {
          conflicts.push({ type: item.type, existingSlug: item.slug, proposedSlug: 'SKIPPED' });
          // Skipped item not pushed to resolvedContents
        }
      } else {
        resolvedContents.push({ ...item });
      }
    }

    return {
      canImport: true,
      conflicts,
      resolvedContents,
    };
  }
}
