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
  Copy,
  Scissors,
  Layers,
  ImageIcon,
  Sword,
  PawPrint,
  Music,
  Check,
  Package,
  SlidersHorizontal,
  Plus,
  LayoutGrid,
  Users,
  MapPin,
  Sparkles,
  Shield,
  Tag,
  Filter,
} from 'lucide-react';
import { AssetManager, GameAssetItem } from '@/engine/assets/AssetManager';
import { ASSET_PACKS, ASSET_PACK_LABELS, type AssetPackId, inferAssetPack } from '@/shared/game/assetPacks';
import { classifyCreatureAsset, CREATURE_SUBCATEGORY_LABELS, type CreatureAssetSubcategory } from '@/shared/game/creatureCatalog';
import {
  CHARACTER_COMPONENT_CATEGORIES,
  listCharacterComponentCategories,
} from '@/shared/game/assetImportProfiles';
import { soundSynth } from '@/engine/sound-synth';
import { useGameStore } from '../store';
import { useEditorStore } from './editor-store';
import { SpriteThumbnail } from './SpriteThumbnail';
import type { AssetWorkspaceId } from './AssetStudioSuite';
import { AssetContextMenu } from './AssetContextMenu';

export interface AssetEditorProps {
  workspaceId?: AssetWorkspaceId;
  initialTypeFilter?: string;
  initialPackFilter?: AssetPackId | 'ALL';
  onAssetSelect?: (asset: GameAssetItem) => void;
  onAssetEdit?: (asset: GameAssetItem) => void;
  onOpenSlicer?: (asset: { id: string; filename: string; storagePath: string }) => void;
}

const BUNDLE_THEMES: Record<AssetPackId | 'ALL', { label: string; activeColor: string; badgeColor: string }> = {
  ALL: {
    label: 'All Bundles',
    activeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/10',
    badgeColor: 'bg-amber-950/80 border-amber-500/40 text-amber-300',
  },
  legacy: {
    label: 'Legacy / Saints',
    activeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sky-500/10',
    badgeColor: 'bg-sky-950/80 border-sky-500/40 text-sky-300',
  },
  modular: {
    label: 'Modular Sprites',
    activeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-500/10',
    badgeColor: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300',
  },
};

