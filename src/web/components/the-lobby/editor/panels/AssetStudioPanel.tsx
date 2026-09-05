'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SpriteBrowser from '../SpriteBrowser';
import { Layers, ArrowUpRight, FolderOpen, Package, Plus, Trash2, BoxSelect, Droplet, LayoutGrid } from 'lucide-react';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';
import type { GameAssetItem } from '@/engine/assets/AssetManager';
import { listPrefabs, savePrefab, deletePrefab, seedBasicPrefabs, type PrefabTileData, type PrefabLogicData } from '@/app/actions/studio/prefabs';
import { extractSubgridFromMap, extractSparseCellsFromMap } from '@/shared/game/subgridStamp';
import { recordRecentItem } from '@/shared/game/creatorRecents';
import {
  WindowMenuBar,
  WindowMenuDropdown,
  WindowMenuButton,
  WindowMenuDivider,
  WindowMenuTabGroup,
} from '../WindowMenuBar';

function spriteKeyFromAsset(asset: GameAssetItem): string {
  const src = asset.source || '';
  const m = src.match(/\/game-assets\/npc\/([^/]+?)(?:\.png)?(?:$|\?)/i);
  if (m?.[1]) return m[1].replace(/-ow$/i, '');
  const base = src.split('/').pop() || src;
  return base.replace(/\.png$/i, '');
}

