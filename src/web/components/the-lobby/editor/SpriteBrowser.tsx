'use client';

import React, { useState, useEffect } from 'react';
import { AssetManager, GameAssetItem, SpriteFrame } from '@/engine/assets/AssetManager';
import { AssetPathResolver } from '@/engine/assets/AssetPathResolver';
import SpritePreview from './SpritePreview';
import {
  Search,
  Check,
  RefreshCw,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { ASSET_PACKS, ASSET_PACK_LABELS, type AssetPackId } from '@/shared/game/assetPacks';
import {
  classifyCreatureAsset,
  CREATURE_SUBCATEGORY_LABELS,
  type CreatureAssetSubcategory,
} from '@/shared/game/creatureCatalog';
import { soundSynth } from '@/engine/sound-synth';

/** Optional class filter for sprite browser (Catalog / ClassEditorPanel). */
export type SpriteClassFilter = {
  /** Display label in the Class filter chip (optional). */
  name?: string;
  allowedSpriteTags?: string[];
  spriteFilters?: Record<string, string[]>;
};

export interface SpriteBrowserProps {
  classDef?: SpriteClassFilter;
  filterTags?: string[];
  filterType?: string;
  multiSelect?: boolean;
  selectedAssetIds?: string[];
  onSelect: (assets: GameAssetItem[]) => void;
  onClose?: () => void;
}

function filterSpritesForClass(
  items: GameAssetItem[],
  classDef: SpriteClassFilter
): GameAssetItem[] {
  const allowedTags = classDef.allowedSpriteTags || [];
  const spriteFilters = classDef.spriteFilters || {};
  if (allowedTags.length === 0 && Object.keys(spriteFilters).length === 0) {
    return items;
  }
  return items.filter((sprite) => {
    const spriteTags = sprite.tags || [];
    const metadata = sprite.metadata || {};
    if (allowedTags.length > 0) {
      const hasAllowedTag =
        allowedTags.some((tag) => spriteTags.includes(tag.toLowerCase())) ||
        spriteTags.includes('player') ||
        spriteTags.includes('hero') ||
        spriteTags.includes('npc');
      if (!hasAllowedTag) return false;
    }
    for (const [filterKey, filterValues] of Object.entries(spriteFilters)) {
      if (!filterValues || filterValues.length === 0) continue;
      const spriteValue = metadata[filterKey] as string | undefined;
      if (spriteValue && !filterValues.includes(spriteValue)) return false;
    }
    return true;
  });
}

export const SpriteBrowser: React.FC<SpriteBrowserProps> = ({
  classDef,
  filterTags = [],
  filterType = 'SPRITE',
  multiSelect = false,
  selectedAssetIds = [],
  onSelect,
  onClose,
}) => {
  const [sprites, setSprites] = useState<GameAssetItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [creatureSubFilter, setCreatureSubFilter] = useState<string>('ALL');
  const [packFilter, setPackFilter] = useState<AssetPackId | 'ALL'>('ALL');
  const [activeClassFilter, setActiveClassFilter] = useState<boolean>(!!classDef);
  const [gridSize, setGridSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(selectedAssetIds));
  const [previewAsset, setPreviewAsset] = useState<GameAssetItem | null>(null);

  useEffect(() => {
    setPage(0);
    void fetchSprites(0, false);
  }, [searchQuery, selectedTag, creatureSubFilter, activeClassFilter, classDef, packFilter, filterType, filterTags]);

  useEffect(() => {
    const handleRefreshed = () => {
      setPage(0);
      void fetchSprites(0, false);
    };
    window.addEventListener('assets:refreshed', handleRefreshed);
    return () => window.removeEventListener('assets:refreshed', handleRefreshed);
  }, [searchQuery, selectedTag, creatureSubFilter, activeClassFilter, classDef, packFilter, filterType, filterTags]);

  const fetchSprites = async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      let result: GameAssetItem[] = [];
      let more = false;
      let count = 0;
      const manager = AssetManager.getInstance();

      if (activeClassFilter && classDef) {
        const searchResult = await manager.searchAssets({ type: 'SPRITE' });
        result = filterSpritesForClass(searchResult.items, classDef);
        more = false;
        count = result.length;
      } else {
        const tagsToQuery = [
          ...(selectedTag ? [selectedTag] : []),
          ...(creatureSubFilter !== 'ALL' ? [creatureSubFilter] : []),
          ...(filterTags.length > 0 ? filterTags : []),
        ];
        const res = await manager.searchAssets(
          {
            type: filterType,
            query: searchQuery || undefined,
            tags: tagsToQuery.length > 0 ? tagsToQuery : undefined,
            pack: packFilter === 'ALL' ? undefined : packFilter,
            sortBy: 'source',
            sortOrder: 'asc',
          },
          pageNum,
          50
        );
        result = res.items;
        more = res.hasMore;
        count = res.total;
      }

      if (filterType === 'CHARACTER') {
        result = result.filter((a: any) => {
          if (a.type === 'CHARACTER' || (a.tags || []).includes('profile:character')) return true;
          if (a.type === 'SPRITE') {
            const src = (a.source || '').toLowerCase();
            return !src.includes('tile') && !src.includes('map') && !src.includes('sheet1_') && !src.includes('wall') && !src.includes('floor');
          }
          return false;
        });
        count = result.length;
      }

      if (activeClassFilter && searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(
          (s) => s.source.toLowerCase().includes(q) || (s.tags || []).some((t) => t.toLowerCase().includes(q))
        );
        count = result.length;
      }

      setSprites((prev) => (append ? [...prev, ...result] : result));
      setHasMore(more);
      setTotal(count);
      setPage(pageNum);
      if (!append && result.length > 0) {
        setPreviewAsset(result[0]);
      }
    } catch (err) {
      console.error('Failed to fetch sprites in SpriteBrowser:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleToggleSelect = (asset: GameAssetItem) => {
    soundSynth?.playSelectSound?.();
    if (!multiSelect) {
      onSelect([asset]);
      return;
    }
    const updated = new Set(selectedIds);
    if (updated.has(asset.id)) {
      updated.delete(asset.id);
    } else {
      updated.add(asset.id);
    }
    setSelectedIds(updated);
  };

  const handleConfirmMultiSelect = () => {
    soundSynth?.playActionSound?.();
    const chosen = sprites.filter((s) => selectedIds.has(s.id));
    onSelect(chosen);
  };

  return (
    <div className="flex flex-col h-full bg-[#050b14] border border-amber-500/30 rounded-xl overflow-hidden shadow-2xl font-mono">
      {/* Top Controls Toolbar */}
      <div className="p-3 bg-[#0b1320] border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-2">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search sprites by name or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#050b14] border border-amber-500/30 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 font-mono"
          />
        </div>

        <select
          value={packFilter}
          onChange={(e) => {
            soundSynth?.playUiClick?.();
            setPackFilter(e.target.value as AssetPackId | 'ALL');
          }}
          title="Approved packs"
          className="bg-[#050b14] border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-400 cursor-pointer"
        >
          <option value="ALL">All packs</option>
          {ASSET_PACKS.map((p) => (
            <option key={p} value={p}>
              {ASSET_PACK_LABELS[p]}
            </option>
          ))}
        </select>

        {/* Creature Subcategory Filter */}
        <select
          value={creatureSubFilter}
          onChange={(e) => {
            soundSynth?.playUiClick?.();
            setCreatureSubFilter(e.target.value);
          }}
          title="Subcategory Filter"
          className="bg-[#050b14] border border-purple-500/40 rounded-lg px-2.5 py-1.5 text-xs text-purple-200 font-mono focus:outline-none focus:border-purple-400 cursor-pointer"
        >
          <option value="ALL">All Sub-Categories</option>
          <option value="battle_sheet">Battle Sheets</option>
          <option value="front_sprite">Front Sprites</option>
          <option value="back_sprite">Back Sprites</option>
          <option value="face_portrait">Face Portraits</option>
          <option value="overworld">Overworld Sprites</option>
          <option value="npc_walk">NPC Walk</option>
          <option value="hero_walk">Hero Walk</option>
        </select>

        {/* Class Filter Toggle */}
        {classDef && (
          <button
            onClick={() => {
              soundSynth?.playUiClick?.();
              setActiveClassFilter(!activeClassFilter);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeClassFilter
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-sm'
                : 'bg-[#050b14] text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Class: {classDef.name || 'Filter'}</span>
          </button>
        )}

        {/* Grid Size Toggle */}
        <div className="flex items-center gap-1 bg-[#050b14] p-1 rounded-lg border border-amber-500/30">
          {(['small', 'medium', 'large'] as const).map((size) => (
            <button
              key={size}
              onClick={() => {
                soundSynth?.playUiClick?.();
                setGridSize(size);
              }}
              className={`px-2 py-0.5 text-[10px] font-mono capitalize rounded cursor-pointer ${
                gridSize === size ? 'bg-amber-400 text-black font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid + Side Preview Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sprite Grid */}
        <div className="flex-1 p-3 overflow-y-auto min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-500 font-mono text-xs gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#cbb26a]" />
              <span>Loading Sprite Library...</span>
            </div>
          ) : sprites.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 font-mono text-xs gap-2 p-8">
              <Sparkles className="w-6 h-6 text-slate-600" />
              <span>No sprites match the specified filters.</span>
              {activeClassFilter && (
                <button
                  onClick={() => setActiveClassFilter(false)}
                  className="mt-2 text-[#cbb26a] underline hover:text-[#e2d5b3]"
                >
                  Show All Sprites (Disable Class Filter)
                </button>
              )}
            </div>
          ) : (
            <>
            <div
              className={`grid gap-2 ${
                gridSize === 'small'
                  ? 'grid-cols-6 sm:grid-cols-8 md:grid-cols-10'
                  : gridSize === 'medium'
                  ? 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8'
                  : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6'
              }`}
            >
              {sprites.map((asset) => {
                const isSelected = selectedIds.has(asset.id);
                const isActive = previewAsset?.id === asset.id;

                return (
                  <SpriteThumbnailCard
                    key={asset.id}
                    asset={asset}
                    gridSize={gridSize}
                    isSelected={isSelected}
                    isActive={isActive}
                    onClick={() => {
                      setPreviewAsset(asset);
                      handleToggleSelect(asset);
                    }}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex flex-col items-center gap-1">
              <span className="text-[10px] text-slate-500 font-mono">
                Showing {sprites.length}
                {total ? ` / ${total}` : ''}
              </span>
              {hasMore && (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void fetchSprites(page + 1, true)}
                  className="px-3 py-1.5 rounded-lg border border-[#806f47]/50 text-[10px] font-mono text-[#cbb26a] hover:bg-[#806f47]/20 disabled:opacity-50"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              )}
            </div>
            </>
          )}
        </div>

        {/* Side Preview Pane */}
        {previewAsset && (
          <div className="w-72 border-l border-slate-800 p-3 bg-[#0b1320]/60 overflow-y-auto hidden lg:block">
            <SpritePreview
              asset={previewAsset}
              onSelect={(asset) => onSelect([asset])}
            />
          </div>
        )}
      </div>

      {/* Multi-Select Confirm Footer */}
      {multiSelect && (
        <div className="p-3 bg-[#0b1320] border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            Selected: <strong className="text-[#e2d5b3]">{selectedIds.size}</strong> sprites
          </span>
          <div className="flex items-center gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-[#050b14] text-slate-400 hover:text-white border border-slate-800 rounded-lg text-xs font-mono"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleConfirmMultiSelect}
              className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-blue-600 text-white font-bold rounded-lg text-xs font-mono shadow-md hover:from-amber-500 hover:to-blue-500 flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirm Selection</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface SpriteThumbnailCardProps {
  asset: GameAssetItem;
  gridSize: 'small' | 'medium' | 'large';
  isSelected: boolean;
  isActive: boolean;
  onClick: () => void;
}

function spriteKeyFromAsset(asset: GameAssetItem): string {
  const src = asset.source || '';
  const m = src.match(/\/game-assets\/npc\/([^/]+?)(?:\.png)?(?:$|\?)/i);
  if (m?.[1]) return m[1].replace(/-ow$/i, '');
  const base = src.split('/').pop() || src;
  return base.replace(/\.png$/i, '');
}

const SpriteThumbnailCard: React.FC<SpriteThumbnailCardProps> = ({
  asset,
  gridSize,
  isSelected,
  isActive,
  onClick,
}) => {
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [frameIdx, setFrameIdx] = useState<number>(0);
  const walkSequence = [0, 1, 0, 2];
  const [seqIndex, setSeqIndex] = useState<number>(0);

  useEffect(() => {
    if (!isHovering) {
      setFrameIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setSeqIndex((prev) => {
        const next = (prev + 1) % walkSequence.length;
        setFrameIdx(walkSequence[next]);
        return next;
      });
    }, 130); // ~8 FPS hover walk cycle
    return () => clearInterval(interval);
  }, [isHovering]);

  const frames = (asset.metadata?.frames as SpriteFrame[]) || [];
  const currentFrame = frames.find(
    (f) => (f.direction || 'down') === 'down' && (f.frameIndex ?? 0) === frameIdx
  );

  const atlasUrl = asset.atlasSource
    ? AssetPathResolver.resolve('atlases', asset.atlasSource)
    : asset.source;

  return (
    <div
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        const key = spriteKeyFromAsset(asset);
        e.dataTransfer.setData(
          'application/json',
          JSON.stringify({
            type: 'STUDIO_SPRITE_DROP',
            key,
            source: asset.source,
            id: asset.id,
          })
        );
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`relative group flex flex-col items-center justify-center p-2 rounded-lg border transition cursor-pointer select-none bg-[#0b1320]/80 ${
        isSelected
          ? 'border-[#806f47] ring-2 ring-amber-500/30 bg-[#050b14]/40'
          : isActive
          ? 'border-slate-600 bg-slate-800/80'
          : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
      }`}
    >
      {/* Thumbnail Sprite Canvas */}
      <div
        className={`relative flex items-center justify-center overflow-hidden ${
          gridSize === 'small' ? 'h-12' : gridSize === 'medium' ? 'h-16' : 'h-24'
        }`}
      >
        {currentFrame ? (
          <div
            style={{
              width: `${currentFrame.width}px`,
              height: `${currentFrame.height}px`,
              backgroundImage: `url('${atlasUrl}')`,
              backgroundPosition: `-${currentFrame.x}px -${currentFrame.y}px`,
              imageRendering: 'pixelated',
              transform: `scale(${gridSize === 'small' ? 1.5 : gridSize === 'medium' ? 2 : 3})`,
              transformOrigin: 'center center',
            }}
          />
        ) : (
          <img
            src={asset.source}
            alt={asset.id}
            className="max-h-full w-auto object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        )}
      </div>

      {/* Label & Subcategory Badge */}
      <div className="flex items-center justify-center gap-1 w-full mt-1">
        {(() => {
          const sub = (asset.metadata?.subcategory as CreatureAssetSubcategory) || classifyCreatureAsset(asset.source);
          if (!sub) return null;
          return (
            <span className="text-[7px] font-bold uppercase px-1 py-0.2 rounded bg-purple-950/90 border border-purple-500/40 text-purple-300">
              {CREATURE_SUBCATEGORY_LABELS[sub]?.replace(' Sprites', '').replace(' Sheets', '') || sub}
            </span>
          );
        })()}
        <span className="text-[9px] font-mono text-slate-400 truncate text-center group-hover:text-[#e2d5b3]">
          {asset.source.split('/').pop()?.replace('.png', '')}
        </span>
      </div>
    </div>
  );
};

export default SpriteBrowser;
