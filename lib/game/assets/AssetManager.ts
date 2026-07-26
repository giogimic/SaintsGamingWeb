import { prisma } from '@/lib/prisma';
import { SpriteSheetSlicer, SpriteFrame } from './SpriteSheetSlicer';
export type { SpriteFrame };
import { AssetPathResolver } from './AssetPathResolver';

export interface GameAssetItem {
  id: string;
  gameId: string | null;
  type: string;
  source: string;
  atlasSource: string | null;
  atlasFrame: { x: number; y: number; width: number; height: number } | null;
  tags: string[];
  categories: string[];
  metadata: Record<string, any>;
  customLabels: Record<string, string> | null;
  isActive: boolean;
  usageCount: number;
  fileSize: number;
  cdnUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetFilters {
  type?: string;
  tags?: string[];
  categories?: string[];
  gameId?: string;
  query?: string;
  sortBy?: 'source' | 'createdAt' | 'fileSize' | 'usageCount';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export class AssetManager {
  private static instance: AssetManager;
  private cache: Map<string, GameAssetItem> = new Map();

  static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  async getAsset(id: string): Promise<GameAssetItem | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    const asset = await prisma.gameAsset.findUnique({ where: { id } });
    if (!asset) return null;

    const formatted = this.formatAsset(asset);
    this.cache.set(id, formatted);
    return formatted;
  }

  async searchAssets(filters: AssetFilters, page = 0, limit = 50): Promise<PaginatedResult<GameAssetItem>> {
    const where: any = { isActive: true };

    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.gameId) {
      where.gameId = filters.gameId;
    }
    if (filters.query) {
      where.source = { contains: filters.query };
    }

    const [rawItems, total] = await Promise.all([
      prisma.gameAsset.findMany({
        where,
        skip: page * limit,
        take: limit,
        orderBy: filters.sortBy ? { [filters.sortBy]: filters.sortOrder || 'asc' } : { createdAt: 'desc' },
      }),
      prisma.gameAsset.count({ where }),
    ]);

    let items = rawItems.map((item) => this.formatAsset(item));

    if (filters.tags && filters.tags.length > 0) {
      items = items.filter((item) => filters.tags!.every((t) => item.tags.includes(t)));
    }
    if (filters.categories && filters.categories.length > 0) {
      items = items.filter((item) => filters.categories!.some((c) => item.categories.includes(c)));
    }

    return {
      items,
      total: filters.tags || filters.categories ? items.length : total,
      page,
      limit,
      hasMore: (page + 1) * limit < total,
    };
  }

  async addTag(assetId: string, tag: string): Promise<void> {
    const asset = await this.getAsset(assetId);
    if (!asset) throw new Error('Asset not found');

    const updatedTags = Array.from(new Set([...asset.tags, tag]));
    await prisma.gameAsset.update({
      where: { id: assetId },
      data: { tags: JSON.stringify(updatedTags) },
    });
    this.cache.delete(assetId);
  }

  async removeTag(assetId: string, tag: string): Promise<void> {
    const asset = await this.getAsset(assetId);
    if (!asset) throw new Error('Asset not found');

    const updatedTags = asset.tags.filter((t) => t !== tag);
    await prisma.gameAsset.update({
      where: { id: assetId },
      data: { tags: JSON.stringify(updatedTags) },
    });
    this.cache.delete(assetId);
  }

  async reclassifyAsset(assetId: string, newType: string, newCategories: string[]): Promise<void> {
    await prisma.gameAsset.update({
      where: { id: assetId },
      data: {
        type: newType,
        categories: JSON.stringify(newCategories),
      },
    });
    this.cache.delete(assetId);
  }

  private formatAsset(raw: any): GameAssetItem {
    return {
      ...raw,
      atlasFrame: raw.atlasFrame ? JSON.parse(raw.atlasFrame) : null,
      tags: typeof raw.tags === 'string' ? JSON.parse(raw.tags) : raw.tags || [],
      categories: typeof raw.categories === 'string' ? JSON.parse(raw.categories) : raw.categories || [],
      metadata: typeof raw.metadata === 'string' ? JSON.parse(raw.metadata) : raw.metadata || {},
      customLabels: typeof raw.customLabels === 'string' ? JSON.parse(raw.customLabels) : raw.customLabels || null,
    };
  }
}
