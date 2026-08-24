export type { SpriteFrame } from './SpriteSheetSlicer';

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
  isModularComponent?: boolean;
  componentCategory?: string | null;
  componentLayer?: string | null;
  variantFamily?: string | null;
  /** Baseline stacking order for compositing modular layers (lower draws first). */
  zOrderHint?: number | null;
  /** LPC-style base mesh this component was fitted for (e.g. "male", "child"). */
  baseBodyType?: string | null;
  /** componentCategory values this piece hides when equipped (e.g. a closed helm hides "hair"). */
  hidesComponents?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetFilters {
  type?: string;
  tags?: string[];
  categories?: string[];
  gameId?: string;
  query?: string;
  modular?: boolean;
  componentCategory?: string;
  componentLayer?: string;
  variantFamily?: string;
  /** Approved pack filter: tuxemon | lpc | studio (bible 16 §7). */
  pack?: string;
  sortBy?: 'source' | 'createdAt' | 'fileSize' | 'usageCount';
  sortOrder?: 'asc' | 'desc';
  showInCharacterCreation?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Client-safe AssetManager — talks to /api/assets (no Prisma in the browser).
 */
export class AssetManager {
  private static instance: AssetManager;
  private cache: Map<string, GameAssetItem> = new Map();

  static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  /** Wipe the in-memory asset cache so next fetch is fresh from the server. */
    /**
   * Fetch assets specifically compatible with a given entity type and role.
   */
  async getAssetsForRole(entityType: 'CHARACTER' | 'CREATURE' | 'MONSTER', role: string, page = 0): Promise<GameAssetItem[]> {
    // For now, this maps the role to an internal category filter
    // E.g., 'walk' -> mostly 'actor'/'character', 'front' -> 'creature'
    // This can be expanded to use the taxonomy later
    let typeFilter = 'ALL';
    if (entityType === 'CHARACTER') typeFilter = 'CHARACTER';
    else if (entityType === 'CREATURE' || entityType === 'MONSTER') typeFilter = 'CREATURE';

    // Fetch matching assets
    const data = await this.searchAssets({ type: typeFilter as any }, page, 50);
    return data.items;
  }


  clearCache(): void {
    this.cache.clear();
  }

  /** Clear cache AND broadcast a cross-component refresh event. */
  broadcastRefresh(): void {
    this.clearCache();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('assets:refreshed'));
    }
  }

  private hydrate(raw: any): GameAssetItem {
    const meta = raw.metadata || {};
    const tags = Array.isArray(raw.tags) ? raw.tags : [];
    const isModular = Boolean(
      raw.isModularComponent ||
        meta.isModularComponent ||
        tags.includes('modular') ||
        tags.includes('sprite-component') ||
        meta.componentCategory ||
        meta.cat
    );

    return {
      ...raw,
      createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
      updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
      atlasSource: raw.atlasSource || null,
      atlasFrame: raw.atlasFrame || null,
      tags,
      categories: Array.isArray(raw.categories) ? raw.categories : [],
      metadata: meta,
      customLabels: raw.customLabels || null,
      isModularComponent: isModular,
      componentCategory: raw.componentCategory || meta.componentCategory || meta.cat || null,
      componentLayer: raw.componentLayer || meta.componentLayer || meta.layer || null,
      variantFamily: raw.variantFamily || meta.variantFamily || meta.variant || null,
      zOrderHint: raw.zOrderHint ?? meta.zOrderHint ?? meta.z ?? null,
      baseBodyType: raw.baseBodyType || meta.baseBodyType || meta.body || null,
      hidesComponents: Array.isArray(raw.hidesComponents)
        ? raw.hidesComponents
        : Array.isArray(meta.hidesComponents)
        ? meta.hidesComponents
        : [],
    };
  }

  async getAsset(id: string): Promise<GameAssetItem | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    const res = await fetch(`/api/assets/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.asset) return null;
    const formatted = this.hydrate(data.asset);
    this.cache.set(id, formatted);
    return formatted;
  }

  async searchAssets(filters: AssetFilters, page = 0, limit = 50): Promise<PaginatedResult<GameAssetItem>> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (filters.type) params.set('type', filters.type);
    if (filters.gameId) params.set('gameId', filters.gameId);
    if (filters.query) params.set('query', filters.query);
    if (filters.tags?.length) params.set('tags', filters.tags.join(','));
    if (filters.categories?.length) params.set('categories', filters.categories.join(','));
    if (typeof filters.modular === 'boolean') params.set('modular', String(filters.modular));
    if (filters.componentCategory) params.set('componentCategory', filters.componentCategory);
    if (filters.componentLayer) params.set('componentLayer', filters.componentLayer);
    if (filters.variantFamily) params.set('variantFamily', filters.variantFamily);
    if (filters.pack) params.set('pack', filters.pack);
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    if (typeof filters.showInCharacterCreation === 'boolean') params.set('showInCharacterCreation', String(filters.showInCharacterCreation));

    const res = await fetch(`/api/assets?${params.toString()}`);
    if (!res.ok) {
      console.error('[AssetManager] search failed', res.status);
      return { items: [], total: 0, page, limit, hasMore: false };
    }
    const data = await res.json();
    const items = (data.items || []).map((item: any) => {
      const formatted = this.hydrate(item);
      this.cache.set(formatted.id, formatted);
      return formatted;
    });

    return {
      items,
      total: data.total ?? items.length,
      page: data.page ?? page,
      limit: data.limit ?? limit,
      hasMore: Boolean(data.hasMore),
    };
  }

  async addTag(assetId: string, tag: string): Promise<void> {
    const asset = await this.getAsset(assetId);
    if (!asset) throw new Error('Asset not found');
    const updatedTags = Array.from(new Set([...asset.tags, tag]));
    const res = await fetch(`/api/assets/${encodeURIComponent(assetId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: updatedTags }),
    });
    if (!res.ok) throw new Error('Failed to add tag');
    this.cache.delete(assetId);
  }

  async removeTag(assetId: string, tag: string): Promise<void> {
    const asset = await this.getAsset(assetId);
    if (!asset) throw new Error('Asset not found');
    const updatedTags = asset.tags.filter((t) => t !== tag);
    const res = await fetch(`/api/assets/${encodeURIComponent(assetId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: updatedTags }),
    });
    if (!res.ok) throw new Error('Failed to remove tag');
    this.cache.delete(assetId);
  }

  async reclassifyAsset(assetId: string, newType: string, newCategories: string[]): Promise<void> {
    const res = await fetch(`/api/assets/${encodeURIComponent(assetId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: newType, categories: newCategories }),
    });
    if (!res.ok) throw new Error('Failed to reclassify asset');
    this.cache.delete(assetId);
  }

  /** Bible 16 §7 — declare solid / interactable / decorative on placeable assets. */
  async updateGameplayFlags(
    assetId: string,
    flags: { solid?: boolean; interactable?: boolean; decorative?: boolean }
  ): Promise<GameAssetItem> {
    const res = await fetch(`/api/assets/${encodeURIComponent(assetId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata: flags }),
    });
    if (!res.ok) throw new Error('Failed to update gameplay flags');
    const data = await res.json();
    this.cache.delete(assetId);
    if (!data.asset) throw new Error('Missing asset in response');
    const formatted = this.hydrate(data.asset);
    this.cache.set(assetId, formatted);
    return formatted;
  }

  async deleteAsset(assetId: string): Promise<boolean> {
    const res = await fetch(`/api/assets/${encodeURIComponent(assetId)}`, {
      method: 'DELETE',
    });
    this.cache.delete(assetId);
    return res.ok;
  }

  async batchDeleteAssets(assetIds: string[]): Promise<boolean> {
    let allOk = true;
    for (const id of assetIds) {
      const ok = await this.deleteAsset(id);
      if (!ok) allOk = false;
    }
    return allOk;
  }

  /** Toggle showInCharacterCreation metadata flag for an asset */
  async toggleShowInCharacterCreation(assetId: string, value: boolean): Promise<void> {
    const asset = await this.getAsset(assetId);
    if (!asset) throw new Error('Asset not found');
    
    const currentMetadata = asset.metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      showInCharacterCreation: value,
    };

    const res = await fetch(`/api/assets/${encodeURIComponent(assetId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata: updatedMetadata }),
    });
    if (!res.ok) throw new Error('Failed to toggle showInCharacterCreation');
    this.cache.delete(assetId);
  }
}
