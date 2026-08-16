'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Grid,
  List,
  RefreshCw,
  Edit2,
  Folder,
  CheckSquare,
  Square,
  Sparkles,
  Copy,
  Scissors,
  ExternalLink,
  Layers,
  ImageIcon,
  Sword,
  PawPrint,
  Music,
  Check,
  Package,
  ZoomIn,
  ZoomOut,
  SlidersHorizontal,
} from 'lucide-react';
import { AssetManager, GameAssetItem } from '@/engine/assets/AssetManager';
import { ASSET_PACKS, ASSET_PACK_LABELS, type AssetPackId } from '@/shared/game/assetPacks';
import { soundSynth } from '@/engine/sound-synth';
import { useGameStore } from '../store';

export interface AssetEditorProps {
  onAssetSelect?: (asset: GameAssetItem) => void;
  onAssetEdit?: (asset: GameAssetItem) => void;
  onOpenSlicer?: (asset: { id: string; filename: string; storagePath: string }) => void;
}

export default function AssetEditor({ onAssetSelect, onAssetEdit, onOpenSlicer }: AssetEditorProps) {
  const showToast = useGameStore((s) => s.showToast);

  const [assets, setAssets] = useState<GameAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [packFilter, setPackFilter] = useState<AssetPackId | 'ALL'>('ALL');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [activeAsset, setActiveAsset] = useState<GameAssetItem | null>(null);
  const [savingFlags, setSavingFlags] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<'1x' | '2x' | '4x'>('2x');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Reclassify Modal State
  const [reclassifyModalOpen, setReclassifyModalOpen] = useState(false);
  const [reclassifyType, setReclassifyType] = useState('SPRITE');
  const [reclassifyCategories, setReclassifyCategories] = useState('npcs,heroes');
  const [newTagInput, setNewTagInput] = useState('');

  useEffect(() => {
    setPage(0);
    void fetchAssets(0, false);
  }, [typeFilter, searchQuery, selectedTag, packFilter]);

  const fetchAssets = async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const manager = AssetManager.getInstance();
      const res = await manager.searchAssets(
        {
          type: typeFilter === 'ALL' ? undefined : typeFilter,
          query: searchQuery || undefined,
          tags: selectedTag ? [selectedTag] : undefined,
          pack: packFilter === 'ALL' ? undefined : packFilter,
          sortBy: 'source',
          sortOrder: 'asc',
        },
        pageNum,
        50
      );
      setAssets((prev) => (append ? [...prev, ...res.items] : res.items));
      setHasMore(res.hasMore);
      setTotal(res.total);
      setPage(pageNum);
      if (!append && res.items.length > 0) {
        setActiveAsset(res.items[0]);
      }
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const toggleSelectAsset = (id: string) => {
    soundSynth?.playUiClick?.();
    const updated = new Set(selectedAssetIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedAssetIds(updated);
  };

  const selectAll = () => {
    soundSynth?.playUiClick?.();
    if (selectedAssetIds.size === assets.length) {
      setSelectedAssetIds(new Set());
    } else {
      setSelectedAssetIds(new Set(assets.map((a) => a.id)));
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    soundSynth?.playActionSound?.();
    try {
      void navigator.clipboard?.writeText(text);
      setCopiedKey(label);
      showToast(`Copied ${label} to clipboard`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      showToast(`Selected: ${text}`);
    }
  };

  const handleAddTag = async () => {
    if (!activeAsset || !newTagInput.trim()) return;
    try {
      soundSynth?.playActionSound?.();
      const manager = AssetManager.getInstance();
      await manager.addTag(activeAsset.id, newTagInput.trim().toLowerCase());
      setNewTagInput('');
      void fetchAssets(0, false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!activeAsset) return;
    try {
      soundSynth?.playUiClick?.();
      const manager = AssetManager.getInstance();
      await manager.removeTag(activeAsset.id, tagToRemove);
      void fetchAssets(0, false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReclassifySubmit = async () => {
    if (selectedAssetIds.size === 0 && !activeAsset) return;
    const idsToReclassify = selectedAssetIds.size > 0 ? Array.from(selectedAssetIds) : [activeAsset!.id];
    const cats = reclassifyCategories.split(',').map((c) => c.trim()).filter(Boolean);

    try {
      soundSynth?.playActionSound?.();
      const manager = AssetManager.getInstance();
      for (const id of idsToReclassify) {
        await manager.reclassifyAsset(id, reclassifyType, cats);
      }
      setReclassifyModalOpen(false);
      void fetchAssets(0, false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGameplayFlag = async (flag: 'solid' | 'interactable' | 'decorative', value: boolean) => {
    if (!activeAsset) return;
    setSavingFlags(true);
    try {
      soundSynth?.playActionSound?.();
      const manager = AssetManager.getInstance();
      const updated = await manager.updateGameplayFlags(activeAsset.id, { [flag]: value });
      setActiveAsset(updated);
      setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      onAssetEdit?.(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingFlags(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050b14] text-slate-100 font-mono rounded-2xl overflow-hidden border border-amber-500/30 shadow-2xl">
      {/* Top Action & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between p-3 bg-[#0b1320] border-b border-amber-500/20 gap-3">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-amber-400" />
            <input
              type="text"
              placeholder="Search assets, paths, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/60 border border-amber-500/30 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-200 text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              soundSynth?.playUiClick?.();
              setTypeFilter(e.target.value);
            }}
            className="bg-black/60 border border-amber-500/30 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="ALL">All Asset Types</option>
            <option value="SPRITE">Sprites (NPC / Player)</option>
            <option value="TILESET">Tilesets & Terrains</option>
            <option value="ITEM_ICON">Item & Tool Icons</option>
            <option value="MONSTER">Monsters & Souls</option>
            <option value="AUDIO">Audio & SFX</option>
            <option value="UI_ELEMENT">UI Elements</option>
          </select>

          {/* Pack Filter */}
          <select
            value={packFilter}
            onChange={(e) => {
              soundSynth?.playUiClick?.();
              setPackFilter(e.target.value as AssetPackId | 'ALL');
            }}
            title="Asset Pack Filter"
            className="bg-black/60 border border-amber-500/30 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="ALL">All Asset Packs</option>
            {ASSET_PACKS.map((p) => (
              <option key={p} value={p}>
                {ASSET_PACK_LABELS[p]}
              </option>
            ))}
          </select>

          {selectedTag && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-950/60 border border-amber-500/50 text-amber-200 rounded-xl text-xs font-bold shadow-inner">
              <span>#{selectedTag}</span>
              <button
                onClick={() => {
                  soundSynth?.playUiClick?.();
                  setSelectedTag(null);
                }}
                className="hover:text-rose-400 font-bold ml-0.5 cursor-pointer"
              >
                ×
              </button>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedAssetIds.size > 0 && (
            <button
              onClick={() => {
                soundSynth?.playSelectSound?.();
                setReclassifyModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reclassify ({selectedAssetIds.size})
            </button>
          )}

          <div className="flex items-center border border-amber-500/30 rounded-xl bg-black/60 overflow-hidden">
            <button
              onClick={() => {
                soundSynth?.playUiClick?.();
                setViewMode('grid');
              }}
              className={`p-1.5 cursor-pointer transition ${
                viewMode === 'grid' ? 'bg-amber-400 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                soundSynth?.playUiClick?.();
                setViewMode('list');
              }}
              className={`p-1.5 cursor-pointer transition ${
                viewMode === 'list' ? 'bg-amber-400 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Category & Pack Navigation Sidebar */}
        <div className="w-60 bg-[#0b1320]/90 border-r border-slate-800/80 p-3.5 flex flex-col gap-5 overflow-y-auto shrink-0">
          {/* Quick Packs Navigation */}
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> Asset Bundles
            </span>
            <div className="flex flex-col gap-1 text-xs">
              <button
                onClick={() => setPackFilter('ALL')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all ${
                  packFilter === 'ALL'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span>All Bundles</span>
                <span className="text-[10px] text-slate-500">{total || ''}</span>
              </button>
              {ASSET_PACKS.map((packKey) => (
                <button
                  key={packKey}
                  onClick={() => setPackFilter(packKey)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all ${
                    packFilter === packKey
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <span className="truncate">{ASSET_PACK_LABELS[packKey]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Asset Classification Categories */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" /> Categories
            </span>
            <div className="flex flex-col gap-1 text-xs">
              {[
                { id: 'ALL', label: 'All Types', icon: Layers },
                { id: 'SPRITE', label: 'Sprites & Heroes', icon: ImageIcon },
                { id: 'TILESET', label: 'Tilesets & Ground', icon: Grid },
                { id: 'MONSTER', label: 'Monsters & Souls', icon: PawPrint },
                { id: 'ITEM_ICON', label: 'Items & Tools', icon: Sword },
                { id: 'AUDIO', label: 'Audio & Music', icon: Music },
              ].map((cat) => {
                const IconComp = cat.icon;
                const isSelected = typeFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setTypeFilter(cat.id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'bg-purple-950/50 text-amber-300 font-bold border border-purple-500/40'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Tags Filter */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Popular Tags</span>
            <div className="flex flex-wrap gap-1.5">
              {['terrain', 'npc', 'hero', 'creature', 'combat', 'civilian', 'tool', 'resource', 'dungeon'].map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTag(t === selectedTag ? null : t)}
                  className={`text-[10px] px-2.5 py-0.5 rounded-full border transition-all ${
                    selectedTag === t
                      ? 'bg-amber-400 text-slate-950 font-bold border-amber-400 shadow'
                      : 'bg-black/40 border-slate-700 text-slate-300 hover:border-amber-400/50'
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center Grid / List Display */}
        <div className="flex-1 p-4 overflow-y-auto bg-[#050b14] custom-scrollbar flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
              <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
              <span>Querying Asset Catalog...</span>
            </div>
          ) : assets.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-xs text-slate-500 italic p-8 text-center space-y-2">
              <Folder className="w-8 h-8 text-slate-600 mx-auto" />
              <p>No assets found matching the selected filter criteria.</p>
              <button
                onClick={() => {
                  setTypeFilter('ALL');
                  setPackFilter('ALL');
                  setSearchQuery('');
                  setSelectedTag(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs transition"
              >
                Clear Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {assets.map((asset) => {
                const isSelected = selectedAssetIds.has(asset.id);
                const isActive = activeAsset?.id === asset.id;
                const fileName = asset.source.split('/').pop() || asset.id;
                return (
                  <div
                    key={asset.id}
                    onClick={() => {
                      setActiveAsset(asset);
                      if (onAssetSelect) onAssetSelect(asset);
                    }}
                    className={`group relative aspect-square bg-[#0b1320] border rounded-xl p-2 flex flex-col items-center justify-between cursor-pointer transition-all hover:scale-[1.02] hover:border-amber-400 hover:shadow-lg ${
                      isActive
                        ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-950/20'
                        : 'border-slate-800/80 hover:bg-slate-850'
                    }`}
                  >
                    {/* Selection Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectAsset(asset.id);
                      }}
                      className="absolute top-1.5 left-1.5 z-10 text-slate-500 hover:text-amber-300 transition"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Square className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                      )}
                    </button>

                    {/* Format Badge */}
                    <span className="absolute top-1.5 right-1.5 text-[8px] uppercase tracking-wider px-1 py-0.2 rounded bg-black/80 border border-slate-700 text-slate-400">
                      {asset.type.substring(0, 4)}
                    </span>

                    {/* Image Preview with Checkered Canvas Background */}
                    <div className="w-full flex-1 flex items-center justify-center overflow-hidden my-1 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:8px_8px] rounded-lg p-1">
                      <img
                        src={asset.source}
                        alt={asset.id}
                        className="max-w-full max-h-full object-contain"
                        style={{ imageRendering: 'pixelated' }}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>

                    {/* Title */}
                    <span className="text-[10px] text-slate-300 truncate w-full text-center font-medium">
                      {fileName.replace(/\.(png|jpg|webp)$/i, '')}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="flex flex-col gap-1.5">
              {assets.map((asset) => {
                const isActive = activeAsset?.id === asset.id;
                const fileName = asset.source.split('/').pop() || asset.id;
                return (
                  <div
                    key={asset.id}
                    onClick={() => {
                      setActiveAsset(asset);
                      if (onAssetSelect) onAssetSelect(asset);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isActive
                        ? 'bg-amber-950/30 border-amber-400/60 shadow-md'
                        : 'bg-[#0b1320] border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-black/60 border border-slate-800 flex items-center justify-center p-1 overflow-hidden shrink-0">
                        <img
                          src={asset.source}
                          alt=""
                          className="max-w-full max-h-full object-contain"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-200 truncate">{fileName}</span>
                        <span className="text-[10px] text-slate-400 truncate">
                          {asset.source} • <strong className="text-amber-300">{asset.type}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {asset.tags.slice(0, 3).map((t) => (
                        <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-black/60 border border-slate-800 text-slate-400">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Load More */}
          {!loading && assets.length > 0 && (
            <div className="mt-6 flex flex-col items-center gap-2 pb-4">
              <span className="text-xs text-slate-400">
                Showing <strong className="text-white">{assets.length}</strong> of <strong className="text-amber-400">{total}</strong> assets
              </span>
              {hasMore && (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void fetchAssets(page + 1, true)}
                  className="px-5 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs font-bold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50 transition cursor-pointer"
                >
                  {loadingMore ? 'Loading Assets…' : 'Load More Assets'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Asset Inspector Pane */}
        {activeAsset && (
          <div className="w-80 bg-[#0b1320]/95 border-l border-slate-800/80 p-5 flex flex-col gap-4 overflow-y-auto shrink-0 custom-scrollbar">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Asset Inspector
              </span>
              <div className="flex items-center gap-1">
                {(['1x', '2x', '4x'] as const).map((z) => (
                  <button
                    key={z}
                    onClick={() => setPreviewZoom(z)}
                    className={`px-1.5 py-0.5 text-[9px] rounded font-bold transition ${
                      previewZoom === z ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {z}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkered Canvas Preview Box */}
            <div className="w-full aspect-square bg-[#050b14] bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] border border-slate-800 rounded-2xl flex items-center justify-center p-4 relative overflow-hidden shadow-inner">
              <img
                src={activeAsset.source}
                alt=""
                className={`max-w-full max-h-full object-contain transition-transform ${
                  previewZoom === '1x' ? 'scale-100' : previewZoom === '2x' ? 'scale-150' : 'scale-250'
                }`}
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            {/* Source & Copy Actions */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-300 truncate">
                {activeAsset.source.split('/').pop()}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(activeAsset.source, 'Path')}
                  className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] text-slate-300 flex items-center justify-center gap-1 transition"
                >
                  {copiedKey === 'Path' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-amber-400" />}
                  <span>Copy Path</span>
                </button>
                {onOpenSlicer && (
                  <button
                    onClick={() =>
                      onOpenSlicer({
                        id: activeAsset.id,
                        filename: activeAsset.source.split('/').pop() || activeAsset.id,
                        storagePath: activeAsset.source,
                      })
                    }
                    className="py-1.5 px-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-[10px] text-amber-300 flex items-center justify-center gap-1 transition font-semibold"
                    title="Open in Slicer"
                  >
                    <Scissors className="w-3 h-3" /> Slicer
                  </button>
                )}
              </div>
            </div>

            {/* Info Table */}
            <div className="flex flex-col gap-1.5 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Classification</span>
                <span className="text-amber-300 font-bold">{activeAsset.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Categories</span>
                <span className="text-slate-200">{activeAsset.categories?.join(', ') || 'General'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Frames</span>
                <span className="text-slate-200">
                  {Array.isArray(activeAsset.metadata?.frames) ? activeAsset.metadata.frames.length : 1}
                </span>
              </div>
            </div>

            {/* Gameplay Flags */}
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gameplay Collision & Flags</span>
              <div className="flex flex-col gap-1.5">
                {(
                  [
                    ['solid', 'Solid (blocks walk)'],
                    ['interactable', 'Interactable'],
                    ['decorative', 'Decorative'],
                  ] as const
                ).map(([flag, label]) => (
                  <label key={flag} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={savingFlags}
                      checked={!!activeAsset.metadata?.[flag]}
                      onChange={(e) => void handleGameplayFlag(flag, e.target.checked)}
                      className="accent-amber-400 rounded cursor-pointer"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Tags Panel */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tags</span>
              <div className="flex flex-wrap gap-1">
                {activeAsset.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg text-[10px]"
                  >
                    #{t}
                    <button onClick={() => handleRemoveTag(t)} className="text-slate-500 hover:text-rose-400 ml-0.5 font-bold">
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-1.5 mt-1">
                <input
                  type="text"
                  placeholder="Add custom tag..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  className="flex-1 bg-black/60 border border-slate-700 rounded-xl px-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                />
                <button
                  onClick={handleAddTag}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 mt-auto pt-2">
              <button
                onClick={() => setReclassifyModalOpen(true)}
                className="w-full py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reclassify Asset
              </button>
              {onAssetSelect && (
                <button
                  onClick={() => onAssetSelect(activeAsset)}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Use Asset in Canvas
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reclassify Modal */}
      {reclassifyModalOpen && (
        <div className="pointer-events-auto fixed inset-0 z-[250] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-[#0b1320] border border-purple-500/50 p-6 rounded-2xl w-full max-w-md shadow-2xl flex flex-col gap-4">
            <span className="text-purple-400 font-bold text-sm tracking-wider flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> [ RECLASSIFY GAME ASSET ]
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Fix classification by reassigning asset type and categories across selected items ({selectedAssetIds.size || 1}).
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">Target Asset Type</label>
              <select
                value={reclassifyType}
                onChange={(e) => setReclassifyType(e.target.value)}
                className="bg-black/60 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="SPRITE">SPRITE (NPC / Hero Character)</option>
                <option value="TILESET">TILESET (Terrain / Environment)</option>
                <option value="ITEM_ICON">ITEM_ICON (Inventory Icon)</option>
                <option value="MONSTER">MONSTER (Creature Beast)</option>
                <option value="AUDIO">AUDIO (SFX / Music)</option>
                <option value="UI_ELEMENT">UI_ELEMENT (Menu Graphics)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">Categories (comma-separated)</label>
              <input
                type="text"
                value={reclassifyCategories}
                onChange={(e) => setReclassifyCategories(e.target.value)}
                className="bg-black/60 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                placeholder="npcs, heroes, civilians"
              />
            </div>

            <div className="flex justify-end gap-2.5 mt-2">
              <button
                onClick={() => setReclassifyModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleReclassifySubmit}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg"
              >
                Apply Reclassification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