export default function AssetEditor({
  workspaceId = 'catalog',
  initialTypeFilter = 'ALL',
  initialPackFilter = 'ALL',
  onAssetSelect,
  onAssetEdit,
  onOpenSlicer,
}: AssetEditorProps) {
  const showToast = useGameStore((s) => s.showToast);

  const [assets, setAssets] = useState<GameAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(initialTypeFilter || 'ALL');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('ALL');
  const [modularFilter, setModularFilter] = useState<'ALL' | 'MODULAR' | 'FULL'>('ALL');
  const [componentCategoryFilter, setComponentCategoryFilter] = useState<string>('ALL');
  const [componentLayerFilter, setComponentLayerFilter] = useState<string>('ALL');
  const [packFilter, setPackFilter] = useState<AssetPackId | 'ALL'>(initialPackFilter || 'ALL');
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
  const [newDepInput, setNewDepInput] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; asset: GameAssetItem } | null>(null);
  const [reclassifyTargets, setReclassifyTargets] = useState<GameAssetItem[] | null>(null);

  // Sync initial type filter when workspace switches
  useEffect(() => {
    if (initialTypeFilter) {
      setTypeFilter(initialTypeFilter);
    }
  }, [initialTypeFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(0);
    void fetchAssets(0, false);
  }, [
    typeFilter,
    subcategoryFilter,
    modularFilter,
    componentCategoryFilter,
    componentLayerFilter,
    debouncedSearchQuery,
    selectedTag,
    packFilter,
  ]);

  useEffect(() => {
    const handleRefreshed = () => {
      setPage(0);
      void fetchAssets(0, false);
    };
    window.addEventListener('assets:refreshed', handleRefreshed);
    return () => window.removeEventListener('assets:refreshed', handleRefreshed);
  }, [
    typeFilter,
    subcategoryFilter,
    modularFilter,
    componentCategoryFilter,
    componentLayerFilter,
    debouncedSearchQuery,
    selectedTag,
    packFilter,
  ]);

  const fetchAssets = async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const manager = AssetManager.getInstance();
      const isSheetFilter = typeFilter === 'SHEET';
      const tagsToQuery = [
        ...(selectedTag ? [selectedTag] : []),
        ...(subcategoryFilter !== 'ALL' ? [subcategoryFilter] : []),
        ...(isSheetFilter ? ['sheet'] : []),
      ];
      const assetTypeFilter = isSheetFilter
        ? undefined
        : typeFilter === 'ALL'
        ? undefined
        : typeFilter;

      const res = await manager.searchAssets(
        {
          type: assetTypeFilter,
          query: debouncedSearchQuery || undefined,
          tags: tagsToQuery.length > 0 ? tagsToQuery : undefined,
          modular: modularFilter === 'MODULAR' ? true : modularFilter === 'FULL' ? false : undefined,
          componentCategory: componentCategoryFilter === 'ALL' ? undefined : componentCategoryFilter,
          componentLayer: componentLayerFilter === 'ALL' ? undefined : componentLayerFilter,
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

  const handleOpenReclassify = (targetAssets: GameAssetItem[]) => {
    setReclassifyTargets(targetAssets);
    if (targetAssets.length === 1) {
      setReclassifyType(targetAssets[0].type);
      setReclassifyCategories(targetAssets[0].categories.join(', '));
    } else {
      setReclassifyType('SPRITE');
      setReclassifyCategories('');
    }
    setReclassifyModalOpen(true);
  };

  const handleReclassifySubmit = async () => {
    const targets = reclassifyTargets || (selectedAssetIds.size > 0 
      ? assets.filter(a => selectedAssetIds.has(a.id)) 
      : activeAsset 
        ? [activeAsset] 
        : []);
    if (targets.length === 0) return;
    
    const idsToReclassify = targets.map(t => t.id);
    const cats = reclassifyCategories
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    try {
      soundSynth?.playActionSound?.();
      const manager = AssetManager.getInstance();
      for (const id of idsToReclassify) {
        await manager.reclassifyAsset(id, reclassifyType, cats);
      }
      setReclassifyModalOpen(false);
      setReclassifyTargets(null);
      void fetchAssets(0, false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAssets = async (assetsToDelete: GameAssetItem[]) => {
    if (assetsToDelete.length === 0) return;
    const confirmMsg =
      assetsToDelete.length === 1
        ? `Are you sure you want to delete/archive asset: ${assetsToDelete[0].source.split('/').pop()}?`
        : `Are you sure you want to delete/archive ${assetsToDelete.length} assets?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      soundSynth?.playActionSound?.();
      const manager = AssetManager.getInstance();
      const assetIds = assetsToDelete.map(a => a.id);
      const ok = await manager.batchDeleteAssets(assetIds);
      if (ok) {
        showToast(
          assetsToDelete.length === 1
            ? 'Asset deleted/archived successfully'
            : `${assetsToDelete.length} assets deleted/archived successfully`
        );
        setSelectedAssetIds((prev) => {
          const serapht = new Set(prev);
          assetIds.forEach(id => serapht.delete(id));
          return serapht;
        });
        if (activeAsset && assetIds.includes(activeAsset.id)) {
          setActiveAsset(null);
        }
        void fetchAssets(0, false);
      } else {
        showToast('Failed to delete some assets');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting assets');
    }
  };

  const handleToggleFlagFromMenu = async (asset: GameAssetItem, flag: 'solid' | 'interactable' | 'decorative', val: boolean) => {
    try {
      soundSynth?.playActionSound?.();
      const manager = AssetManager.getInstance();
      const updated = await manager.updateGameplayFlags(asset.id, { [flag]: val });
      setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      if (activeAsset && activeAsset.id === updated.id) {
        setActiveAsset(updated);
      }
      onAssetEdit?.(updated);
    } catch (err) {
      console.error(err);
      showToast('Failed to update gameplay flag');
    }
  };

  const handleAddTagFromMenu = async (asset: GameAssetItem, tag: string) => {
    try {
      soundSynth?.playActionSound?.();
      const manager = AssetManager.getInstance();
      await manager.addTag(asset.id, tag);
      void fetchAssets(0, false);
    } catch (err) {
      console.error(err);
      showToast('Failed to add tag');
    }
  };

  const handleToggleShowInCharacterCreation = async (asset: GameAssetItem, value: boolean) => {
    try {
      const manager = AssetManager.getInstance();
      await manager.toggleShowInCharacterCreation(asset.id, value);
      void fetchAssets(0, false);
    } catch (err) {
      console.error(err);
      showToast('Failed to update character creation flag');
    }
  };

  const handleGameplayFlag = async (
    flag: 'solid' | 'interactable' | 'decorative',
    value: boolean
  ) => {
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

  const handleUpdatePreload = async (preloadGroup: string | null, priority: string) => {
    if (!activeAsset) return;
    try {
      soundSynth?.playActionSound?.();
      const manager = AssetManager.getInstance();
      await manager.updateAssetPreload(activeAsset.id, preloadGroup, priority);
      const updated = {
        ...activeAsset,
        preloadGroup,
        preloadPriority: priority,
        metadata: {
          ...activeAsset.metadata,
          preloadGroup: preloadGroup || undefined,
          preloadPriority: priority,
        },
      };
      setActiveAsset(updated);
      setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      showToast(`Preload updated: ${preloadGroup || 'None'} (${priority})`);
    } catch (err) {
      console.error(err);
      showToast('Failed to update preload configuration');
    }
  };

  const handleAddDependency = async (depId: string) => {
    if (!activeAsset || !depId.trim()) return;
    const currentDeps = activeAsset.dependencies || [];
    if (currentDeps.includes(depId.trim())) return;
    const seraphtDeps = [...currentDeps, depId.trim()];
    try {
      soundSynth?.playActionSound?.();
      const manager = AssetManager.getInstance();
      await manager.updateAssetDependencies(activeAsset.id, seraphtDeps);
      const updated = {
        ...activeAsset,
        dependencies: seraphtDeps,
        metadata: {
          ...activeAsset.metadata,
          dependencies: seraphtDeps,
        },
      };
      setActiveAsset(updated);
      setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      showToast(`Added dependency: ${depId.trim()}`);
    } catch (err) {
      console.error(err);
      showToast('Failed to add dependency');
    }
  };

  const handleRemoveDependency = async (depId: string) => {
    if (!activeAsset) return;
    const currentDeps = activeAsset.dependencies || [];
    const seraphtDeps = currentDeps.filter((d) => d !== depId);
    try {
      soundSynth?.playUiClick?.();
      const manager = AssetManager.getInstance();
      await manager.updateAssetDependencies(activeAsset.id, seraphtDeps);
      const updated = {
        ...activeAsset,
        dependencies: seraphtDeps,
        metadata: {
          ...activeAsset.metadata,
          dependencies: seraphtDeps,
        },
      };
      setActiveAsset(updated);
      setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      showToast(`Removed dependency: ${depId}`);
    } catch (err) {
      console.error(err);
      showToast('Failed to remove dependency');
    }
  };

  const isCharactersWorkspace = workspaceId === 'characters' || typeFilter === 'CHARACTER';
  const isCreaturesWorkspace = workspaceId === 'creatures' || typeFilter === 'CREATURE';
  const isItemsWorkspace = workspaceId === 'items' || typeFilter === 'ITEM';
  const isAudioWorkspace = workspaceId === 'audio' || typeFilter === 'AUDIO';
  const isCatalogWorkspace = workspaceId === 'catalog';

  return (
    <div className="flex flex-col h-full w-full bg-transparent text-slate-100 font-mono overflow-hidden">
      {/* ─── Top Unified Toolbar: Search + Bundle Pills + Context Refinements ─── */}
      <div className="flex flex-col border-b border-slate-800/80 bg-[#070e1a]/95 backdrop-blur-sm z-10 shrink-0">
        {/* Row 1: Search, Bundles & Actions */}
        <div className="flex flex-wrap items-center justify-between p-3 gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative w-72 max-w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-amber-400/80" />
              <input
                type="text"
                placeholder="Search assets, paths, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/70 border border-slate-700/80 rounded-xl pl-9 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/30 transition shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200 text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>

            {/* Asset Bundle Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 custom-scrollbar">
              <button
                onClick={() => {
                  soundSynth?.playUiClick?.();
                  setPackFilter('ALL');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                  packFilter === 'ALL'
                    ? BUNDLE_THEMES.ALL.activeColor
                    : 'bg-black/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>All Bundles</span>
                <span className="text-[10px] opacity-70 ml-0.5">({total})</span>
              </button>

              {ASSET_PACKS.map((packKey) => {
                const theme = BUNDLE_THEMES[packKey];
                const isSelected = packFilter === packKey;
                return (
                  <button
                    key={packKey}
                    onClick={() => {
                      soundSynth?.playUiClick?.();
                      setPackFilter(packKey);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                      isSelected
                        ? theme.activeColor
                        : 'bg-black/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{ASSET_PACK_LABELS[packKey]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Tools: Batch Selection, View Mode & Zoom */}
          <div className="flex items-center gap-2 shrink-0">
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

            <div className="flex items-center border border-slate-700/80 rounded-xl bg-black/60 overflow-hidden shadow-inner">
              <button
                onClick={() => {
                  soundSynth?.playUiClick?.();
                  setViewMode('grid');
                }}
                className={`p-1.5 cursor-pointer transition ${
                  viewMode === 'grid'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
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
                  viewMode === 'list'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Context-Aware Refinement Bar */}
        <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#050b14]/90 border-t border-slate-800/60 gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {/* Workspace-Specific Filters */}
            {isCatalogWorkspace && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-amber-400" /> Type:
                </span>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    soundSynth?.playUiClick?.();
                    setTypeFilter(e.target.value);
                  }}
                  className="bg-black/70 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="ALL">All Types</option>
                  <option value="SPRITE">Characters & Sprites</option>
                  <option value="CREATURE">Creatures & Monsters</option>
                  <option value="TILE">Tilesets & Terrain</option>
                  <option value="ITEM">Items & UI Icons</option>
                  <option value="AUDIO">Audio & SFX</option>
                  <option value="UI">UI Elements</option>
                </select>
              </div>
            )}

            {isCharactersWorkspace && (
              <>
                <div className="flex items-center bg-black/60 border border-slate-700/80 rounded-lg p-0.5 gap-0.5">
                  {(['ALL', 'FULL', 'MODULAR'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        soundSynth?.playUiClick?.();
                        setModularFilter(mode);
                      }}
                      className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                        modularFilter === mode
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {mode === 'ALL' ? 'All Characters' : mode === 'FULL' ? 'Full Sprites' : 'Modular Layers'}
                    </button>
                  ))}
                </div>

                {/* Modular Component Filters */}
                {modularFilter !== 'FULL' && (
                  <>
                    <select
                      value={componentCategoryFilter}
                      onChange={(e) => {
                        soundSynth?.playUiClick?.();
                        setComponentCategoryFilter(e.target.value);
                      }}
                      className="bg-black/70 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="ALL">All Components</option>
                      {listCharacterComponentCategories().map((cat) => (
                        <option key={cat} value={cat}>
                          {CHARACTER_COMPONENT_CATEGORIES[cat].label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={componentLayerFilter}
                      onChange={(e) => {
                        soundSynth?.playUiClick?.();
                        setComponentLayerFilter(e.target.value);
                      }}
                      className="bg-black/70 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="ALL">All Layers</option>
                      {['head', 'torso', 'legs', 'feet', 'accessory', 'full-body'].map((layer) => (
                        <option key={layer} value={layer}>
                          {layer}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </>
            )}

            {isCreaturesWorkspace && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <PawPrint className="w-3 h-3 text-rose-400" /> Form:
                </span>
                {[
                  { id: 'ALL', label: 'All Forms' },
                  { id: 'battle_sheet', label: 'Battle Sheets' },
                  { id: 'overworld', label: 'Overworld' },
                  { id: 'front_sprite', label: 'Front' },
                  { id: 'back_sprite', label: 'Back' },
                  { id: 'face_portrait', label: 'Portraits' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      soundSynth?.playUiClick?.();
                      setSubcategoryFilter(item.id);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all border cursor-pointer ${
                      subcategoryFilter === item.id
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-black/40 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {/* Quick Popular Tag Pills */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              {['terrain', 'npc', 'hero', 'creature', 'combat', 'civilian', 'tool', 'resource', 'dungeon'].map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTag(t === selectedTag ? null : t)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all shrink-0 cursor-pointer ${
                    selectedTag === t
                      ? 'bg-amber-600 text-white font-bold border-amber-400 shadow'
                      : 'bg-black/40 border-slate-800 text-slate-400 hover:border-amber-400/50 hover:text-slate-200'
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>

            {selectedTag && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-950/60 border border-amber-500/50 text-amber-200 rounded-lg text-xs font-bold shadow-inner">
                <span>#{selectedTag}</span>
                <button
                  onClick={() => setSelectedTag(null)}
                  className="hover:text-rose-400 font-bold ml-0.5 cursor-pointer"
                >
                  ×
                </button>
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400 shrink-0">
            {assets.length} / <strong className="text-amber-400">{total}</strong> assets
          </div>
        </div>
      </div>

      {/* ─── Main Content Area: Asset Grid / List + Right Inspector ─── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Center Grid / List Display */}
        <div className="flex-1 p-4 overflow-y-auto bg-[#030810]/40 custom-scrollbar flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
              <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
              <span className="font-bold">Querying Asset Catalog…</span>
            </div>
          ) : assets.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-xs text-slate-500 italic p-8 text-center space-y-3">
              <Folder className="w-10 h-10 text-slate-600 mx-auto opacity-60" />
              <p className="text-sm font-semibold text-slate-400">No assets match the selected filter criteria.</p>
              <button
                onClick={() => {
                  setTypeFilter(initialTypeFilter || 'ALL');
                  setModularFilter('ALL');
                  setComponentCategoryFilter('ALL');
                  setComponentLayerFilter('ALL');
                  setSubcategoryFilter('ALL');
                  setPackFilter('ALL');
                  setSearchQuery('');
                  setSelectedTag(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {assets.map((asset) => {
                const isSelected = selectedAssetIds.has(asset.id);
                const isActive = activeAsset?.id === asset.id;
                const fileName = asset.source.split('/').pop() || asset.id;
                const componentLabel =
                  asset.metadata?.componentCategory || asset.componentCategory || null;
                const componentLayer =
                  asset.metadata?.componentLayer || asset.componentLayer || null;
                const isModular = Boolean(
                  asset.isModularComponent ||
                    asset.metadata?.isModularComponent ||
                    componentLabel
                );

                const packId = asset.metadata?.pack || inferAssetPack(asset.source);
                const packTheme = BUNDLE_THEMES[packId as AssetPackId] || BUNDLE_THEMES.legacy;

                return (
                  <div
                    key={asset.id}
                    onClick={() => {
                      setActiveAsset(asset);
                      if (onAssetSelect) onAssetSelect(asset);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, asset });
                    }}
                    className={`group relative aspect-square bg-[#070e1a] border rounded-xl p-2 flex flex-col items-center justify-between cursor-pointer transition-all hover:scale-[1.02] hover:border-amber-400 hover:shadow-lg ${
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

                    {/* Badges: Pack Origin, Modular, Subcategory */}
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
                      <span
                        className={`text-[7px] font-bold uppercase tracking-wider px-1 py-0.2 rounded border ${packTheme.badgeColor}`}
                      >
                        {ASSET_PACK_LABELS[packId as AssetPackId] || packId}
                      </span>

                      {isModular && (
                        <span className="text-[7px] font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-cyan-950/90 border border-cyan-500/40 text-cyan-300">
                          Modular
                        </span>
                      )}

                      {(() => {
                        const sub =
                          (asset.metadata?.subcategory as CreatureAssetSubcategory) ||
                          classifyCreatureAsset(asset.source);
                        if (!sub) return null;
                        const label = CREATURE_SUBCATEGORY_LABELS[sub] || sub;
                        return (
                          <span className="text-[7px] font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-purple-950/90 border border-purple-500/40 text-purple-300">
                            {label}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Image Preview with Checkered Canvas Background */}
                    <div className="w-full flex-1 flex items-center justify-center overflow-hidden my-1 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:8px_8px] rounded-lg p-1">
                      <SpriteThumbnail
                        src={asset.atlasSource || asset.source}
                        atlasFrame={asset.atlasFrame}
                        alt={asset.id}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>

                    {/* Title & Metadata */}
                    <span className="text-[10px] text-slate-300 truncate w-full text-center font-medium">
                      {fileName.replace(/\.(png|jpg|webp)$/i, '')}
                    </span>
                    {componentLabel || componentLayer ? (
                      <span className="text-[8px] text-cyan-200 truncate w-full text-center uppercase tracking-wide">
                        {componentLabel
                          ? `${componentLabel}${componentLayer ? ` • ${componentLayer}` : ''}`
                          : componentLayer}
                      </span>
                    ) : null}
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
                const sub =
                  (asset.metadata?.subcategory as CreatureAssetSubcategory) ||
                  classifyCreatureAsset(asset.source);
                const packId = asset.metadata?.pack || inferAssetPack(asset.source);
                const packTheme = BUNDLE_THEMES[packId as AssetPackId] || BUNDLE_THEMES.legacy;
                const isSheet =
                  asset.type === 'SHEET' ||
                  asset.tags?.includes('sheet') ||
                  asset.source.includes('-sheet');
                const componentLabel =
                  asset.metadata?.componentCategory || asset.componentCategory || null;
                const componentLayer =
                  asset.metadata?.componentLayer || asset.componentLayer || null;
                const isModular = Boolean(
                  asset.isModularComponent ||
                    asset.metadata?.isModularComponent ||
                    componentLabel
                );

                return (
                  <div
                    key={asset.id}
                    onClick={() => {
                      setActiveAsset(asset);
                      if (onAssetSelect) onAssetSelect(asset);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, asset });
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isActive
                        ? 'bg-amber-950/30 border-amber-400/60 shadow-md'
                        : 'bg-[#070e1a] border-slate-800/80 hover:border-slate-700 hover:bg-slate-850'
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200 truncate">
                            {fileName}
                          </span>
                          <span
                            className={`text-[8px] font-bold uppercase px-1 py-0.2 rounded border ${packTheme.badgeColor}`}
                          >
                            {ASSET_PACK_LABELS[packId as AssetPackId] || packId}
                          </span>
                          {sub && (
                            <span className="text-[8px] font-bold uppercase px-1 py-0.2 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300">
                              {CREATURE_SUBCATEGORY_LABELS[sub] || sub}
                            </span>
                          )}
                          {isModular && (
                            <span className="text-[8px] font-bold uppercase px-1 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                              Modular
                            </span>
                          )}
                          {isSheet && (
                            <span className="text-[8px] font-bold uppercase px-1 py-0.2 rounded bg-indigo-950/80 border border-indigo-500/40 text-indigo-300">
                              Sheet
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 truncate">
                          {asset.source} • <strong className="text-amber-300">{asset.type}</strong>
                          {componentLabel || componentLayer ? (
                            <>
                              {' • '}
                              <strong className="text-cyan-300 uppercase">
                                {componentLabel || componentLayer}
                              </strong>
                            </>
                          ) : null}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {asset.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-black/60 border border-slate-800 text-slate-400"
                        >
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
                Showing <strong className="text-white">{assets.length}</strong> of{' '}
                <strong className="text-amber-400">{total}</strong> assets
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
          <div className="w-80 bg-[#060c16]/95 border-l border-slate-800/80 p-4 flex flex-col gap-4 overflow-y-auto shrink-0 custom-scrollbar">
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
                      previewZoom === z
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {z}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkered Canvas Preview Box */}
            <div className="w-full aspect-square bg-[#040810] bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] border border-slate-800/80 rounded-2xl flex items-center justify-center p-4 relative overflow-hidden shadow-inner">
              <img
                src={activeAsset.source}
                alt=""
                className={`max-w-full max-h-full object-contain transition-transform ${
                  previewZoom === '1x'
                    ? 'scale-100'
                    : previewZoom === '2x'
                    ? 'scale-150'
                    : 'scale-250'
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
                  className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] text-slate-300 flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  {copiedKey === 'Path' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-amber-400" />
                  )}
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
                    className="py-1.5 px-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-[10px] text-amber-300 flex items-center justify-center gap-1 transition font-semibold cursor-pointer"
                    title="Open in Slicer"
                  >
                    <Scissors className="w-3 h-3" /> Slicer
                  </button>
                )}
              </div>

              {/* Make Starter Hero Button (Phase 5) */}
              {(activeAsset.type === 'CHARACTER' ||
                (activeAsset.type === 'SPRITE' &&
                  activeAsset.tags?.includes('profile:character'))) && (
                <button
                  onClick={() => {
                    soundSynth?.playActionSound?.();
                    window.dispatchEvent(
                      new CustomEvent('studio_make_starter_hero', {
                        detail: { asset: activeAsset },
                      })
                    );
                    const store = useEditorStore.getState();
                    store.setStudioMode('develop');
                    store.openPanel('characters');
                    showToast(
                      `Opening Starter Hero Editor for ${activeAsset.source.split('/').pop()}`
                    );
                  }}
                  className="w-full py-1.5 px-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow cursor-pointer mt-1"
                >
                  <Users className="w-3.5 h-3.5" /> Make Starter Hero
                </button>
              )}

              {/* Use as Tileset in Active Map Button (Phase 4C) */}
              {(activeAsset.type === 'TILESET' ||
                activeAsset.source.includes('/tilesets/')) && (
                <button
                  onClick={() => {
                    soundSynth?.playActionSound?.();
                    window.dispatchEvent(
                      new CustomEvent('studio_add_tileset', {
                        detail: { source: activeAsset.source },
                      })
                    );
                    showToast(
                      `Added ${activeAsset.source.split('/').pop()} to active map tilesets`
                    );
                  }}
                  className="w-full py-1.5 px-3 bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow cursor-pointer mt-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Use as Map Tileset
                </button>
              )}
            </div>

            {/* Info Table */}
            <div className="flex flex-col gap-1.5 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Classification</span>
                <span className="text-amber-300 font-bold">{activeAsset.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Categories</span>
                <span className="text-slate-200">
                  {activeAsset.categories?.join(', ') || 'General'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Component</span>
                <span className="text-slate-200">
                  {activeAsset.metadata?.componentCategory ||
                    activeAsset.componentCategory ||
                    '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Layer</span>
                <span className="text-slate-200">
                  {activeAsset.metadata?.componentLayer ||
                    activeAsset.componentLayer ||
                    '—'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Frames</span>
                <span className="text-slate-200">
                  {Array.isArray(activeAsset.metadata?.frames)
                    ? activeAsset.metadata.frames.length
                    : 1}
                </span>
              </div>
            </div>

            {/* Gameplay Flags */}
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Gameplay Collision & Flags
              </span>
              <div className="flex flex-col gap-1.5">
                {(
                  [
                    ['solid', 'Solid (blocks walk)'],
                    ['interactable', 'Interactable'],
                    ['decorative', 'Decorative'],
                  ] as const
                ).map(([flag, label]) => (
                  <label
                    key={flag}
                    className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer"
                  >
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
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Tags
              </span>
              <div className="flex flex-wrap gap-1">
                {activeAsset.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg text-[10px]"
                  >
                    #{t}
                    <button
                      onClick={() => handleRemoveTag(t)}
                      className="text-slate-500 hover:text-rose-400 ml-0.5 font-bold cursor-pointer"
                    >
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
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Dependency Graph & References */}
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3 h-3 text-cyan-400" /> Dependencies & Graph
                </span>
                <span className="text-[9px] text-slate-400">
                  {(activeAsset.dependencies || []).length} req / {(activeAsset.dependents || []).length} used
                </span>
              </div>

              {/* Dependencies List */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-slate-400 uppercase font-semibold">Requires:</span>
                {(activeAsset.dependencies || []).length === 0 ? (
                  <span className="text-[10px] text-slate-500 italic">No external dependencies</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {(activeAsset.dependencies || []).map((dep) => (
                      <span
                        key={dep}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 rounded text-[9px]"
                      >
                        <span>{dep}</span>
                        <button
                          onClick={() => handleRemoveDependency(dep)}
                          className="hover:text-rose-400 font-bold ml-0.5 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Dependency Input */}
              <div className="flex gap-1 mt-1">
                <input
                  type="text"
                  placeholder="Asset ID to depend on..."
                  value={newDepInput}
                  onChange={(e) => setNewDepInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newDepInput.trim()) {
                      handleAddDependency(newDepInput.trim());
                      setNewDepInput('');
                    }
                  }}
                  className="flex-1 bg-black/60 border border-slate-700 rounded-lg px-2 py-0.5 text-[10px] text-slate-200 focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={() => {
                    if (newDepInput.trim()) {
                      handleAddDependency(newDepInput.trim());
                      setNewDepInput('');
                    }
                  }}
                  className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  Link
                </button>
              </div>

              {/* Dependents List (Referenced By) */}
              {(activeAsset.dependents || []).length > 0 && (
                <div className="flex flex-col gap-1 mt-1 pt-1.5 border-t border-slate-800/60">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold">Referenced By:</span>
                  <div className="flex flex-wrap gap-1">
                    {(activeAsset.dependents || []).map((dep) => (
                      <span
                        key={dep}
                        className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 rounded text-[9px]"
                      >
                        {dep}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Runtime Lifecycle & Preload */}
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Runtime Lifecycle & Preload
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-slate-400 uppercase">Preload Group</label>
                  <select
                    value={activeAsset.preloadGroup || activeAsset.metadata?.preloadGroup || 'none'}
                    onChange={(e) => {
                      const val = e.target.value === 'none' ? null : e.target.value;
                      handleUpdatePreload(val, activeAsset.preloadPriority || activeAsset.metadata?.preloadPriority || 'NORMAL');
                    }}
                    className="bg-black/60 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="none">None (Lazy)</option>
                    <option value="core">Core</option>
                    <option value="player">Player</option>
                    <option value="world_common">World Common</option>
                    <option value="town">Town</option>
                    <option value="forest">Forest</option>
                    <option value="dungeon">Dungeon</option>
                    <option value="combat_common">Combat Common</option>
                    <option value="tutorial">Tutorial</option>
                    <option value="ui_core">UI Core</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-slate-400 uppercase">Priority</label>
                  <select
                    value={activeAsset.preloadPriority || activeAsset.metadata?.preloadPriority || 'NORMAL'}
                    onChange={(e) => {
                      handleUpdatePreload(activeAsset.preloadGroup || activeAsset.metadata?.preloadGroup || null, e.target.value);
                    }}
                    className="bg-black/60 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="NORMAL">Normal</option>
                    <option value="LOW">Low</option>
                    <option value="LAZY">Lazy</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-800/60">
                <span>Est. Footprint:</span>
                <span className="text-slate-200 font-mono">
                  {activeAsset.fileSize ? `${Math.round(activeAsset.fileSize / 1024)} KB` : '~10 KB'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 mt-auto pt-2">
              <button
                onClick={() => setReclassifyModalOpen(true)}
                className="w-full py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reclassify Asset
              </button>
              {onAssetSelect && (
                <button
                  onClick={() => onAssetSelect(activeAsset)}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
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
              Fix classification by reassigning asset type and categories across selected items (
              {selectedAssetIds.size || 1}).
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
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReclassifySubmit}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg cursor-pointer"
              >
                Apply Reclassification
              </button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <AssetContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          asset={contextMenu.asset}
          selectedAssetIds={selectedAssetIds}
          allAssets={assets}
          onClose={() => setContextMenu(null)}
          onInspect={(asset) => {
            setActiveAsset(asset);
            if (onAssetSelect) onAssetSelect(asset);
          }}
          onSelectInCanvas={onAssetSelect}
          onOpenSlicer={onOpenSlicer}
          onReclassify={handleOpenReclassify}
          onDelete={handleDeleteAssets}
          onToggleFlag={handleToggleFlagFromMenu}
          onAddTag={handleAddTagFromMenu}
          onToggleShowInCharacterCreation={handleToggleShowInCharacterCreation}
        />
      )}
    </div>
  );
}
