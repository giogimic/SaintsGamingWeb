'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, Shirt, Sparkles, Plus, ExternalLink } from 'lucide-react';
import { AssetManager, type GameAssetItem } from '@/engine/assets/AssetManager';
import { useEditorStore } from '../editor-store';
import {
  getModelWardrobeCategory,
  getDefaultModelWardrobeAttachmentMode,
  getDefaultModelWardrobeSocket,
} from '@/shared/game/modelWardrobe';
import type { ModelWardrobeItem } from '@/shared/game/modelWardrobe';
import { STANDARD_SOCKET_OPTIONS } from './WorldModelSelector';
import {
  getCharacterModelProfile,
  isWardrobeItemCompatibleWithProfile,
} from '@/shared/game/characterProfiles';

interface ModelWardrobeEditorProps {
  modelAssetId: string;
  value: ModelWardrobeItem[];
  onChange: (items: ModelWardrobeItem[]) => void;
  allowCharacterCreationOptions?: boolean;
  title?: string;
}

type WardrobeAsset = GameAssetItem & { name?: string; slug?: string };

function displayName(asset: WardrobeAsset): string {
  return asset.name || asset.metadata?.name || asset.customLabels?.name || asset.source.split('/').pop()?.replace(/\.[^.]+$/, '') || asset.id;
}

function getAssetGroupNames(asset: WardrobeAsset | null, modelAssetId?: string): string[] {
  const names = new Set<string>();
  if (modelAssetId) {
    const clean = modelAssetId.toLowerCase().replace(/^.*[\\/]/, '').replace(/\.(glb|gltf|fbx|obj)$/i, '');
    names.add(clean);

  }
  if (asset) {
    const presentation = asset.presentation || asset.metadata?.presentation || {};
    const definition = presentation.assetDefinition || asset.metadata?.assetDefinition || {};
    if (definition.modularSetName) names.add(definition.modularSetName.toLowerCase());
    if (asset.metadata?.modularSetName) names.add(asset.metadata.modularSetName.toLowerCase());
    const name = displayName(asset).toLowerCase();
    names.add(name);

  }
  return Array.from(names);
}

function isModelAsset(asset: WardrobeAsset): boolean {
  return ['MODEL', '3D_MODEL', 'model'].includes(asset.type) || /\.(glb|gltf)$/i.test(asset.source);
}

function isModularAsset(asset: WardrobeAsset): boolean {
  return Boolean(
    asset.isModularComponent
      || asset.metadata?.isModularComponent
      || asset.componentCategory
      || asset.metadata?.componentCategory
      || asset.metadata?.cat
      || asset.tags?.some((tag) => ['modular', 'sprite-component', 'character-component'].includes(tag.toLowerCase())),
  );
}