export const AssetStudioPanel: React.FC = () => {
  const studioMode = useEditorStore((s) => s.studioMode);
  const setStudioMode = useEditorStore((s) => s.setStudioMode);
  const showToast = useGameStore((s) => s.showToast);

  const [activeTab, setActiveTab] = useState<'sprites' | 'blueprints'>('sprites');

  // Blueprints state
  const brushMode = useEditorStore((s) => s.brushMode);
  const setBrushMode = useEditorStore((s) => s.setBrushMode);
  const activePrefabId = useEditorStore((s) => s.activePrefabId);
  const setActivePrefabId = useEditorStore((s) => s.setActivePrefabId);
  const selectionStart = useEditorStore((s) => s.selectionStart);
  const selectionEnd = useEditorStore((s) => s.selectionEnd);
  const selectedCells = useEditorStore((s) => s.selectedCells);
  const activeMapData = useGameStore((s) => s.activeMapData);
  const prefabs = useEditorStore((s) => s.prefabs);
  const setPrefabs = useEditorStore((s) => s.setPrefabs);

  const [loading, setLoading] = useState(false);
  const [newPrefabName, setNewPrefabName] = useState('');

  const reloadPrefabs = useCallback(async () => {
    setLoading(true);
    const res = await listPrefabs();
    if (res.success && res.data) {
      setPrefabs(res.data);
    }
    setLoading(false);
  }, [setPrefabs]);

  useEffect(() => {
    if (activeTab === 'blueprints') {
      void reloadPrefabs();
    }
  }, [activeTab, reloadPrefabs]);

  const handleSpriteSelect = (assets: GameAssetItem[]) => {
    const asset = assets[0];
    if (!asset) return;
    const key = spriteKeyFromAsset(asset);
    window.dispatchEvent(new CustomEvent('studio_sprite_picked', { detail: { key, source: asset.source } }));
    showToast(`Sprite selected: ${key}`);
    try {
      void navigator.clipboard?.writeText(key);
    } catch {}
  };

  const handleSaveSelection = async () => {
    const selectedKeys = Object.keys(selectedCells || {}).filter((k) => selectedCells[k]);
    if (!newPrefabName || (!selectionStart && selectedKeys.length === 0) || !activeMapData) {
      showToast('Select an area or tiles on the map and enter a name first.');
      return;
    }

    let subgrid: any = null;
    if (selectedKeys.length > 0) {
      const cells = selectedKeys.map((k) => {
        const [r, c] = k.split(',').map(Number);
        return { r, c };
      });
      subgrid = extractSparseCellsFromMap({ map: activeMapData, cells });
    } else if (selectionStart && selectionEnd) {
      subgrid = extractSubgridFromMap({
        map: activeMapData,
        minR: selectionStart.r,
        maxR: selectionEnd.r,
        minC: selectionStart.c,
        maxC: selectionEnd.c,
      });
    }

    if (!subgrid || (subgrid.visualData.length === 0 && subgrid.logicData.length === 0)) {
      showToast('No tiles found in the selected area to save as a blueprint.');
      return;
    }

    const res = await savePrefab({
      name: newPrefabName,
      category: 'decor',
      width: subgrid.width,
      height: subgrid.height,
      visualData: subgrid.visualData as PrefabTileData[],
      logicData: subgrid.logicData as PrefabLogicData[],
    });

    if (res.success) {
      showToast('Blueprint saved successfully!');
      setNewPrefabName('');
      useEditorStore.getState().clearSelectedCells();
      setBrushMode('paint');
      reloadPrefabs();
    } else {
      showToast('Failed to save blueprint: ' + res.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this blueprint?')) return;
    const res = await deletePrefab(id);
    if (res.success) {
      showToast('Blueprint deleted.');
      if (activePrefabId === id) {
        setActivePrefabId(null);
        setBrushMode('paint');
      }
      reloadPrefabs();
    }
  };

  const isSelecting = brushMode === 'select';
  const hasSelection = selectionStart && selectionEnd;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#050b14]/90 font-mono -m-3 mb-0">
      {/* ── WINDOW SUB-MENU APP BAR ── */}
      <WindowMenuBar>
        <WindowMenuDropdown
          label="Tools"
          items={[
            {
              label: 'Sprite Slicer Tool',
              onClick: () => setStudioMode('assets'),
            },
          ]}
        />
        <WindowMenuDivider />
        <WindowMenuTabGroup
          tabs={[
            { id: 'sprites', label: 'Sprites & VFX', icon: FolderOpen },
            { id: 'blueprints', label: 'Blueprints / Prefabs', icon: Package },
          ]}
          activeTab={activeTab}
          onChange={(id: string) => setActiveTab(id as any)}
        />
        <WindowMenuDivider />
        <WindowMenuButton
          label="Full Asset Studio"
          icon={ArrowUpRight}
          onClick={() => setStudioMode('assets')}
          title="Switch to full Asset Management Studio (Upload, Slicer, Packs)"
        />
      </WindowMenuBar>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === 'sprites' ? (
          <>
            <div className="p-3 bg-black/40 border-b border-border/30">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                <FolderOpen className="w-4 h-4" /> 
                {studioMode === 'npc' ? 'Character Sprite Library' : 'Global Asset Library'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Browse and manage all 2D sprites, VFX, and audio assets here. Need to extract a single animation from a large 2D spritesheet? Use the <strong>Sprite Slicer Tool</strong> in the menu above.
              </p>
            </div>
            <div className="flex-1 overflow-hidden p-2">
              <SpriteBrowser
                filterTags={studioMode === 'npc' ? ['npc'] : []}
                filterType={studioMode === 'npc' ? 'CHARACTER' : undefined}
                onSelect={handleSpriteSelect}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            <div className="flex flex-col h-full bg-black/20 border-r border-border/30 w-56 text-xs text-slate-300">
              <div className="p-3 border-b border-border/30 bg-black/40 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setBrushMode(isSelecting ? 'paint' : 'select');
                    useEditorStore.getState().setSelectionStart(null);
                    useEditorStore.getState().setSelectionEnd(null);
                  }}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded font-semibold transition-colors ${
                    isSelecting ? 'bg-primary/20 text-primary border border-primary/50' : 'bg-card/40 border border-border/40 hover:bg-white/5 text-slate-300'
                  }`}
                >
                  <BoxSelect size={14} />
                  {isSelecting ? 'Cancel Selection' : 'Select Map Area'}
                </button>
                
                {isSelecting && (
                  <div className="bg-primary/10 p-2 rounded border border-primary/20 text-primary">
                    {hasSelection ? (
                      <div className="space-y-2">
                        <p className="text-[10px] text-primary/80 uppercase font-bold">Selection ready.</p>
                        <input
                          type="text"
                          placeholder="Blueprint Name..."
                          value={newPrefabName}
                          onChange={(e) => setNewPrefabName(e.target.value)}
                          className="w-full bg-black/50 border border-primary/30 rounded px-2 py-1 outline-none focus:border-primary"
                        />
                        <button
                          onClick={handleSaveSelection}
                          disabled={!newPrefabName}
                          className="w-full bg-primary hover:bg-primary/80 disabled:opacity-50 text-black rounded py-1 flex items-center justify-center gap-1 font-bold transition-colors"
                        >
                          <Plus size={12} /> Save Blueprint
                        </button>
                      </div>
                    ) : (
                      <p className="opacity-80 text-[10px]">Click and drag on the map to select an area.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {loading ? (
                  <div className="p-4 text-center opacity-50">Loading...</div>
                ) : prefabs.length === 0 ? (
                  <div className="p-4 text-center opacity-50 space-y-3">
                    <p>No blueprints found.</p>
                    <button
                      onClick={async () => {
                        const res = await seedBasicPrefabs();
                        if (res.success) {
                          showToast('Starter blueprints seeded!');
                          reloadPrefabs();
                        } else {
                          showToast('Failed to seed: ' + res.error);
                        }
                      }}
                      className="px-3 py-1 bg-primary/20 border border-primary/30 hover:bg-primary/40 rounded text-[10px] text-primary transition-colors"
                    >
                      Load Starters
                    </button>
                  </div>
                ) : (
                  prefabs.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setActivePrefabId(p.id);
                        setBrushMode('prefab');
                        recordRecentItem({
                          id: p.id,
                          type: 'asset',
                          title: p.name,
                          subtitle: `${p.width || 0}×${p.height || 0} Blueprint`,
                        });
                      }}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer group ${
                        activePrefabId === p.id && brushMode === 'prefab'
                          ? 'bg-primary/20 border border-primary/50 text-primary'
                          : 'bg-card/40 border border-border/40 hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Package size={14} className="opacity-70" />
                        <span className="truncate">{p.name}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(p.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500 text-sm bg-black/20">
              {brushMode === 'prefab' && activePrefabId ? (
                <div className="text-center space-y-4 max-w-sm">
                  <LayoutGrid size={48} className="mx-auto text-primary/30" />
                  <h3 className="text-xl text-primary font-semibold">Ready to Stamp</h3>
                  <p>
                    Blueprint <strong>{prefabs.find((p) => p.id === activePrefabId)?.name}</strong> is selected.
                  </p>
                  <p className="text-xs">
                    Click anywhere on the map to paste it. It will inject tiles starting at the current layer index, and also update logic tags.
                  </p>
                  <button
                    onClick={() => {
                      setBrushMode('paint');
                      setActivePrefabId(null);
                    }}
                    className="mt-4 px-4 py-2 bg-card border border-border/40 hover:bg-white/5 rounded flex items-center justify-center gap-2 mx-auto text-slate-200 transition-colors"
                  >
                    <Droplet size={16} /> Return to Paint Mode
                  </button>
                </div>
              ) : brushMode === 'select' ? (
                <div className="text-center max-w-sm">
                  <BoxSelect size={48} className="mx-auto text-primary/30 mb-4" />
                  <h3 className="text-xl text-primary font-semibold mb-2">Selection Mode</h3>
                  <p className="text-xs">Drag a box on the map to define the blueprint bounds.</p>
                </div>
              ) : (
                <div className="text-center max-w-sm">
                  <Package size={48} className="mx-auto text-slate-700 mb-4" />
                  <h3 className="text-xl text-slate-400 font-semibold mb-2">Blueprint Tools</h3>
                  <p className="text-xs">Select a blueprint from the list to paint it, or click "Select Map Area" to create a new one.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
