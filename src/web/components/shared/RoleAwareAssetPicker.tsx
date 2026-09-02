'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AssetManager, GameAssetItem, SpriteFrame } from '@/engine/assets/AssetManager';
import { AssetPathResolver } from '@/engine/assets/AssetPathResolver';
import { AssetUploadView } from '@/web/components/the-lobby/editor/AssetUploadView';
import { SpritesheetSlicer } from '@/web/components/the-lobby/editor/SpritesheetSlicer';
import { CanonicalAssetPreview } from '@/web/components/shared/CanonicalAssetPreview';
import {
  X,
  Search,
  Upload,
  Scissors,
  Sparkles,
  Image as ImageIcon,
  Boxes,
  Check,
  RefreshCw,
  User,
  PawPrint,
  Skull,
  Link2,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';
import { AssetImportProfileId } from '@/shared/game/assetImportProfiles';

export interface RoleAwareAssetPickerProps {
  entityType: 'CHARACTER' | 'CREATURE' | 'MONSTER';
  assetRole: string;
  onSelectAsset: (asset: GameAssetItem) => void;
  onCancel: () => void;
}

type CategoryTab = 'ALL' | 'HEROES' | 'CREATURES' | 'MONSTERS' | 'NPC' | 'CUSTOM';

export function RoleAwareAssetPicker({
  entityType,
  assetRole,
  onSelectAsset,
  onCancel,
}: RoleAwareAssetPickerProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'upload' | 'manual' | 'slicer'>('catalog');
  const [categoryFilter, setCategoryFilter] = useState<CategoryTab>(
    entityType === 'CREATURE' ? 'CREATURES' : 'HEROES'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [assets, setAssets] = useState<GameAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState<GameAssetItem | null>(null);
  const [slicerSource, setSlicerSource] = useState<{ id: string; filename: string; storagePath: string } | undefined>();
  const [manualPath, setManualPath] = useState('');

  const importProfile: AssetImportProfileId = entityType === 'CHARACTER' ? 'character' : 'creature';

  const fetchAssets = async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const manager = AssetManager.getInstance();

      let typeParam: string | undefined = undefined;
      if (categoryFilter === 'HEROES') typeParam = 'CHARACTER';
      else if (categoryFilter === 'CREATURES') typeParam = 'CREATURE';
      else if (categoryFilter === 'MONSTERS') typeParam = 'MONSTER';

      const res = await manager.searchAssets(
        {
          type: typeParam,
          query: searchQuery.trim() || undefined,
          sortBy: 'source',
          sortOrder: 'asc',
        },
        pageNum,
        40
      );

      let items = res.items || [];

      // Custom uploads filter
      if (categoryFilter === 'CUSTOM') {
        items = items.filter(
          (a) => (a.tags || []).includes('uploaded') || (a.tags || []).includes('custom_manual') || (a.source || '').includes('/uploads/')
        );
      } else if (categoryFilter === 'NPC') {
        items = items.filter(
          (a) => (a.tags || []).includes('npc') || (a.source || '').includes('/npc/')
        );
      }

      setAssets((prev) => (append ? [...prev, ...items] : items));
      setHasMore(res.hasMore);
      setTotal(res.total);
      setPage(pageNum);

      if (!append && items.length > 0) {
        setSelectedAsset((prev) => (prev ? prev : items[0]));
      }
    } catch (err) {
      console.error('[RoleAwareAssetPicker] Failed to fetch assets:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setPage(0);
    const debounce = setTimeout(() => {
      void fetchAssets(0, false);
    }, 150);
    return () => clearTimeout(debounce);
  }, [categoryFilter, searchQuery]);

  const handleConfirm = () => {
    if (!selectedAsset) return;
    soundSynth?.playSelectSound?.();
    onSelectAsset(selectedAsset);
  };

  const handleUploadComplete = (data: any) => {
    AssetManager.getInstance().broadcastRefresh();
    const asset = data?.gameAsset || data?.usableAsset || data?.asset || data;
    if (asset && (asset.id || asset.source || asset.storagePath)) {
      const formatted = (AssetManager.getInstance() as any).hydrate
        ? (AssetManager.getInstance() as any).hydrate(asset)
        : asset;
      onSelectAsset(formatted as GameAssetItem);
    }
  };

  const handleOpenSlicer = (source: { id: string; filename: string; storagePath: string }) => {
    setSlicerSource(source);
    setActiveTab('slicer');
  };

  const handleSlicerComplete = (slicedAssets: GameAssetItem[]) => {
    if (slicedAssets.length > 0) {
      const match = slicedAssets.find((a) => a.metadata?.slotRole === assetRole);
      onSelectAsset(match || slicedAssets[0]);
    } else {
      setActiveTab('catalog');
    }
  };

  const handleManualConfirm = () => {
    if (!manualPath.trim()) return;
    const clean = manualPath.trim();
    const customAsset: GameAssetItem = {
      id: clean.split('/').pop()?.replace(/\.[^/.]+$/, '') || `asset_${Date.now()}`,
      gameId: null,
      source: clean,
      type: entityType === 'CHARACTER' ? 'CHARACTER' : 'CREATURE',
      atlasSource: null,
      atlasFrame: null,
      tags: ['custom_manual'],
      categories: ['custom'],
      metadata: { originalName: clean, slotRole: assetRole },
      customLabels: null,
      isActive: true,
      usageCount: 0,
      fileSize: 0,
      cdnUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    onSelectAsset(customAsset);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md">
      {/* ─── COMPACT OS WINDOW FRAME ─── */}
      <div className="bg-[#050b14]/95 border border-border/50 rounded-xl shadow-[0_0_32px_rgba(203,178,106,0.12),0_12px_40px_rgba(0,0,0,0.8)] flex flex-col w-full max-w-4xl h-[620px] max-h-[85vh] overflow-hidden backdrop-blur-2xl font-mono text-xs">
        
        {/* Title Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-primary/15 via-[#0a1628] to-[#050b14] border-b border-border/40 select-none shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Traffic Lights */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 border border-rose-400/40" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 border border-amber-400/40" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 border border-emerald-400/40" />
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <ImageIcon className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="font-bold tracking-wider uppercase text-foreground truncate">
                Asset Selector — {entityType === 'CHARACTER' ? 'Character Sprite' : 'Creature Sheet'}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-primary/20 text-primary border border-primary/40 text-[10px] font-bold uppercase">
                {assetRole || 'DEFAULT'}
              </span>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="p-1 text-muted-foreground hover:text-white hover:bg-muted/40 rounded transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 bg-[#08101e]/90 gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-2.5 py-1 rounded-md transition flex items-center gap-1.5 cursor-pointer text-[11px] ${
                activeTab === 'catalog'
                  ? 'bg-primary/20 text-primary border border-primary/40 font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-white hover:bg-muted/30'
              }`}
            >
              <Boxes className="w-3 h-3" />
              <span>Catalog Explorer</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('upload');
                setSlicerSource(undefined);
              }}
              className={`px-2.5 py-1 rounded-md transition flex items-center gap-1.5 cursor-pointer text-[11px] ${
                activeTab === 'upload'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-white hover:bg-muted/30'
              }`}
            >
              <Upload className="w-3 h-3" />
              <span>Upload Custom</span>
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-2.5 py-1 rounded-md transition flex items-center gap-1.5 cursor-pointer text-[11px] ${
                activeTab === 'manual'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-white hover:bg-muted/30'
              }`}
            >
              <Link2 className="w-3 h-3" />
              <span>Direct Path / URL</span>
            </button>
            {slicerSource && (
              <button
                onClick={() => setActiveTab('slicer')}
                className={`px-2.5 py-1 rounded-md transition flex items-center gap-1.5 cursor-pointer text-[11px] ${
                  activeTab === 'slicer'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold shadow-sm'
                    : 'text-muted-foreground hover:text-white hover:bg-muted/30'
                }`}
              >
                <Scissors className="w-3 h-3" />
                <span>Slicer</span>
              </button>
            )}
          </div>

          <span className="text-[10px] text-muted-foreground">
            {total > 0 ? `${total} Assets Available` : 'Ready'}
          </span>
        </div>

        {/* ─── TAB 1: CATALOG EXPLORER ─── */}
        {activeTab === 'catalog' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#050b14]">
            {/* Filter Bar & Search */}
            <div className="p-2.5 bg-[#0a1628]/80 border-b border-border/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5">
                {[
                  { id: 'ALL', label: 'All', icon: Boxes },
                  { id: 'HEROES', label: 'Heroes', icon: User },
                  { id: 'CREATURES', label: 'Creatures', icon: PawPrint },
                  { id: 'MONSTERS', label: 'Monsters', icon: Skull },
                  { id: 'NPC', label: 'NPCs', icon: User },
                  { id: 'CUSTOM', label: 'Uploads', icon: Sparkles },
                ].map((c) => {
                  const Icon = c.icon;
                  const isSelected = categoryFilter === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        soundSynth?.playUiClick?.();
                        setCategoryFilter(c.id as CategoryTab);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 transition cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                          : 'bg-[#050b14] border border-border/40 text-muted-foreground hover:text-white'
                      }`}
                    >
                      <Icon className="w-2.5 h-2.5" />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Search Input */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search assets..."
                  className="w-full pl-7 pr-6 py-1 bg-[#050b14] border border-border/50 rounded-md text-foreground placeholder:text-muted-foreground text-xs outline-none focus:border-primary"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Split Content: Main Grid + Side Inspector */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* Asset Grid (Left) */}
              <div className="flex-1 p-2.5 overflow-y-auto custom-scrollbar">
                {loading && assets.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                    <span>Loading assets...</span>
                  </div>
                ) : assets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 p-6 text-center">
                    <Sparkles className="w-6 h-6 text-muted-foreground/60" />
                    <span>No sprite assets found for &quot;{searchQuery || categoryFilter}&quot;.</span>
                    <button
                      onClick={() => {
                        setCategoryFilter('ALL');
                        setSearchQuery('');
                      }}
                      className="text-primary underline text-[11px] mt-1 cursor-pointer"
                    >
                      Reset Filters &amp; View All
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {assets.map((asset) => {
                      const isSelected = selectedAsset?.id === asset.id;
                      const frames = (asset.metadata?.frames as SpriteFrame[]) || [];
                      const firstFrame = frames[0];
                      const atlasUrl = asset.atlasSource
                        ? AssetPathResolver.resolve('atlases', asset.atlasSource)
                        : asset.source;

                      return (
                        <div
                          key={asset.id}
                          onClick={() => {
                            soundSynth?.playSelectSound?.();
                            setSelectedAsset(asset);
                          }}
                          onDoubleClick={() => {
                            onSelectAsset(asset);
                          }}
                          className={`group relative p-2 rounded-lg border flex flex-col items-center justify-between gap-1.5 transition cursor-pointer select-none ${
                            isSelected
                              ? 'bg-primary/20 border-primary ring-1 ring-primary/40 shadow-sm'
                              : 'bg-[#0a1628]/60 border-border/40 hover:bg-[#0a1628]/90 hover:border-primary/40'
                          }`}
                        >
                          {/* Image Thumbnail */}
                          <div className="w-full h-16 flex items-center justify-center overflow-hidden rounded bg-[#050b14]/80 p-1">
                            {firstFrame ? (
                              <div
                                style={{
                                  width: `${firstFrame.width}px`,
                                  height: `${firstFrame.height}px`,
                                  backgroundImage: `url('${atlasUrl}')`,
                                  backgroundPosition: `-${firstFrame.x}px -${firstFrame.y}px`,
                                  imageRendering: 'pixelated',
                                  transform: 'scale(1.8)',
                                  transformOrigin: 'center center',
                                }}
                              />
                            ) : (
                              <img
                                src={asset.source}
                                alt={asset.id}
                                className="max-h-full max-w-full object-contain"
                                style={{ imageRendering: 'pixelated' }}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            )}
                          </div>

                          {/* Asset Name Label */}
                          <div className="w-full text-center">
                            <div className="text-[10px] font-bold text-foreground truncate group-hover:text-primary">
                              {asset.metadata?.originalName || asset.id.split('/').pop()?.replace('.png', '')}
                            </div>
                            <span className="text-[9px] text-muted-foreground font-mono">
                              {asset.type || 'SPRITE'}
                            </span>
                          </div>

                          {isSelected && (
                            <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Side Inspector & Confirmation (Right) */}
              <div className="w-60 bg-[#08101e] border-l border-border/40 p-3 flex flex-col justify-between shrink-0">
                <div className="space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Selected Preview
                  </div>

                  {selectedAsset ? (
                    <div className="space-y-2.5">
                      {/* Live 3D / 2D Canvas Preview */}
                      <div className="h-32 rounded-lg border border-border/50 bg-[#050b14] overflow-hidden shadow-inner">
                        <CanonicalAssetPreview asset={selectedAsset} role={assetRole || 'idle'} />
                      </div>

                      <div className="space-y-1 bg-[#050b14] p-2 rounded-md border border-border/40 text-[10px]">
                        <div className="text-foreground font-bold truncate">
                          {selectedAsset.metadata?.originalName || selectedAsset.id}
                        </div>
                        <div className="text-muted-foreground truncate">
                          Type: <span className="text-primary font-bold">{selectedAsset.type}</span>
                        </div>
                        <div className="text-muted-foreground truncate">
                          Path: <span className="font-mono text-slate-300">{selectedAsset.source}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 rounded-lg border border-border/40 bg-[#050b14] flex items-center justify-center text-muted-foreground text-center p-2 text-[10px]">
                      Select an asset to view details
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="space-y-1.5 pt-2 border-t border-border/40">
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!selectedAsset}
                    className="w-full py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-md shadow-primary/20"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Select This Sprite</span>
                  </button>

                  <button
                    type="button"
                    onClick={onCancel}
                    className="w-full py-1.5 rounded-lg border border-border/40 text-muted-foreground hover:text-white text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: UPLOAD CUSTOM ASSET ─── */}
        {activeTab === 'upload' && (
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#050b14]">
            <AssetUploadView
              initialAssetType={entityType === 'CHARACTER' ? 'CHARACTER' : 'CREATURE'}
              initialImportProfile={importProfile}
              initialSlotRole={assetRole}
              onUploadComplete={handleUploadComplete}
              onOpenSlicer={handleOpenSlicer}
            />
          </div>
        )}

        {/* ─── TAB 3: DIRECT PATH / URL ─── */}
        {activeTab === 'manual' && (
          <div className="flex-1 p-6 flex flex-col items-center justify-center max-w-lg mx-auto space-y-4 bg-[#050b14] text-center">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center mx-auto">
              <Link2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground">Direct Sprite Path or URL</h3>
              <p className="text-[11px] text-muted-foreground">
                Enter any local asset path (e.g. <code className="text-primary">/game-assets/npc/evil-berserker-bloodaxe-male.png</code>) or public URL.
              </p>
            </div>

            <div className="w-full space-y-2">
              <input
                type="text"
                value={manualPath}
                onChange={(e) => setManualPath(e.target.value)}
                placeholder="/game-assets/npc/my-hero.png"
                className="w-full px-3 py-2 bg-[#08101e] border border-border/60 focus:border-primary rounded-lg text-foreground font-mono text-xs outline-none"
              />

              <button
                type="button"
                onClick={handleManualConfirm}
                disabled={!manualPath.trim()}
                className="w-full py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition disabled:opacity-50 cursor-pointer"
              >
                Apply Custom Sprite Path
              </button>
            </div>
          </div>
        )}

        {/* ─── TAB 4: SPRITESHEET SLICER ─── */}
        {activeTab === 'slicer' && slicerSource && (
          <div className="flex-1 flex flex-col bg-[#050b14]">
            <div className="p-2 border-b border-border/40 bg-[#08101e] flex justify-end">
              <button
                onClick={() => setActiveTab('upload')}
                className="px-2.5 py-1 text-xs font-mono font-semibold text-muted-foreground bg-muted/40 hover:bg-muted rounded transition cursor-pointer"
              >
                Cancel Slicing
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <SpritesheetSlicer
                sourceAsset={slicerSource}
                defaultImportProfile={importProfile}
                onSliceComplete={handleSlicerComplete}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
