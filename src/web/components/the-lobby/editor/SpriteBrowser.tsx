'use client';

import React, { useState, useEffect } from 'react';
import { AssetManager, GameAssetItem, SpriteFrame } from '@/engine/assets/AssetManager';
import { AssetPathResolver } from '@/engine/assets/AssetPathResolver';
import { CharacterClassSystem, CharacterClassDefinition } from '@/game/CharacterClassSystem';
import SpritePreview from './SpritePreview';
import {
  Search,
  Check,
  RefreshCw,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { ASSET_PACKS, ASSET_PACK_LABELS, type AssetPackId } from '@/shared/game/assetPacks';

export interface SpriteBrowserProps {
  classDef?: CharacterClassDefinition;
  filterTags?: string[];
  filterType?: string;
  multiSelect?: boolean;
  selectedAssetIds?: string[];
  onSelect: (assets: GameAssetItem[]) => void;
  onClose?: () => void;
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
  const [packFilter, setPackFilter] = useState<AssetPackId | 'ALL'>('ALL');
  const [activeClassFilter, setActiveClassFilter] = useState<boolean>(!!classDef);
  const [gridSize, setGridSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(selectedAssetIds));
  const [previewAsset, setPreviewAsset] = useState<GameAssetItem | null>(null);

  useEffect(() => {
    setPage(0);
    void fetchSprites(0, false);
  }, [searchQuery, selectedTag, activeClassFilter, classDef, packFilter]);

  const fetchSprites = async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      let result: GameAssetItem[] = [];
      let more = false;
      let count = 0;
      const manager = AssetManager.getInstance();

      if (activeClassFilter && classDef) {
        const classSystem = CharacterClassSystem.getInstance();
        result = await classSystem.getSpritesForClass(classDef);
        more = false;
        count = result.length;
      } else {
        const res = await manager.searchAssets(
          {
            type: filterType,
            query: searchQuery || undefined,
            tags: selectedTag ? [selectedTag] : filterTags.length > 0 ? filterTags : undefined,
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
    const chosen = sprites.filter((s) => selectedIds.has(s.id));
    onSelect(chosen);
  };

  return (
    <div className="flex flex-col h-full bg-[#050b14] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Controls Toolbar */}
      <div className="p-3 bg-[#0b1320]/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search sprites by name or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#050b14] border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#806f47] font-mono"
          />
        </div>

        <select
          value={packFilter}
          onChange={(e) => setPackFilter(e.target.value as AssetPackId | 'ALL')}
          title="Approved packs"
          className="bg-[#050b14] border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#806f47]"
        >
          <option value="ALL">All packs</option>
          {ASSET_PACKS.map((p) => (
            <option key={p} value={p}>
              {ASSET_PACK_LABELS[p]}
            </option>
          ))}
        </select>

        {/* Class Filter Toggle */}
        {classDef && (
          <button
            onClick={() => setActiveClassFilter(!activeClassFilter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition ${
              activeClassFilter
                ? 'bg-[#806f47]/30 text-[#e2d5b3] border border-[#806f47]/50 shadow-sm'
                : 'bg-[#050b14] text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Class: {classDef.name}</span>
          </button>
        )}

        {/* Grid Size Toggle */}
        <div className="flex items-center gap-1 bg-[#050b14] p-1 rounded-lg border border-slate-800">
          {(['small', 'medium', 'large'] as const).map((size) => (
            <button
              key={size}
              onClick={() => setGridSize(size)}
              className={`px-2 py-0.5 text-[10px] font-mono capitalize rounded ${
                gridSize === size ? 'bg-amber-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
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

      {/* Label */}
      <span className="text-[9px] font-mono text-slate-400 truncate w-full text-center mt-1 group-hover:text-[#e2d5b3]">
        {asset.source.split('/').pop()?.replace('.png', '')}
      </span>
    </div>
  );
};

export default SpriteBrowser;
