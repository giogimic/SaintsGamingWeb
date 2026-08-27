'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';
import { Plus, Trash2, BoxSelect, Droplet, LayoutGrid } from 'lucide-react';
import { listPrefabs, savePrefab, deletePrefab, seedBasicPrefabs, type PrefabTileData, type PrefabLogicData } from '@/app/actions/prefabs';
import { extractSubgridFromMap, extractSparseCellsFromMap } from '@/shared/game/subgridStamp';
import type { MapPrefab } from '@prisma/client';
import { CatalogEditorShell } from '../components/CatalogEditorShell';

export const PrefabBuilderPanel: React.FC = () => {
  const isOpen = useEditorStore((s) => s.panels.prefab?.isOpen);
  const brushMode = useEditorStore((s) => s.brushMode);
  const setBrushMode = useEditorStore((s) => s.setBrushMode);
  const activePrefabId = useEditorStore((s) => s.activePrefabId);
  const setActivePrefabId = useEditorStore((s) => s.setActivePrefabId);
  const selectionStart = useEditorStore((s) => s.selectionStart);
  const selectionEnd = useEditorStore((s) => s.selectionEnd);
  const selectedCells = useEditorStore((s) => s.selectedCells);
  
  const activeMapData = useGameStore((s) => s.activeMapData);
  const showToast = useGameStore((s) => s.showToast);

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
  }, []);

  useEffect(() => {
    if (isOpen) void reloadPrefabs();
  }, [isOpen, reloadPrefabs]);

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
      showToast('No tiles found in the selected area to save as a prefab.');
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
      showToast('Prefab saved successfully!');
      setNewPrefabName('');
      useEditorStore.getState().clearSelectedCells();
      setBrushMode('paint');
      reloadPrefabs();
    } else {
      showToast('Failed to save prefab: ' + res.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this prefab?')) return;
    const res = await deletePrefab(id);
    if (res.success) {
      showToast('Prefab deleted.');
      if (activePrefabId === id) {
        setActivePrefabId(null);
        setBrushMode('paint');
      }
      reloadPrefabs();
    }
  };

  if (!isOpen) return null;

  const isSelecting = brushMode === 'select';
  const hasSelection = selectionStart && selectionEnd;

  const sidebar = (
    <div className="flex flex-col h-full bg-transparent border-r border-[#806f47]/30 w-56 text-xs text-slate-300">
      <div className="p-3 border-b border-[#806f47]/30 bg-slate-800/50 flex flex-col gap-2">
        <button
          onClick={() => {
            setBrushMode(isSelecting ? 'paint' : 'select');
            useEditorStore.getState().setSelectionStart(null);
            useEditorStore.getState().setSelectionEnd(null);
          }}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded font-semibold transition-colors ${
            isSelecting ? 'bg-indigo-600 text-white shadow-inner' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
          }`}
        >
          <BoxSelect size={14} />
          {isSelecting ? 'Cancel Selection' : 'Select Map Area'}
        </button>
        
        {isSelecting && (
          <div className="bg-indigo-900/40 p-2 rounded border border-indigo-500/30 text-indigo-200">
            {hasSelection ? (
              <div className="space-y-2">
                <p>Selection ready.</p>
                <input
                  type="text"
                  placeholder="Prefab Name..."
                  value={newPrefabName}
                  onChange={(e) => setNewPrefabName(e.target.value)}
                  className="w-full bg-transparent border border-[#806f47]/30 rounded px-2 py-1"
                />
                <button
                  onClick={handleSaveSelection}
                  disabled={!newPrefabName}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded py-1 flex items-center justify-center gap-1"
                >
                  <Plus size={12} /> Save Prefab
                </button>
              </div>
            ) : (
              <p className="opacity-80">Click and drag on the map to select an area.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="p-4 text-center opacity-50">Loading...</div>
        ) : prefabs.length === 0 ? (
          <div className="p-4 text-center opacity-50 space-y-3">
            <p>No prefabs found.</p>
            <button
              onClick={async () => {
                const res = await seedBasicPrefabs();
                if (res.success) {
                  showToast('Starter prefabs seeded!');
                  reloadPrefabs();
                } else {
                  showToast('Failed to seed: ' + res.error);
                }
              }}
              className="px-3 py-1 bg-emerald-600/50 hover:bg-emerald-500/80 rounded text-xs text-white"
            >
              Load Starter Prefabs
            </button>
          </div>
        ) : (
          prefabs.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                setActivePrefabId(p.id);
                setBrushMode('prefab');
              }}
              className={`flex items-center justify-between p-2 rounded cursor-pointer group ${
                activePrefabId === p.id && brushMode === 'prefab'
                  ? 'bg-emerald-900/60 border border-emerald-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <LayoutGrid size={14} className="text-emerald-400 opacity-70" />
                <span className="truncate">{p.name}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(p.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 p-1"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <CatalogEditorShell
      title="Prefab Builder"
      blurb="Create multi-tile structures and place them easily."
      list={sidebar}
    >
      <div className="p-6 h-full flex flex-col items-center justify-center text-slate-500 text-sm">
        {brushMode === 'prefab' && activePrefabId ? (
          <div className="text-center space-y-4 max-w-sm">
            <LayoutGrid size={48} className="mx-auto text-emerald-500/30" />
            <h3 className="text-xl text-slate-300 font-semibold">Ready to Stamp</h3>
            <p>
              Prefab <strong>{prefabs.find((p) => p.id === activePrefabId)?.name}</strong> is selected.
            </p>
            <p>
              Click anywhere on the map to paste it. It will inject tiles starting at the current layer index, and also update logic tags.
            </p>
            <button
              onClick={() => {
                setBrushMode('paint');
                setActivePrefabId(null);
              }}
              className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded flex items-center justify-center gap-2 mx-auto text-slate-200"
            >
              <Droplet size={16} /> Return to Paint Mode
            </button>
          </div>
        ) : brushMode === 'select' ? (
          <div className="text-center max-w-sm">
            <BoxSelect size={48} className="mx-auto text-indigo-500/30 mb-4" />
            <h3 className="text-xl text-slate-300 font-semibold mb-2">Selection Mode</h3>
            <p>Drag a box on the map to define the prefab bounds.</p>
          </div>
        ) : (
          <div className="text-center max-w-sm">
            <LayoutGrid size={48} className="mx-auto text-slate-700 mb-4" />
            <h3 className="text-xl text-slate-400 font-semibold mb-2">Prefab Tools</h3>
            <p>Select a prefab from the list to paint it, or click "Select Map Area" to create a new one.</p>
          </div>
        )}
      </div>
    </CatalogEditorShell>
  );
};
