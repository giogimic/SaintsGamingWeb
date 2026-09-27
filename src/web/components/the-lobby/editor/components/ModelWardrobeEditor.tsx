'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, Shirt, Sparkles } from 'lucide-react';
import { AssetManager, type GameAssetItem } from '@/engine/assets/AssetManager';
import type { ModelWardrobeItem } from '@/shared/game/modelWardrobe';
import { STANDARD_SOCKET_OPTIONS } from './WorldModelSelector';

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

function getAssetGroupNames(asset: WardrobeAsset | null): string[] {
  if (!asset) return [];
  const presentation = asset.presentation || asset.metadata?.presentation || {};
  const definition = presentation.assetDefinition || asset.metadata?.assetDefinition || {};
  return [definition.modularSetName, displayName(asset)]
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
    .map((name) => name.trim().toLowerCase());
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
      || asset.tags?.some((tag) => ['modular', 'sprite-component'].includes(tag.toLowerCase())),
  );
}

export function ModelWardrobeEditor({
  modelAssetId,
  value,
  onChange,
  allowCharacterCreationOptions = false,
  title = 'Outfit & Item Loadout',
}: ModelWardrobeEditorProps) {
  const [catalog, setCatalog] = useState<WardrobeAsset[]>([]);
  const [relatedIds, setRelatedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!modelAssetId) {
      setCatalog([]);
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
      const groupNames = getAssetGroupNames(baseAsset as WardrobeAsset | null);
      const matched = groupNames.length > 0
        ? modelItems.filter((asset) => {
            const name = displayName(asset).toLowerCase();
            return groupNames.some((group) => name.startsWith(`${group} - `) || name.startsWith(`${group} / `));
          })
        : [];
      const visibleCatalog = matched.length > 0 ? matched : modelItems;
      if (cancelled) return;
      setCatalog(visibleCatalog.sort((a, b) => displayName(a).localeCompare(displayName(b))));
      setRelatedIds(matched.map((asset) => asset.id));
      setIsLoading(false);
    };

    void load().catch(() => {
      if (!cancelled) {
        setCatalog([]);
        setRelatedIds([]);
        setIsLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [modelAssetId]);

  const configuredById = useMemo(() => new Map(value.map((item) => [item.assetId, item])), [value]);
  const filteredCatalog = useMemo(() => {
    const query = search.trim().toLowerCase();
    return catalog.filter((asset) => !query || `${displayName(asset)} ${asset.componentCategory || ''}`.toLowerCase().includes(query));
  }, [catalog, search]);

  const toggleIncluded = (asset: WardrobeAsset, included: boolean) => {
    if (!included) {
      onChange(value.filter((item) => item.assetId !== asset.id));
      return;
    }
    const category = asset.componentCategory || 'other';
    onChange([
      ...value,
      {
        type: '3D Model',
        assetId: asset.id,
        label: displayName(asset),
        category,
        isModular: true,
        attachmentMode: 'SKINNED',
        defaultVisible: true,
        availableInCharacterCreation: allowCharacterCreationOptions,
        hidesComponents: asset.hidesComponents || [],
      },
    ]);
  };

  const updateItem = (assetId: string, patch: Partial<ModelWardrobeItem>) => {
    onChange(value.map((item) => item.assetId === assetId ? { ...item, ...patch } : item));
  };

  const catalogIds = new Set(catalog.map((asset) => asset.id));
  const orphanedItems = value.filter((item) => !catalogIds.has(item.assetId));

  return (
    <section className="mt-3 rounded-lg border border-cyan-900/40 bg-black/25 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
          <Shirt size={12} /> {title}
        </div>
        <span className="text-[9px] text-slate-500">{value.length} selected</span>
      </div>
      <p className="text-[9px] text-slate-400">
        {allowCharacterCreationOptions
          ? 'Choose the base outfit, what appears by default, and which pieces players can change during character creation.'
          : 'Choose this character’s items, default visibility, and how each piece attaches to the model.'}
      </p>

      {catalog.length > 0 && (
        <div className="flex items-center gap-1.5 rounded border border-slate-800 bg-black/30 px-2 py-1.5">
          <Search size={11} className="text-slate-500" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find clothing or equipment..." className="w-full bg-transparent text-[10px] text-slate-200 outline-none placeholder:text-slate-600" />
          {relatedIds.length > 0 && <span className="whitespace-nowrap text-[8px] text-emerald-400"><Sparkles size={10} className="inline" /> linked set</span>}
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
        <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
          {filteredCatalog.map((asset) => {
            const configured = configuredById.get(asset.id);
            const label = displayName(asset);
            return (
              <div key={asset.id} className="rounded border border-slate-800 bg-black/25 p-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!configured} onChange={(event) => toggleIncluded(asset, event.target.checked)} className="rounded border-slate-600 bg-black text-cyan-500 focus:ring-0" />
                  <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-slate-200">{label}</span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[8px] uppercase text-slate-400">{asset.componentCategory || 'item'}</span>
                </label>
                {configured && (
                  <div className="ml-6 mt-1.5 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <label className="flex items-center gap-1.5 text-[9px] text-slate-300">
                      <input type="checkbox" checked={configured.defaultVisible !== false} onChange={(event) => updateItem(asset.id, { defaultVisible: event.target.checked })} className="rounded border-slate-600 bg-black text-cyan-500 focus:ring-0" />
                      Show by default
                    </label>
                    {allowCharacterCreationOptions && (
                      <label className="flex items-center gap-1.5 text-[9px] text-slate-300">
                        <input type="checkbox" checked={configured.availableInCharacterCreation === true} onChange={(event) => updateItem(asset.id, { availableInCharacterCreation: event.target.checked })} className="rounded border-slate-600 bg-black text-cyan-500 focus:ring-0" />
                        Offer during creation
                      </label>
                    )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
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
                <input type="checkbox" checked onChange={() => onChange(value.filter((current) => current.assetId !== item.assetId))} className="rounded border-slate-600 bg-black text-cyan-500 focus:ring-0" />
                <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-slate-200">{item.label || item.assetId}</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[8px] uppercase text-slate-400">{item.category || 'item'}</span>
              </label>
              <div className="ml-6 mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
                <label className="flex items-center gap-1.5 text-[9px] text-slate-300">
                  <input type="checkbox" checked={item.defaultVisible !== false} onChange={(event) => updateItem(item.assetId, { defaultVisible: event.target.checked })} className="rounded border-slate-600 bg-black text-cyan-500 focus:ring-0" />
                  Show by default
                </label>
                {allowCharacterCreationOptions && (
                  <label className="flex items-center gap-1.5 text-[9px] text-slate-300">
                    <input type="checkbox" checked={item.availableInCharacterCreation === true} onChange={(event) => updateItem(item.assetId, { availableInCharacterCreation: event.target.checked })} className="rounded border-slate-600 bg-black text-cyan-500 focus:ring-0" />
                    Offer during creation
                  </label>
                )}
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
      )}
    </section>
  );
}