export function ModelWardrobeEditor({
  modelAssetId,
  value,
  onChange,
  allowCharacterCreationOptions = false,
  title = 'Outfit & Item Loadout',
}: ModelWardrobeEditorProps) {
  const [matchedCatalog, setMatchedCatalog] = useState<WardrobeAsset[]>([]);
  const [allCatalog, setAllCatalog] = useState<WardrobeAsset[]>([]);
  const [viewScope, setViewScope] = useState<'MATCHED' | 'ALL'>('MATCHED');
  const [relatedIds, setRelatedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddedOnly, setShowAddedOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'HEAD_FACE' | 'CLOTHING' | 'GEAR'>('ALL');

  useEffect(() => {
    let cancelled = false;
    if (!modelAssetId) {
      setMatchedCatalog([]);
      setAllCatalog([]);
      setRelatedIds([]);
      return;
    }

    setIsLoading(true);
    const load = async () => {
      const manager = AssetManager.getInstance();
      const [baseAsset, firstPage] = await Promise.all([
        manager.getAsset(modelAssetId),
        manager.searchAssets({ type: 'MODEL', modular: true, sortBy: 'createdAt', sortOrder: 'desc' }, 0, 100),
      ]);
      const loadModelPages = async (modularOnly: boolean) => {
        let result = firstPage;
        if (!modularOnly) result = await manager.searchAssets({ type: 'MODEL', sortBy: 'createdAt', sortOrder: 'desc' }, 0, 100);
        let loaded = result.items as WardrobeAsset[];
        let page = 1;
        while (result.hasMore && page < 5) {
          result = await manager.searchAssets({ type: 'MODEL', ...(modularOnly ? { modular: true } : {}), sortBy: 'createdAt', sortOrder: 'desc' }, page, 100);
          loaded = loaded.concat(result.items as WardrobeAsset[]);
          page++;
        }
        return loaded;
      };
      let items = await loadModelPages(true);
      if (items.length === 0) {
        items = (await loadModelPages(false)).filter(isModularAsset);
      }
      const modelItems = items.filter((asset) => isModelAsset(asset) && asset.id !== modelAssetId);
      const profile = getCharacterModelProfile(modelAssetId);
      const matched = modelItems.filter((asset) => {
        if (profile) {
          const pack = asset.metadata?.pack || asset.metadata?.modularSetName || '';
          const modularSetName = asset.metadata?.modularSetName || asset.metadata?.assetDefinition?.modularSetName || '';
          const skeleton = asset.metadata?.skeleton || asset.metadata?.assetDefinition?.skeleton || '';
          const tags = (asset.tags || []).map((t) => t.toLowerCase());
          return isWardrobeItemCompatibleWithProfile(profile, { pack, modularSetName, skeleton, tags });
        }
        const fallbackGroupNames = [
          modelAssetId.toLowerCase(),
          (baseAsset?.metadata?.displayName || baseAsset?.id || '').toLowerCase(),
          (baseAsset?.metadata?.modularSetName || baseAsset?.metadata?.assetDefinition?.modularSetName || '').toLowerCase(),
          (baseAsset?.metadata?.skeleton || baseAsset?.metadata?.assetDefinition?.skeleton || '').toLowerCase(),
          ...((baseAsset?.tags || []).map((t: string) => t.toLowerCase())),
        ].filter(Boolean);
        const name = displayName(asset).toLowerCase();
        const set = (asset.metadata?.modularSetName || asset.metadata?.assetDefinition?.modularSetName || '').toLowerCase();
        const tags = (asset.tags || []).map((t: string) => t.toLowerCase());
        const source = (asset.source || '').toLowerCase();
        return fallbackGroupNames.some(
          (g: string) =>
            set === g ||
            tags.includes(g) ||
            source.includes(`/${g}/`) ||
            source.includes(`${g}.glb`) ||
            name.includes(g) ||
            name.startsWith(`${g} - `) ||
            name.startsWith(`${g} / `)
        );
      });

      // Filter allCatalog so that cross-skeleton or monster/humanoid mismatches are excluded
      const compatibleAll = profile
        ? modelItems.filter((asset) => {
            const assetSkeleton = asset.metadata?.skeleton || asset.metadata?.assetDefinition?.skeleton;
            if (assetSkeleton && assetSkeleton !== profile.skeleton) return false;
            // Never allow creature/monster items on humanoids or vice versa
            const isMonsterItem = asset.categories?.some((c) => c.toLowerCase() === 'monster' || c.toLowerCase() === 'creature');
            if (profile.category === 'character' && isMonsterItem) return false;
            if (profile.category === 'monster' && !isMonsterItem && !asset.tags?.includes('monster')) return false;
            return true;
          })
        : modelItems;

      if (cancelled) return;
      const sortedAll = compatibleAll.sort((a, b) => displayName(a).localeCompare(displayName(b), undefined, { numeric: true, sensitivity: 'base' }));
      const sortedMatched = matched.sort((a, b) => displayName(a).localeCompare(displayName(b), undefined, { numeric: true, sensitivity: 'base' }));
      setAllCatalog(sortedAll);
      setMatchedCatalog(sortedMatched);
      setRelatedIds(matched.map((asset) => asset.id));
      setIsLoading(false);
    };

    void load().catch(() => {
      if (!cancelled) {
        setMatchedCatalog([]);
        setAllCatalog([]);
        setRelatedIds([]);
        setIsLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [modelAssetId]);

  const catalog = useMemo(() => {
    if (viewScope === 'MATCHED' && matchedCatalog.length > 0) {
      return matchedCatalog;
    }
    return allCatalog;
  }, [viewScope, matchedCatalog, allCatalog]);

  const addSingleAsset = (asset: WardrobeAsset) => {
    const modelUrl = asset.source || asset.cdnUrl || `/uploads/${asset.id}.glb`;
    const category = getModelWardrobeCategory({
      assetId: asset.id,
      label: displayName(asset),
      category: asset.componentCategory || asset.metadata?.componentCategory || asset.metadata?.cat || undefined,
    });
    const attachmentMode = getDefaultModelWardrobeAttachmentMode({ assetId: asset.id, label: displayName(asset), category });
    const socket = attachmentMode === 'RIGID_SOCKET'
      ? getDefaultModelWardrobeSocket({ assetId: asset.id, label: displayName(asset), category })
      : undefined;
    const newItem: ModelWardrobeItem = {
      type: '3D Model',
      assetId: asset.id,
      modelUrl,
      source: asset.source || asset.cdnUrl,
      label: displayName(asset),
      category,
      slot: category,
      isModular: true,
      attachmentMode,
      socket,
      defaultVisible: true,
      availableInCharacterCreation: allowCharacterCreationOptions,
      hidesComponents: (asset as any).hidesComponents || [],
    };
    onChange([...value.filter((v) => v.assetId !== asset.id), newItem]);
  };

  const handleOpenModularLibrary = () => {
    useEditorStore.getState().openAssetPicker({
      filterType: 'MODEL',
      categoryFilter: 'MODULAR',
      title: 'Equip Modular Clothing / Armor',
      onSelect: (selectedId, asset) => {
        if (asset) {
          addSingleAsset(asset);
        } else {
          void AssetManager.getInstance().getAsset(selectedId).then((loaded) => {
            if (loaded) addSingleAsset(loaded as any);
          });
        }
      },
    });
  };

  const configuredById = useMemo(() => new Map(value.map((item) => [item.assetId, item])), [value]);
  const filteredCatalog = useMemo(() => {
    const query = search.trim().toLowerCase();
    return catalog.filter((asset) => {
      const cat = getModelWardrobeCategory({
        assetId: asset.id,
        label: displayName(asset),
        category: asset.componentCategory || asset.metadata?.componentCategory || asset.metadata?.cat || undefined,
      });
      const slotGroup = ['face', 'hair', 'beard', 'head_accessory', 'mask', 'hat'].includes(cat)
        ? 'HEAD_FACE'
        : ['shirt', 'jacket', 'clothing', 'pants', 'shoes'].includes(cat)
          ? 'CLOTHING'
          : 'GEAR';
      const matchesGroup = categoryFilter === 'ALL' || slotGroup === categoryFilter;
      const matchesSearch = !query || `${displayName(asset)} ${asset.componentCategory || ''} ${cat}`.toLowerCase().includes(query);
      return matchesGroup && matchesSearch && (!showAddedOnly || configuredById.has(asset.id));
    });
  }, [catalog, search, showAddedOnly, configuredById, categoryFilter]);
  const bulkAssets = relatedIds.length > 0
    ? catalog.filter((asset) => relatedIds.includes(asset.id))
    : search.trim() ? filteredCatalog : [];

  const toggleIncluded = (asset: WardrobeAsset, included: boolean) => {
    if (!included) {
      onChange(value.filter((item) => item.assetId !== asset.id));
      return;
    }
    const category = getModelWardrobeCategory({
      assetId: asset.id,
      label: displayName(asset),
      category: asset.componentCategory || asset.metadata?.componentCategory || asset.metadata?.cat || undefined,
    });
    const attachmentMode = getDefaultModelWardrobeAttachmentMode({ assetId: asset.id, label: displayName(asset), category });
    const socket = attachmentMode === 'RIGID_SOCKET'
      ? getDefaultModelWardrobeSocket({ assetId: asset.id, label: displayName(asset), category })
      : undefined;
    const modelUrl = asset.source || asset.cdnUrl || (asset.id.startsWith('/') || asset.id.startsWith('upload_') ? `/uploads/${asset.id}` : undefined);
    onChange([
      ...value,
      {
        type: '3D Model',
        assetId: asset.id,
        modelUrl,
        source: asset.source || asset.cdnUrl,
        label: displayName(asset),
        category,
        slot: category,
        isModular: true,
        attachmentMode,
        socket,
        defaultVisible: true,
        availableInCharacterCreation: allowCharacterCreationOptions,
        hidesComponents: asset.hidesComponents || [],
      },
    ]);
  };

  const updateItem = (assetId: string, patch: Partial<ModelWardrobeItem>) => {
    onChange(value.map((item) => item.assetId === assetId ? { ...item, ...patch } : item));
  };

  const addAllMatching = () => {
    const nextById = new Map(value.map((item) => [item.assetId, item]));
    for (const asset of bulkAssets) {
      const existing = nextById.get(asset.id);
      const modelUrl = asset.source || asset.cdnUrl || (asset.id.startsWith('/') || asset.id.startsWith('upload_') ? `/uploads/${asset.id}` : undefined);
      if (existing) {
        nextById.set(asset.id, {
          ...existing,
          modelUrl: existing.modelUrl || modelUrl,
          source: existing.source || asset.source || asset.cdnUrl,
          availableInCharacterCreation: allowCharacterCreationOptions
            ? true
            : existing.availableInCharacterCreation,
        });
      } else {
        const category = getModelWardrobeCategory({
          assetId: asset.id,
          label: displayName(asset),
          category: asset.componentCategory || asset.metadata?.componentCategory || asset.metadata?.cat || undefined,
        });
        const attachmentMode = getDefaultModelWardrobeAttachmentMode({ assetId: asset.id, label: displayName(asset), category });
        const socket = attachmentMode === 'RIGID_SOCKET'
          ? getDefaultModelWardrobeSocket({ assetId: asset.id, label: displayName(asset), category })
          : undefined;
        nextById.set(asset.id, {
          type: '3D Model',
          assetId: asset.id,
          modelUrl,
          source: asset.source || asset.cdnUrl,
          label: displayName(asset),
          category,
          slot: category,
          isModular: true,
          attachmentMode,
          socket,
          defaultVisible: !allowCharacterCreationOptions,
          availableInCharacterCreation: allowCharacterCreationOptions,
          hidesComponents: asset.hidesComponents || [],
        });
      }
    }
    onChange(Array.from(nextById.values()));
  };

  const clearCreationOptions = () => onChange(value.map((item) => ({ ...item, availableInCharacterCreation: false })));
  const setDefaultVisibilityForAll = (defaultVisible: boolean) =>
    onChange(value.map((item) => ({ ...item, defaultVisible })));

  const catalogIds = new Set(catalog.map((asset) => asset.id));
  const orphanedItems = value.filter((item) => !catalogIds.has(item.assetId));

  return (
    <section className="mt-3 rounded-lg border border-cyan-900/40 bg-black/25 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
          <Shirt size={12} /> {title}
        </div>
        <span className="text-[9px] text-slate-400">{value.length} added · {value.filter((item) => item.defaultVisible !== false).length} in default outfit</span>
      </div>
      <p className="text-[9px] text-slate-400">
        {allowCharacterCreationOptions
          ? 'Choose the base outfit, what appears by default, and which pieces players can change during character creation.'
          : 'Choose this character’s items, default visibility, and how each piece attaches to the model.'}
      </p>

      {/* Set Scope Pills and Browse Library Button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {matchedCatalog.length > 0 && (
            <button
              type="button"
              onClick={() => setViewScope('MATCHED')}
              className={`px-2.5 py-1 rounded text-[9.5px] font-bold transition cursor-pointer border flex items-center gap-1 ${
                viewScope === 'MATCHED'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                  : 'bg-black/30 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles size={11} className="text-emerald-400" />
              <span>Matching Character Pieces ({matchedCatalog.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setViewScope('ALL')}
            className={`px-2.5 py-1 rounded text-[9.5px] font-bold transition cursor-pointer border flex items-center gap-1 ${
              viewScope === 'ALL'
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-sm'
                : 'bg-black/30 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>All Modular Pieces ({allCatalog.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleOpenModularLibrary}
          className="px-2.5 py-1 rounded text-[9.5px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition flex items-center gap-1 cursor-pointer shadow-sm"
        >
          <Plus size={11} />
          <span>Browse Asset Library</span>
        </button>
      </div>

      {(catalog.length > 0 || allCatalog.length > 0) && (
        <div className="flex items-center gap-1.5 rounded border border-slate-800 bg-black/30 px-2 py-1.5">
          <Search size={11} className="text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter clothing or equipment by name..."
            className="w-full bg-transparent text-[10px] text-slate-200 outline-none placeholder:text-slate-600"
          />
        </div>
      )}
      {(bulkAssets.length > 0 || value.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 rounded border border-cyan-900/40 bg-cyan-950/10 px-2 py-1.5">
          {bulkAssets.length > 0 && (
            <button
              type="button"
              onClick={addAllMatching}
              className="rounded bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-1 text-[9px] font-bold text-cyan-200 hover:bg-cyan-500/25 transition-colors"
            >
              Select All {relatedIds.length > 0 ? 'matching' : 'filtered'} ({bulkAssets.length})
            </button>
          )}
          {value.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => onChange([])}
                className="rounded bg-red-500/15 border border-red-500/30 px-2.5 py-1 text-[9px] font-bold text-red-300 hover:bg-red-500/25 transition-colors"
              >
                Clear all selected
              </button>
              <button
                type="button"
                onClick={() => setDefaultVisibilityForAll(true)}
                className="rounded border border-slate-700 px-2.5 py-1 text-[9px] font-semibold text-slate-300 hover:border-emerald-500/60 hover:text-emerald-300"
              >
                Show all by default
              </button>
              <button
                type="button"
                onClick={() => setDefaultVisibilityForAll(false)}
                className="rounded border border-slate-700 px-2.5 py-1 text-[9px] font-semibold text-slate-300 hover:border-slate-500"
              >
                Hide all by default
              </button>
            </>
          )}
          {allowCharacterCreationOptions && value.some((item) => item.availableInCharacterCreation) && (
            <button
              type="button"
              onClick={clearCreationOptions}
              className="rounded border border-slate-700 px-2.5 py-1 text-[9px] font-semibold text-slate-300 hover:border-slate-500"
            >
              Clear creator options
            </button>
          )}
          {allowCharacterCreationOptions && bulkAssets.length > 0 && (
            <span className="text-[8px] text-slate-500">New pieces are offered during creation and start out of the default outfit; existing pieces keep their default setting.</span>
          )}
        </div>
      )}
      {catalog.length > 0 && relatedIds.length === 0 && (
        <p className="text-[8px] text-amber-300/80">No named set match was found; showing all modular models. Add only pieces made for this character’s rig.</p>
      )}

      {isLoading ? (
        <div className="py-3 text-center text-[10px] text-slate-500">Finding this model’s clothing and equipment...</div>
      ) : filteredCatalog.length === 0 && orphanedItems.length === 0 ? (
        <div className="rounded border border-dashed border-slate-800 p-3 text-center text-[9px] text-slate-500">
          {modelAssetId ? 'No modular model items found yet. Upload modular clothing or equipment, then reselect this model.' : 'Select a model to find compatible clothing and equipment.'}
        </div>
      ) : (
        <>
        {catalog.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] text-slate-400">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCategoryFilter('ALL')}
                className={`rounded px-2 py-0.5 font-semibold transition-colors ${categoryFilter === 'ALL' ? 'bg-primary/20 text-primary border border-primary/40' : 'text-slate-400 hover:text-slate-200'}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('HEAD_FACE')}
                className={`rounded px-2 py-0.5 font-semibold transition-colors ${categoryFilter === 'HEAD_FACE' ? 'bg-primary/20 text-primary border border-primary/40' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Head / Face
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('CLOTHING')}
                className={`rounded px-2 py-0.5 font-semibold transition-colors ${categoryFilter === 'CLOTHING' ? 'bg-primary/20 text-primary border border-primary/40' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Clothing
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('GEAR')}
                className={`rounded px-2 py-0.5 font-semibold transition-colors ${categoryFilter === 'GEAR' ? 'bg-primary/20 text-primary border border-primary/40' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Gear / Weapons
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span>{filteredCatalog.length} compatible items</span>
              <button
                type="button"
                onClick={() => setShowAddedOnly((current) => !current)}
                className={`rounded border px-2 py-0.5 font-semibold ${showAddedOnly ? 'border-primary/60 text-primary bg-primary/20' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}
              >
                {showAddedOnly ? 'Show all' : 'Added only'}
              </button>
            </div>
          </div>
        )}
        <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
          {filteredCatalog.map((asset) => {
            const configured = configuredById.get(asset.id);
            const label = displayName(asset);
            return (
              <div key={asset.id} className="rounded border border-slate-800 bg-black/25 p-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!configured} onChange={(event) => toggleIncluded(asset, event.target.checked)} className="rounded border-slate-600 bg-black text-primary focus:ring-0" />
                  <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-slate-200">{label}</span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[8px] uppercase text-slate-400">
                    {getModelWardrobeCategory({ assetId: asset.id, label, category: asset.componentCategory || asset.metadata?.componentCategory || asset.metadata?.cat || undefined }).replace(/_/g, ' ')}
                  </span>
                </label>
                {configured && (
                  <div className="ml-6 mt-1.5 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <label className="flex items-center gap-1.5 text-[9px] text-slate-300">
                      <input type="checkbox" checked={configured.defaultVisible !== false} onChange={(event) => updateItem(asset.id, { defaultVisible: event.target.checked })} className="rounded border-slate-600 bg-black text-primary focus:ring-0" />
                      Show by default
                    </label>
                    {allowCharacterCreationOptions && (
                      <label className="flex items-center gap-1.5 text-[9px] text-slate-300">
                        <input type="checkbox" checked={configured.availableInCharacterCreation === true} onChange={(event) => updateItem(asset.id, { availableInCharacterCreation: event.target.checked })} className="rounded border-slate-600 bg-black text-primary focus:ring-0" />
                        Offer during creation
                      </label>
                    )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1.5 text-[9px] text-slate-300">
                        <span className="text-[8px] uppercase tracking-wider text-slate-500">Slot</span>
                        <select
                          value={configured.category || getModelWardrobeCategory(configured)}
                          onChange={(event) => updateItem(asset.id, { category: event.target.value, slot: event.target.value })}
                          className="rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-[9px] text-slate-200"
                        >
                          <option value="face">Face / Features</option>
                          <option value="hair">Hair</option>
                          <option value="beard">Facial Hair / Beard</option>
                          <option value="head_accessory">Glasses / Eyewear</option>
                          <option value="mask">Face Mask / Bandana</option>
                          <option value="hat">Hat / Headwear</option>
                          <option value="shirt">Shirt / Torso</option>
                          <option value="jacket">Jacket / Outerwear</option>
                          <option value="clothing">Full Outfit / Armor</option>
                          <option value="pants">Pants / Bottoms</option>
                          <option value="shoes">Shoes / Footwear</option>
                          <option value="gloves">Gloves / Hands</option>
                          <option value="back">Cape / Back Item</option>
                          <option value="belt">Belt / Waist</option>
                          <option value="weapon_main">Main Hand Weapon</option>
                          <option value="weapon_off">Offhand / Shield</option>
                          <option value="accessory">Other Accessory</option>
                        </select>
                      </label>
                      <label className="text-[8px] uppercase tracking-wider text-slate-500">Attachment</label>
                      <select
                        value={configured.attachmentMode || 'SKINNED'}
                        onChange={(event) => {
                          const attachmentMode = event.target.value as 'SKINNED' | 'RIGID_SOCKET';
                          updateItem(asset.id, {
                            attachmentMode,
                            socket: attachmentMode === 'RIGID_SOCKET' ? (configured.socket || 'RightHandMount') : undefined,
                          });
                        }}
                        className="rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-[9px] text-slate-200"
                      >
                        <option value="SKINNED">Wearable (follows skeleton)</option>
                        <option value="RIGID_SOCKET">Rigid item (socket)</option>
                      </select>
                      {configured.attachmentMode === 'RIGID_SOCKET' && (
                        <select
                          value={configured.socket || 'RightHandMount'}
                          onChange={(event) => updateItem(asset.id, { socket: event.target.value })}
                          className="max-w-56 rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-[9px] text-slate-200"
                        >
                          {STANDARD_SOCKET_OPTIONS.map((socket) => <option key={socket.id} value={socket.id}>{socket.label}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {orphanedItems.map((item) => (
            <div key={item.assetId} className="rounded border border-slate-800 bg-black/25 p-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked onChange={() => onChange(value.filter((current) => current.assetId !== item.assetId))} className="rounded border-slate-600 bg-black text-primary focus:ring-0" />
                <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-slate-200">{item.label || item.assetId}</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[8px] uppercase text-slate-400">{item.category || 'item'}</span>
              </label>
              <div className="ml-6 mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
                <label className="flex items-center gap-1.5 text-[9px] text-slate-300">
                  <input type="checkbox" checked={item.defaultVisible !== false} onChange={(event) => updateItem(item.assetId, { defaultVisible: event.target.checked })} className="rounded border-slate-600 bg-black text-primary focus:ring-0" />
                  Show by default
                </label>
                {allowCharacterCreationOptions && (
                  <label className="flex items-center gap-1.5 text-[9px] text-slate-300">
                    <input type="checkbox" checked={item.availableInCharacterCreation === true} onChange={(event) => updateItem(item.assetId, { availableInCharacterCreation: event.target.checked })} className="rounded border-slate-600 bg-black text-primary focus:ring-0" />
                    Offer during creation
                  </label>
                )}
                <label className="flex items-center gap-1.5 text-[9px] text-slate-300">
                  <span className="text-[8px] uppercase tracking-wider text-slate-500">Slot</span>
                  <select
                    value={item.category || getModelWardrobeCategory(item)}
                    onChange={(event) => updateItem(item.assetId, { category: event.target.value, slot: event.target.value })}
                    className="rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-[9px] text-slate-200"
                  >
                    <option value="face">Face / Features</option>
                    <option value="hair">Hair</option>
                    <option value="beard">Facial Hair / Beard</option>
                    <option value="head_accessory">Glasses / Eyewear</option>
                    <option value="mask">Face Mask / Bandana</option>
                    <option value="hat">Hat / Headwear</option>
                    <option value="shirt">Shirt / Torso</option>
                    <option value="jacket">Jacket / Outerwear</option>
                    <option value="clothing">Full Outfit / Armor</option>
                    <option value="pants">Pants / Bottoms</option>
                    <option value="shoes">Shoes / Footwear</option>
                    <option value="gloves">Gloves / Hands</option>
                    <option value="back">Cape / Back Item</option>
                    <option value="belt">Belt / Waist</option>
                    <option value="weapon_main">Main Hand Weapon</option>
                    <option value="weapon_off">Offhand / Shield</option>
                    <option value="accessory">Other Accessory</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5 text-[9px] text-slate-300">
                  <span>Attachment</span>
                  <select
                    value={item.attachmentMode || 'SKINNED'}
                    onChange={(event) => {
                      const attachmentMode = event.target.value as 'SKINNED' | 'RIGID_SOCKET';
                      updateItem(item.assetId, {
                        attachmentMode,
                        socket: attachmentMode === 'RIGID_SOCKET' ? (item.socket || 'RightHandMount') : undefined,
                      });
                    }}
                    className="rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-[9px] text-slate-200"
                  >
                    <option value="SKINNED">Wearable</option>
                    <option value="RIGID_SOCKET">Socket item</option>
                  </select>
                </label>
                {item.attachmentMode === 'RIGID_SOCKET' && (
                  <select
                    aria-label={`Socket for ${item.label || item.assetId}`}
                    value={item.socket || 'RightHandMount'}
                    onChange={(event) => updateItem(item.assetId, { socket: event.target.value })}
                    className="max-w-56 rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-[9px] text-slate-200"
                  >
                    {STANDARD_SOCKET_OPTIONS.map((socket) => <option key={socket.id} value={socket.id}>{socket.label}</option>)}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </section>
  );
}
