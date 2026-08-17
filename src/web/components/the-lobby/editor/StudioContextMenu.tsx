'use client';

import React, { useEffect, useRef } from 'react';
import {
  Clipboard,
  Layers,
  DoorOpen,
  MapPin,
  Pipette,
  UserRound,
  Trash2,
  PaintBucket,
  SquareDashed,
  Sparkles,
  Copy,
  Info
} from 'lucide-react';
import { useEditorStore } from './editor-store';
import { useGameStore } from '../store';
import { soundSynth } from '@/engine/sound-synth';
import { upsertWarpGate } from '@/shared/game/logicComponents';
import { STUDIO_TRIGGER_SAVE_MAP_EVENT } from '@/shared/game/studioEvents';

export interface StudioContextMenuProps {
  x: number;
  y: number;
  tileR: number;
  tileC: number;
  onClose: () => void;
}

export const StudioContextMenu: React.FC<StudioContextMenuProps> = ({
  x,
  y,
  tileR,
  tileC,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const isCreationMode = useEditorStore((s) => s.isCreationMode);
  const activeLayerIdx = useEditorStore((s) => s.activeLayerIdx);
  const activeBrushTileId = useEditorStore((s) => s.activeBrushTileId);
  const activeLogicTileId = useEditorStore((s) => s.activeLogicTileId);
  const activeMapData = useGameStore((s) => s.activeMapData);
  const showToast = useGameStore((s) => s.showToast);

  // Close on outside click or Escape
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust menu position so it stays in viewport
  const menuWidth = 240;
  const menuHeight = 320;
  const clampedX = typeof window !== 'undefined' ? Math.min(x, window.innerWidth - menuWidth - 16) : x;
  const clampedY = typeof window !== 'undefined' ? Math.min(y, window.innerHeight - menuHeight - 16) : y;

  const handleAction = (cb: () => void) => {
    soundSynth?.playUiClick?.();
    cb();
    onClose();
  };

  const handleSampleTile = () => {
    if (!activeMapData) return;
    if (activeLayerIdx === -1) {
      const logicGrid = activeMapData.grid;
      const val = logicGrid?.[tileR]?.[tileC] ?? 0;
      useEditorStore.getState().setActiveLogicTileId(val);
      showToast(`Sampled Logic tag #${val} at [${tileC}, ${tileR}]`);
    } else {
      const tileLayers = activeMapData.tileLayers || [];
      const layer = tileLayers[activeLayerIdx];
      const val = layer?.grid?.[tileR]?.[tileC] ?? 0;
      useEditorStore.getState().setActiveBrushTileId(val);
      showToast(`Sampled Visual GID ${val} at [${tileC}, ${tileR}]`);
    }
  };

  const [isSelectingGateType, setIsSelectingGateType] = React.useState(false);

  const handleSetPlayerSpawn = () => {
    useGameStore.getState().setPlayerPosition({ x: tileC, y: tileR }, 'down', false);
    showToast(`Teleported author avatar to [${tileC}, ${tileR}]`);
  };

  const handleSetDefaultMapSpawn = () => {
    if (!activeMapData) return;
    const next = {
      ...activeMapData,
      defaultSpawn: { x: tileC, y: tileR },
      spawnPoint: { x: tileC, y: tileR },
    };
    useGameStore.getState().setActiveMapData(next);
    useEditorStore.getState().markMapDirty();
    showToast(`Set default map spawn point to [${tileC}, ${tileR}]`);
  };

  const handlePlaceSpecificGate = (gatePreset: {
    name: string;
    targetMapId: string;
    tileBrush: number;
    category?: string;
  }) => {
    if (!activeMapData) return;
    const nextGates = upsertWarpGate(activeMapData.gates, {
      id: `gate_${tileC}_${tileR}`,
      position: { x: tileC, y: tileR },
      targetMapId: gatePreset.targetMapId,
      spawnPoint: { x: tileC, y: tileR },
      category: gatePreset.category,
    });
    const nextGrid = (activeMapData.grid || []).map((row: number[], ri: number) =>
      row.map((cell: number, ci: number) => (ri === tileR && ci === tileC ? gatePreset.tileBrush : cell))
    );
    const next = { ...activeMapData, gates: nextGates, grid: nextGrid };
    useGameStore.getState().setActiveMapData(next);
    useEditorStore.getState().markMapDirty();
    useEditorStore.getState().setShowWarpOverlays(true);
    showToast(`Placed ${gatePreset.name} at [${tileC}, ${tileR}]`);
  };

  const handleFillLayerWithBrush = () => {
    if (!activeMapData) return;
    const gridH = activeMapData.grid?.length || 24;
    const gridW = activeMapData.grid?.[0]?.length || 24;
    
    if (activeLayerIdx === -1) {
      const filled = Array(gridH).fill(0).map(() => Array(gridW).fill(activeLogicTileId));
      useGameStore.getState().setActiveMapData({ ...activeMapData, grid: filled });
      useEditorStore.getState().markMapDirty();
      showToast(`Filled Logic layer with tag #${activeLogicTileId}`);
    } else {
      const tileLayers = [...(activeMapData.tileLayers || [])];
      if (!tileLayers[activeLayerIdx]) return;
      const filled = Array(gridH).fill(0).map(() => Array(gridW).fill(activeBrushTileId));
      tileLayers[activeLayerIdx] = { ...tileLayers[activeLayerIdx], grid: filled };
      useGameStore.getState().setActiveMapData({ ...activeMapData, tileLayers });
      useEditorStore.getState().markMapDirty();
      showToast(`Filled Layer ${activeLayerIdx} with GID ${activeBrushTileId}`);
    }
  };

  const handleClearTile = () => {
    if (!activeMapData) return;
    if (activeLayerIdx === -1) {
      const newGrid = activeMapData.grid.map((r: number[], ri: number) =>
        r.map((c: number, ci: number) => (ri === tileR && ci === tileC ? 0 : c))
      );
      useGameStore.getState().setActiveMapData({ ...activeMapData, grid: newGrid });
      useEditorStore.getState().markMapDirty();
      showToast(`Cleared logic tile at [${tileC}, ${tileR}]`);
    } else {
      const tileLayers = [...(activeMapData.tileLayers || [])];
      if (!tileLayers[activeLayerIdx]) return;
      const targetGrid = tileLayers[activeLayerIdx].grid.map((r: number[], ri: number) =>
        r.map((c: number, ci: number) => (ri === tileR && ci === tileC ? 0 : c))
      );
      tileLayers[activeLayerIdx] = { ...tileLayers[activeLayerIdx], grid: targetGrid };
      useGameStore.getState().setActiveMapData({ ...activeMapData, tileLayers });
      useEditorStore.getState().markMapDirty();
      showToast(`Cleared layer tile at [${tileC}, ${tileR}]`);
    }
  };

  return (
    <div
      ref={menuRef}
      style={{ left: clampedX, top: clampedY }}
      className="fixed z-[250] min-w-[220px] rounded-xl border border-amber-500/40 bg-[#050b14]/95 p-1.5 font-mono text-xs text-slate-200 shadow-2xl backdrop-blur-xl pointer-events-auto select-none"
    >
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-amber-500/20 px-2.5 py-1.5 text-[10px] text-amber-300">
        <span className="font-bold uppercase tracking-wider">Tile Actions</span>
        <span className="rounded bg-black/60 px-1.5 py-0.5 text-slate-400 border border-amber-500/20">
          [{tileC}, {tileR}]
        </span>
      </div>

      <div className="py-1 space-y-0.5">
        {/* Sample Tile */}
        <button
          type="button"
          onClick={() => handleAction(handleSampleTile)}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-slate-300 hover:bg-amber-500/20 hover:text-white transition-colors cursor-pointer"
        >
          <Pipette className="h-3.5 w-3.5 text-amber-400" />
          <span>Sample Tile (Eyedropper)</span>
        </button>

        {/* Warp Gate Placement Menu */}
        {!isSelectingGateType ? (
          <button
            type="button"
            onClick={() => setIsSelectingGateType(true)}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-slate-300 hover:bg-purple-950/40 hover:text-white transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <DoorOpen className="h-3.5 w-3.5 text-purple-400" />
              <span>Add Gate...</span>
            </div>
            <span className="text-[9px] text-purple-300/70 font-semibold uppercase tracking-wider">Choose Type ▸</span>
          </button>
        ) : (
          <div className="rounded-lg border border-purple-500/30 bg-purple-950/20 p-1.5 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-purple-300 font-bold px-1 border-b border-purple-500/20 pb-0.5">
              <span>Select Gate Type</span>
              <button
                type="button"
                onClick={() => setIsSelectingGateType(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 gap-0.5 max-h-40 overflow-y-auto pr-1">
              {[
                { name: 'Standard Warp Gate', category: 'CUSTOM', tileBrush: 3, targetMapId: activeMapData?.id || 'DEMO_SANDBOX' },
                { name: '🧭 Atlas North Gate', category: 'ATLAS_NORTH', tileBrush: 14, targetMapId: '' },
                { name: '🧭 Atlas East Gate', category: 'ATLAS_EAST', tileBrush: 15, targetMapId: '' },
                { name: '🧭 Atlas South Gate', category: 'ATLAS_SOUTH', tileBrush: 16, targetMapId: '' },
                { name: '🧭 Atlas West Gate', category: 'ATLAS_WEST', tileBrush: 17, targetMapId: '' },
                { name: '🏰 Dungeon Gate', category: 'DUNGEON', tileBrush: 18, targetMapId: 'DEMO_SANDBOX' },
                { name: '⚔️ Raid Entrance Gate', category: 'RAID', tileBrush: 19, targetMapId: 'DEMO_SANDBOX' },
                { name: '🎉 Event Gate', category: 'EVENT', tileBrush: 20, targetMapId: 'DEMO_SANDBOX' },
                { name: '⛏️ Mine Entrance Gate', category: 'MINE', tileBrush: 21, targetMapId: 'DEMO_SANDBOX' },
                { name: '🌲 Deep Forest Gate', category: 'DEEP_FOREST', tileBrush: 22, targetMapId: 'DEMO_SANDBOX' },
                { name: '🌀 Realm Portal Gate', category: 'PORTAL', tileBrush: 23, targetMapId: 'DEMO_SANDBOX' },
              ].map((g) => (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => handleAction(() => handlePlaceSpecificGate(g))}
                  className="w-full text-left px-2 py-1 rounded text-[10px] text-purple-200 hover:bg-purple-600/30 hover:text-white transition flex items-center justify-between"
                >
                  <span className="truncate">{g.name}</span>
                  <span className="text-[8px] text-purple-400/60 font-mono">#{g.tileBrush}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Set Default Player Spawn */}
        <button
          type="button"
          onClick={() => handleAction(handleSetDefaultMapSpawn)}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-slate-300 hover:bg-amber-500/20 hover:text-white transition-colors cursor-pointer"
        >
          <MapPin className="h-3.5 w-3.5 text-amber-400" />
          <span>Set Default Player Spawn Here</span>
        </button>

        {/* Teleport / Player Spawn */}
        <button
          type="button"
          onClick={() => handleAction(handleSetPlayerSpawn)}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-slate-300 hover:bg-emerald-950/40 hover:text-emerald-200 transition-colors cursor-pointer"
        >
          <UserRound className="h-3.5 w-3.5 text-emerald-400" />
          <span>Warp Avatar Here</span>
        </button>

        <div className="my-1 h-px bg-amber-500/20" />

        {/* Fill Layer */}
        <button
          type="button"
          onClick={() => handleAction(handleFillLayerWithBrush)}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-slate-300 hover:bg-amber-500/20 hover:text-white transition-colors cursor-pointer"
        >
          <PaintBucket className="h-3.5 w-3.5 text-sky-400" />
          <span>Fill Entire Layer</span>
        </button>

        {/* Clear Tile */}
        <button
          type="button"
          onClick={() => handleAction(handleClearTile)}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-rose-300 hover:bg-rose-950/50 hover:text-rose-100 transition-colors cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5 text-rose-400" />
          <span>Erase Tile (Zero)</span>
        </button>
      </div>
    </div>
  );
};
