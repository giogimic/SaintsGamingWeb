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
} from 'lucide-react';
import { AssetManager, GameAssetItem } from '@/engine/assets/AssetManager';

export interface AssetEditorProps {
  onAssetSelect?: (asset: GameAssetItem) => void;
  onAssetEdit?: (asset: GameAssetItem) => void;
}

export default function AssetEditor({ onAssetSelect, onAssetEdit }: AssetEditorProps) {
  const [assets, setAssets] = useState<GameAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('SPRITE');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [activeAsset, setActiveAsset] = useState<GameAssetItem | null>(null);

  // Reclassify Modal State
  const [reclassifyModalOpen, setReclassifyModalOpen] = useState(false);
  const [reclassifyType, setReclassifyType] = useState('SPRITE');
  const [reclassifyCategories, setReclassifyCategories] = useState('npcs,heroes');
  const [newTagInput, setNewTagInput] = useState('');

  useEffect(() => {
    fetchAssets();
  }, [typeFilter, searchQuery, selectedTag]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const manager = AssetManager.getInstance();
      const res = await manager.searchAssets({
        type: typeFilter === 'ALL' ? undefined : typeFilter,
        query: searchQuery || undefined,
        tags: selectedTag ? [selectedTag] : undefined,
      });
      setAssets(res.items);
      if (res.items.length > 0 && !activeAsset) {
        setActiveAsset(res.items[0]);
      }
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAsset = (id: string) => {
    const updated = new Set(selectedAssetIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedAssetIds(updated);
  };

  const selectAll = () => {
    if (selectedAssetIds.size === assets.length) {
      setSelectedAssetIds(new Set());
    } else {
      setSelectedAssetIds(new Set(assets.map((a) => a.id)));
    }
  };

  const handleAddTag = async () => {
    if (!activeAsset || !newTagInput.trim()) return;
    try {
      const manager = AssetManager.getInstance();
      await manager.addTag(activeAsset.id, newTagInput.trim().toLowerCase());
      setNewTagInput('');
      fetchAssets();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!activeAsset) return;
    try {
      const manager = AssetManager.getInstance();
      await manager.removeTag(activeAsset.id, tagToRemove);
      fetchAssets();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReclassifySubmit = async () => {
    if (selectedAssetIds.size === 0 && !activeAsset) return;
    const idsToReclassify = selectedAssetIds.size > 0 ? Array.from(selectedAssetIds) : [activeAsset!.id];
    const cats = reclassifyCategories.split(',').map((c) => c.trim()).filter(Boolean);

    try {
      const manager = AssetManager.getInstance();
      for (const id of idsToReclassify) {
        await manager.reclassifyAsset(id, reclassifyType, cats);
      }
      setReclassifyModalOpen(false);
      fetchAssets();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050b14] text-slate-100 font-mono rounded-lg overflow-hidden border border-slate-800">
      {/* Top Action Toolbar */}
      <div className="flex items-center justify-between p-3 bg-[#0b1320] border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search assets, paths, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/60 border border-slate-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#806f47]"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-black/60 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#806f47]"
          >
            <option value="ALL">All Types</option>
            <option value="SPRITE">Sprites (NPC / Player)</option>
            <option value="TILESET">Tilesets</option>
            <option value="ITEM_ICON">Item Icons</option>
            <option value="MONSTER">Monsters</option>
            <option value="AUDIO">Audio</option>
            <option value="UI_ELEMENT">UI Elements</option>
          </select>

          {selectedTag && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#050b14] border border-[#806f47]/50 text-[#e2d5b3] rounded text-xs">
              Tag: #{selectedTag}
              <button onClick={() => setSelectedTag(null)} className="hover:text-red-400 font-bold ml-1">
                ×
              </button>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedAssetIds.size > 0 && (
            <button
              onClick={() => setReclassifyModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs font-bold transition-all shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reclassify ({selectedAssetIds.size})
            </button>
          )}

          <div className="flex items-center border border-slate-700 rounded bg-black/40">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 ${viewMode === 'grid' ? 'bg-[#806f47] text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 ${viewMode === 'list' ? 'bg-[#806f47] text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Category / Tag Sidebar */}
        <div className="w-56 bg-[#0b1320]/80 border-r border-slate-800 p-3 flex flex-col gap-4 overflow-y-auto">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Categories</span>
            <div className="flex flex-col gap-1 text-xs">
              {['ALL', 'npcs', 'heroes', 'monsters', 'tilesets', 'items', 'ui'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setTypeFilter(cat === 'ALL' ? 'ALL' : cat.toUpperCase());
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800 text-slate-300 text-left transition-colors"
                >
                  <Folder className="w-3.5 h-3.5 text-[#cbb26a]" />
                  <span className="capitalize">{cat}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Quick Tags</span>
            <div className="flex flex-wrap gap-1">
              {['creature', 'npc', 'hero', 'combat', 'civilian', 'male', 'female', 'blue', 'fiery'].map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTag(t)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                    selectedTag === t
                      ? 'bg-[#806f47] border-amber-400 text-white'
                      : 'bg-black/40 border-slate-700 text-slate-300 hover:border-[#806f47]'
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center Grid / List View */}
        <div className="flex-1 p-3 overflow-y-auto bg-[#050b14]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-xs text-slate-400">Loading assets...</div>
          ) : assets.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-slate-500 italic">No assets found</div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {assets.map((asset) => {
                const isSelected = selectedAssetIds.has(asset.id);
                const isActive = activeAsset?.id === asset.id;
                return (
                  <div
                    key={asset.id}
                    onClick={() => {
                      setActiveAsset(asset);
                      if (onAssetSelect) onAssetSelect(asset);
                    }}
                    className={`relative aspect-square bg-[#0b1320] border rounded-lg p-2 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-amber-400 ${
                      isActive ? 'border-[#806f47] ring-2 ring-amber-500/30' : 'border-slate-800'
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectAsset(asset.id);
                      }}
                      className="absolute top-1 left-1 z-10 text-slate-400 hover:text-[#e2d5b3]"
                    >
                      {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-[#cbb26a]" /> : <Square className="w-3.5 h-3.5" />}
                    </button>

                    <div className="w-12 h-12 relative flex items-center justify-center overflow-hidden">
                      <img
                        src={asset.source}
                        alt={asset.id}
                        className="max-w-full max-h-full object-contain image-rendering-pixelated"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-300 truncate w-full text-center mt-1">
                      {asset.source.split('/').pop()}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => setActiveAsset(asset)}
                  className={`flex items-center justify-between p-2 rounded border cursor-pointer ${
                    activeAsset?.id === asset.id ? 'bg-slate-800 border-[#806f47]' : 'bg-[#0b1320] border-slate-800 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img src={asset.source} alt="" className="w-8 h-8 object-contain image-rendering-pixelated" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-200">{asset.source}</span>
                      <span className="text-[10px] text-slate-400">{asset.type} • {asset.tags.join(', ')}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500">{asset.categories.join(', ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Asset Preview & Inspector Pane */}
        {activeAsset && (
          <div className="w-72 bg-[#0b1320]/90 border-l border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto">
            <span className="text-xs font-bold text-[#cbb26a] uppercase tracking-wider">[ ASSET INSPECTOR ]</span>

            {/* Preview Box */}
            <div className="w-full aspect-square bg-black/60 border border-slate-800 rounded-lg flex items-center justify-center p-4 relative overflow-hidden">
              <img
                src={activeAsset.source}
                alt=""
                className="max-w-full max-h-full object-contain image-rendering-pixelated scale-150"
              />
            </div>

            {/* Info Table */}
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Type</span>
                <span className="text-[#e2d5b3] font-bold">{activeAsset.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Game</span>
                <span className="text-slate-200">{activeAsset.gameId || 'Shared'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Categories</span>
                <span className="text-slate-200">{activeAsset.categories.join(', ')}</span>
              </div>
            </div>

            {/* Tags Panel */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-slate-400">TAGS</span>
              <div className="flex flex-wrap gap-1">
                {activeAsset.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded text-[10px]"
                  >
                    #{t}
                    <button onClick={() => handleRemoveTag(t)} className="text-slate-500 hover:text-red-400 ml-0.5 font-bold">
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-1 mt-1">
                <input
                  type="text"
                  placeholder="Add tag..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  className="flex-1 bg-black/60 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-[#806f47]"
                />
                <button
                  onClick={handleAddTag}
                  className="px-2.5 py-1 bg-amber-700 hover:bg-[#806f47] text-white rounded text-xs font-bold"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 mt-auto">
              <button
                onClick={() => setReclassifyModalOpen(true)}
                className="w-full py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs font-bold transition-colors flex items-center justify-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reclassify Asset
              </button>
              {onAssetEdit && (
                <button
                  onClick={() => onAssetEdit(activeAsset)}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Metadata
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reclassify Modal */}
      {reclassifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0b1320] border border-purple-500/50 p-6 rounded-xl w-full max-w-md shadow-2xl flex flex-col gap-4">
            <span className="text-purple-400 font-bold text-sm tracking-wider">[ RECLASSIFY GAME ASSET ]</span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Fix mislabeled items by reassigning asset type and categories across selected items ({selectedAssetIds.size || 1}).
            </p>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Target Asset Type</label>
              <select
                value={reclassifyType}
                onChange={(e) => setReclassifyType(e.target.value)}
                className="bg-black/60 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="SPRITE">SPRITE (NPC / Hero Character)</option>
                <option value="TILESET">TILESET (Terrain / Environment)</option>
                <option value="ITEM_ICON">ITEM_ICON (Inventory Icon)</option>
                <option value="MONSTER">MONSTER (Creature Beast)</option>
                <option value="AUDIO">AUDIO (SFX / Music)</option>
                <option value="UI_ELEMENT">UI_ELEMENT (Menu Graphics)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Categories (comma-separated)</label>
              <input
                type="text"
                value={reclassifyCategories}
                onChange={(e) => setReclassifyCategories(e.target.value)}
                className="bg-black/60 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                placeholder="npcs, heroes, civilians"
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setReclassifyModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleReclassifySubmit}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold shadow-md"
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
