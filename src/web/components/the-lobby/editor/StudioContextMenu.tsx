'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Copy,
  Scissors,
  ClipboardPaste,
  Pin,
  Pipette,
  PaintBucket,
  Trash2,
  Zap,
  DoorOpen,
  MapPin,
  UserRound,
  Package,
  Sparkles,
  MessageSquare,
  Scan,
  XCircle,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  CopyPlus,
  ChevronRight,
  ChevronDown,
  Settings,
} from 'lucide-react';

import { useEditorStore, type PanelId } from './editor-store';
import { useGameStore } from '../store';
import { soundSynth } from '@/engine/sound-synth';
import { upsertWarpGate, removeWarpGateAt, normalizeGates } from '@/shared/game/logicComponents';

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
  const activeLayerIdx = useEditorStore((s) => s.activeLayerIdx);
  const activeBrushTileId = useEditorStore((s) => s.activeBrushTileId);
  const activeLogicTileId = useEditorStore((s) => s.activeLogicTileId);
  const selectedCells = useEditorStore((s) => s.selectedCells);
  const tileClipboard = useEditorStore((s) => s.tileClipboard);
  const activeMapData = useGameStore((s) => s.activeMapData);
  const showToast = useGameStore((s) => s.showToast);

  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isSelectingGateType, setIsSelectingGateType] = useState(false);

  const selectedCount = useEditorStore.getState().getSelectedCount();
  const hasMultiSelection = selectedCount > 1;
  const hasSelection = selectedCount > 0;
  const hasClipboard = !!tileClipboard;

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
  const menuWidth = 260;
  const menuHeight = 420;
  const clampedX = typeof window !== 'undefined' ? Math.min(x, window.innerWidth - menuWidth - 16) : x;
  const clampedY = typeof window !== 'undefined' ? Math.min(y, window.innerHeight - menuHeight - 16) : y;

  const handleAction = (cb: () => void) => {
    soundSynth?.playUiClick?.();
    cb();
    onClose();
  };

  // --- Clipboard Actions ---
  const handleCopy = () => {
    if (!activeMapData) return;
    const store = useEditorStore.getState();
    const res = store.copySelection(activeMapData, activeLayerIdx);
    if (res.ok) {
      showToast(`Copied ${res.width}x${res.height} selection to clipboard`);
    } else {
      showToast(res.error || 'Failed to copy selection');
    }
  };

  const handleCut = () => {
    if (!activeMapData) return;
    const store = useEditorStore.getState();
    const engine = typeof window !== 'undefined' ? (window as any).__babylonEngine : null;
    const res = store.cutSelection(activeMapData, engine, activeLayerIdx);
    if (res.ok) {
      showToast(`Cut ${res.width}x${res.height} selection (${res.count} tiles)`);
    } else {
      showToast(res.error || 'Failed to cut selection');
    }
  };

  const handlePaste = () => {
    if (!activeMapData) return;
    const engine = typeof window !== 'undefined' ? (window as any).__babylonEngine : null;
    const res = useEditorStore.getState().pasteClipboard(activeMapData, engine, tileR, tileC);
    if (res.ok) {
      showToast(`Pasted ${res.count} tiles`);
    } else {
      showToast(res.error || 'Clipboard is empty');
    }
  };

  const handlePasteInPlace = () => {
    if (!activeMapData || !tileClipboard) {
      showToast('Clipboard is empty');
      return;
    }
    const engine = typeof window !== 'undefined' ? (window as any).__babylonEngine : null;
    const res = useEditorStore.getState().pasteClipboard(
      activeMapData,
      engine,
      tileClipboard.sourceOrigin.r,
      tileClipboard.sourceOrigin.c
    );
    if (res.ok) {
      showToast(`Pasted in place at [${tileClipboard.sourceOrigin.c}, ${tileClipboard.sourceOrigin.r}]`);
    } else {
      showToast(res.error || 'Failed to paste in place');
    }
  };

  // --- Tile & Layer Operations ---
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

  const handleFillLayerWithBrush = () => {
    if (!activeMapData) return;
    const store = useEditorStore.getState();
    const engine = typeof window !== 'undefined' ? (window as any).__babylonEngine : null;
    const selectedCount = store.getSelectedCount();

    if (selectedCount > 0) {
      const res = store.fillSelection(activeMapData, engine, activeLayerIdx);
      if (res.error) {
        showToast(res.error);
      } else if (res.count > 0) {
        const layerName = res.layerIdx === -1 ? 'Logic (−1)' : `Layer ${res.layerIdx}`;
        showToast(`Filled ${res.count} selected tiles on ${layerName}`);
      }
    } else {
      const gridH = activeMapData.grid?.length || (activeMapData.tileLayers?.[0]?.grid?.length ?? 24);
      const gridW = activeMapData.grid?.[0]?.length || (activeMapData.tileLayers?.[0]?.grid?.[0]?.length ?? 24);
      const prevStart = store.selectionStart;
      const prevEnd = store.selectionEnd;
      store.setSelectionBox(0, gridH - 1, 0, gridW - 1);
      const res = store.fillSelection(activeMapData, engine, activeLayerIdx);
      store.setSelectionStart(prevStart);
      store.setSelectionEnd(prevEnd);
      if (res.count > 0) {
        const layerName = res.layerIdx === -1 ? 'Logic (−1)' : `Layer ${res.layerIdx}`;
        showToast(`Filled entire ${layerName} with ${res.count} tiles`);
      }
    }
  };

  const handleRotateSelection = () => {
    if (!activeMapData) return;
    const store = useEditorStore.getState();
    const engine = typeof window !== 'undefined' ? (window as any).__babylonEngine : null;
    const res = store.rotateSelection(activeMapData, engine, 90, activeLayerIdx);
    if (res.ok) {
      showToast(`Rotated selection 90° CW (${res.count} tiles)`);
    } else {
      showToast(res.error || 'Rotate failed');
    }
  };

  const handleFlipSelectionH = () => {
    if (!activeMapData) return;
    const store = useEditorStore.getState();
    const engine = typeof window !== 'undefined' ? (window as any).__babylonEngine : null;
    const res = store.flipSelection(activeMapData, engine, 'h', activeLayerIdx);
    if (res.ok) {
      showToast(`Flipped selection horizontally (${res.count} tiles)`);
    } else {
      showToast(res.error || 'Flip failed');
    }
  };

  const handleFlipSelectionV = () => {
    if (!activeMapData) return;
    const store = useEditorStore.getState();
    const engine = typeof window !== 'undefined' ? (window as any).__babylonEngine : null;
    const res = store.flipSelection(activeMapData, engine, 'v', activeLayerIdx);
    if (res.ok) {
      showToast(`Flipped selection vertically (${res.count} tiles)`);
    } else {
      showToast(res.error || 'Flip failed');
    }
  };

  const handleDuplicateSelection = () => {
    if (!activeMapData) return;
    const store = useEditorStore.getState();
    const engine = typeof window !== 'undefined' ? (window as any).__babylonEngine : null;
    const res = store.duplicateSelection(activeMapData, engine, 1, 1, activeLayerIdx);
    if (res.ok) {
      showToast(`Duplicated selection (+1, +1)`);
    } else {
      showToast(res.error || 'Duplicate failed');
    }
  };


  const handleClearTile = () => {
    if (!activeMapData) return;
    const store = useEditorStore.getState();
    if (!store.selectionStart || !store.selectionEnd) {
      store.setHoveredTile({ r: tileR, c: tileC });
    }
    const engine = typeof window !== 'undefined' ? (window as any).__babylonEngine : null;
    const result = store.deleteSelectionTiles(activeMapData, engine, activeLayerIdx);
    if (result.error) {
      showToast(result.error);
    } else if (result.count > 0) {
      const layerName = result.layerIdx === -1 ? 'Logic (−1)' : `Layer ${result.layerIdx}`;
      showToast(`Cleared ${result.count} tile${result.count === 1 ? '' : 's'} on ${layerName}`);
    } else {
      showToast('Tile already empty.');
    }
  };

  // --- Quick Create Actions ---
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

  const handlePlaceLogicTag = (tagId: number, label: string, panelToOpen?: PanelId) => {
    if (!activeMapData) return;
    const nextGrid = (activeMapData.grid || []).map((row: number[], ri: number) =>
      row.map((cell: number, ci: number) => (ri === tileR && ci === tileC ? tagId : cell))
    );
    const next = { ...activeMapData, grid: nextGrid };
    useGameStore.getState().setActiveMapData(next);
    useEditorStore.getState().markMapDirty();
    if (panelToOpen) {
      useEditorStore.getState().openPanel(panelToOpen);
    }
    showToast(`Placed ${label} (#${tagId}) at [${tileC}, ${tileR}]`);
  };

  // --- Selection Actions ---
  const handleSelectAll = () => {
    if (!activeMapData) return;
    const h = activeMapData.grid?.length || (activeMapData.tileLayers?.[0]?.grid?.length ?? 24);
    const w = activeMapData.grid?.[0]?.length || (activeMapData.tileLayers?.[0]?.grid?.[0]?.length ?? 24);
    useEditorStore.getState().setSelectionBox(0, h - 1, 0, w - 1);
    if (typeof window !== 'undefined') {
      (window as any).__babylonEngine?.setSelectionPreview?.(0, 0, h - 1, w - 1);
    }
    showToast(`Selected entire map (${w}x${h})`);
  };

  const handleClearSelection = () => {
    useEditorStore.getState().clearSelectedCells();
    if (typeof window !== 'undefined') {
      (window as any).__babylonEngine?.clearSelectionPreview?.();
    }
    showToast('Selection cleared');
  };

  const handleDeleteWarpGate = () => {
    if (!activeMapData) return;
    const nextGates = removeWarpGateAt(activeMapData.gates, tileC, tileR);
    const nextGrid = (activeMapData.grid || []).map((row: number[], ri: number) =>
      row.map((cell: number, ci: number) => (ri === tileR && ci === tileC ? 0 : cell))
    );
    const next = { ...activeMapData, gates: nextGates, grid: nextGrid };
    useGameStore.getState().setActiveMapData(next);
    useEditorStore.getState().markMapDirty();
    showToast(`Removed Warp Gate at [${tileC}, ${tileR}]`);
  };

  // Smart Context Actions Helpers
  const npcsOnTile =
    activeMapData?.npcs?.filter(
      (n: any) =>
        (n.position ? n.position.x === tileC && n.position.y === tileR : n.x === tileC && n.y === tileR)
    ) || [];
  const logicTag = activeMapData?.grid?.[tileR]?.[tileC] ?? 0;
  
  const currentGates = activeMapData ? normalizeGates(activeMapData.gates) : [];
  const gateOnTile = currentGates.find(
    (g: any) => g.position?.x === tileC && g.position?.y === tileR
  );

  const isWarpTag = logicTag === 3 || (logicTag >= 14 && logicTag <= 23);
  const logicTiles = useGameStore((s) => s.logicTiles);
  const currentTagObj = logicTiles[logicTag];
  const tagLabel = currentTagObj?.name || `Tag #${logicTag}`;
  const hasSmartActions = npcsOnTile.length > 0 || gateOnTile || isWarpTag || (logicTag > 0);

  return (
    <div
      className="fixed inset-0 z-[240] pointer-events-auto"
      onPointerDown={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        ref={menuRef}
        style={{ left: clampedX, top: clampedY }}
        onPointerDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
        className="fixed z-[250] min-w-[240px] max-w-[280px] rounded-xl border border-amber-500/40 bg-[#050b14]/95 p-1.5 font-mono text-xs text-slate-200 shadow-2xl backdrop-blur-xl pointer-events-auto select-none max-h-[85vh] overflow-y-auto custom-scrollbar"
      >
        {/* Header Info */}
      <div className="flex items-center justify-between border-b border-amber-500/20 px-2.5 py-1.5 text-[10px] text-amber-300">
        <span className="font-bold uppercase tracking-wider">
          Tile [{tileC}, {tileR}]
        </span>
        <span className="rounded bg-black/60 px-1.5 py-0.5 text-slate-400 border border-amber-500/20 text-[9px]">
          {activeLayerIdx === -1 ? 'Logic (−1)' : `Layer ${activeLayerIdx}`}
        </span>
      </div>

      {/* --- Context-Sensitive Smart Actions --- */}
      {hasSmartActions && (
        <div className="p-1.5 space-y-1.5 border-b border-amber-500/10 bg-amber-950/5">
          <div className="px-1 py-0.5 text-[9px] font-bold text-amber-400/80 uppercase tracking-wider">
            Smart Context Actions
          </div>
          
          {/* NPCs */}
          {npcsOnTile.map((npc: any) => (
            <div key={npc.id} className="rounded-lg bg-emerald-950/30 border border-emerald-500/20 p-1.5 space-y-1">
              <div className="px-1 text-[10px] font-bold text-emerald-300 flex items-center gap-1.5 truncate">
                <UserRound className="h-3 w-3 shrink-0" />
                <span className="truncate">{npc.name || 'Unnamed NPC'}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => handleAction(() => {
                    useEditorStore.getState().openPanel('npc');
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('studio_select_npc', {
                        detail: { npcId: npc.id }
                      }));
                    }, 50);
                  })}
                  className="px-1.5 py-1 text-center bg-slate-900 border border-slate-800 hover:border-emerald-500/30 hover:bg-emerald-950/20 text-slate-300 hover:text-white rounded text-[9px] cursor-pointer"
                >
                  Configure
                </button>
                <button
                  type="button"
                  onClick={() => handleAction(() => {
                    useEditorStore.getState().openPanel('dialogue');
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('studio_focus_dialogue', {
                        detail: { npcId: npc.id, name: npc.name }
                      }));
                    }, 50);
                  })}
                  className="px-1.5 py-1 text-center bg-slate-900 border border-slate-800 hover:border-emerald-500/30 hover:bg-emerald-950/20 text-slate-300 hover:text-white rounded text-[9px] cursor-pointer"
                >
                  Dialogue
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleAction(() => {
                  window.dispatchEvent(new CustomEvent('studio_delete_npc_context', {
                    detail: { npcId: npc.id, name: npc.name }
                  }));
                })}
                className="w-full py-0.5 text-center bg-rose-950/20 border border-rose-900/30 hover:bg-rose-950/50 text-rose-300 hover:text-rose-100 rounded text-[9px] cursor-pointer"
              >
                Delete NPC
              </button>
            </div>
          ))}

          {/* Warp Gates */}
          {(gateOnTile || isWarpTag) && (
            <div className="rounded-lg bg-purple-950/30 border border-purple-500/20 p-1.5 space-y-1">
              <div className="px-1 text-[10px] font-bold text-purple-300 flex items-center gap-1.5 truncate">
                <DoorOpen className="h-3 w-3 shrink-0" />
                <span className="truncate">Warp Gate {gateOnTile?.category ? `(${gateOnTile.category})` : ''}</span>
              </div>
              {gateOnTile?.targetMapId && (
                <div className="px-1 text-[8px] text-purple-400 font-mono">
                  Target: {gateOnTile.targetMapId} ({gateOnTile.spawnPoint?.x}, {gateOnTile.spawnPoint?.y})
                </div>
              )}
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => handleAction(() => {
                    useEditorStore.getState().openPanel('properties');
                    useEditorStore.getState().setClickedTile({ r: tileR, c: tileC });
                  })}
                  className="px-1.5 py-1 text-center bg-slate-900 border border-slate-800 hover:border-purple-500/30 hover:bg-purple-950/20 text-slate-300 hover:text-white rounded text-[9px] cursor-pointer"
                >
                  Configure
                </button>
                <button
                  type="button"
                  onClick={() => handleAction(handleDeleteWarpGate)}
                  className="px-1.5 py-1 text-center bg-rose-950/20 border border-rose-900/30 hover:bg-rose-950/50 text-rose-300 hover:text-rose-100 rounded text-[9px] cursor-pointer"
                >
                  Delete Gate
                </button>
              </div>
            </div>
          )}

          {/* Other Logic Components */}
          {logicTag > 0 && !isWarpTag && (
            <div className="rounded-lg bg-cyan-950/30 border border-cyan-500/20 p-1.5 space-y-1">
              <div className="px-1 text-[10px] font-bold text-cyan-300 flex items-center gap-1.5 truncate">
                <Settings className="h-3 w-3 shrink-0" />
                <span className="truncate">{tagLabel}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => handleAction(() => {
                    useEditorStore.getState().openPanel('properties');
                    useEditorStore.getState().setClickedTile({ r: tileR, c: tileC });
                  })}
                  className="px-1.5 py-1 text-center bg-slate-900 border border-slate-800 hover:border-cyan-500/30 hover:bg-cyan-950/20 text-slate-300 hover:text-white rounded text-[9px] cursor-pointer"
                >
                  Configure
                </button>
                <button
                  type="button"
                  onClick={() => handleAction(() => handlePlaceLogicTag(0, 'Clear Tag'))}
                  className="px-1.5 py-1 text-center bg-rose-950/20 border border-rose-900/30 hover:bg-rose-950/50 text-rose-300 hover:text-rose-100 rounded text-[9px] cursor-pointer"
                >
                  Clear Tag
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="py-1 space-y-0.5">
        {/* --- Clipboard Section --- */}
        <button
          type="button"
          onClick={() => handleAction(handleCopy)}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-slate-300 hover:bg-amber-500/20 hover:text-white transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Copy className="h-3.5 w-3.5 text-amber-400" />
            <span>Copy {hasMultiSelection ? `${selectedCount} Tiles` : 'Tile'}</span>
          </div>
          <span className="text-[9px] text-slate-500 font-mono">Ctrl+C</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction(handleCut)}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-slate-300 hover:bg-amber-500/20 hover:text-white transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Scissors className="h-3.5 w-3.5 text-amber-400" />
            <span>Cut {hasMultiSelection ? `${selectedCount} Tiles` : 'Tile'}</span>
          </div>
          <span className="text-[9px] text-slate-500 font-mono">Ctrl+X</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction(handlePaste)}
          disabled={!hasClipboard}
          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors ${
            hasClipboard
              ? 'text-slate-300 hover:bg-amber-500/20 hover:text-white cursor-pointer'
              : 'text-slate-600 cursor-not-allowed opacity-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <ClipboardPaste className="h-3.5 w-3.5 text-amber-400" />
            <span>{hasMultiSelection ? 'Paste at Selection' : 'Paste'}</span>
          </div>
          <span className="text-[9px] text-slate-500 font-mono">Ctrl+V</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction(handlePasteInPlace)}
          disabled={!hasClipboard}
          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors ${
            hasClipboard
              ? 'text-slate-300 hover:bg-amber-500/20 hover:text-white cursor-pointer'
              : 'text-slate-600 cursor-not-allowed opacity-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Pin className="h-3.5 w-3.5 text-amber-400" />
            <span>Paste in Place</span>
          </div>
          <span className="text-[9px] text-slate-500 font-mono">Ctrl+Shift+V</span>
        </button>

        <div className="my-1 h-px bg-amber-500/20" />

        {/* --- Tile & Layer Operations Section --- */}
        <button
          type="button"
          onClick={() => handleAction(handleSampleTile)}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-slate-300 hover:bg-amber-500/20 hover:text-white transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Pipette className="h-3.5 w-3.5 text-cyan-400" />
            <span>Eyedropper (Sample)</span>
          </div>
          <span className="text-[9px] text-slate-500 font-mono">I</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction(handleFillLayerWithBrush)}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-slate-300 hover:bg-amber-500/20 hover:text-white transition-colors cursor-pointer"
        >
          <PaintBucket className="h-3.5 w-3.5 text-sky-400" />
          <span>{hasMultiSelection ? `Fill Selection (${selectedCount})` : 'Fill Layer with Brush'}</span>
        </button>

        {hasSelection && (
          <>
            <button
              type="button"
              onClick={() => handleAction(handleRotateSelection)}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-slate-300 hover:bg-amber-500/20 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <RotateCw className="h-3.5 w-3.5 text-amber-400" />
                <span>Rotate 90° CW</span>
              </div>
              <span className="text-[9px] text-slate-500 font-mono">R</span>
            </button>

            <div className="grid grid-cols-2 gap-1 px-1 py-0.5">
              <button
                type="button"
                onClick={() => handleAction(handleFlipSelectionH)}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-950/20 border border-amber-500/20 px-2 py-1 text-slate-300 hover:bg-amber-500/20 hover:text-white transition-colors cursor-pointer text-[10px]"
              >
                <FlipHorizontal className="h-3 w-3 text-cyan-400" />
                <span>Flip H</span>
              </button>
              <button
                type="button"
                onClick={() => handleAction(handleFlipSelectionV)}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-950/20 border border-amber-500/20 px-2 py-1 text-slate-300 hover:bg-amber-500/20 hover:text-white transition-colors cursor-pointer text-[10px]"
              >
                <FlipVertical className="h-3 w-3 text-cyan-400" />
                <span>Flip V</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleAction(handleDuplicateSelection)}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-slate-300 hover:bg-amber-500/20 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <CopyPlus className="h-3.5 w-3.5 text-emerald-400" />
                <span>Duplicate Selection</span>
              </div>
              <span className="text-[9px] text-slate-500 font-mono">Ctrl+D</span>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => handleAction(handleClearTile)}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-rose-300 hover:bg-rose-950/50 hover:text-rose-100 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
            <span>Delete {hasMultiSelection ? `${selectedCount} Tiles` : 'Tile'}</span>
          </div>
          <span className="text-[9px] text-rose-400/60 font-mono">Del</span>
        </button>

        <div className="my-1 h-px bg-amber-500/20" />


        {/* --- Quick Create Section --- */}
        <div>
          <button
            type="button"
            onClick={() => setIsQuickCreateOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-amber-300 hover:bg-amber-500/20 hover:text-white transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-bold">Quick Create</span>
            </div>
            {isQuickCreateOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-amber-400" />
            )}
          </button>

          {isQuickCreateOpen && (
            <div className="mt-1 ml-2 pl-2 border-l border-amber-500/30 space-y-0.5 animate-in slide-in-from-top-1 duration-150">
              {/* Warp Gate Placement */}
              {!isSelectingGateType ? (
                <button
                  type="button"
                  onClick={() => setIsSelectingGateType(true)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-slate-300 hover:bg-purple-950/40 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <DoorOpen className="h-3 w-3 text-purple-400" />
                    <span>Warp Gate...</span>
                  </div>
                  <span className="text-[8px] text-purple-300/70 font-semibold uppercase">Pick Type ▸</span>
                </button>
              ) : (
                <div className="rounded-lg border border-purple-500/30 bg-purple-950/30 p-1.5 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-purple-300 font-bold px-1 border-b border-purple-500/20 pb-0.5">
                    <span>Select Gate Type</span>
                    <button
                      type="button"
                      onClick={() => setIsSelectingGateType(false)}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-0.5 max-h-36 overflow-y-auto pr-1">
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
                        className="w-full text-left px-1.5 py-0.5 rounded text-[9px] text-purple-200 hover:bg-purple-600/30 hover:text-white transition flex items-center justify-between"
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
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-slate-300 hover:bg-amber-500/20 hover:text-white transition-colors cursor-pointer"
              >
                <MapPin className="h-3 w-3 text-amber-400" />
                <span>Set Default Map Spawn</span>
              </button>

              {/* Teleport Author Avatar */}
              <button
                type="button"
                onClick={() => handleAction(handleSetPlayerSpawn)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-slate-300 hover:bg-emerald-950/40 hover:text-emerald-200 transition-colors cursor-pointer"
              >
                <UserRound className="h-3 w-3 text-emerald-400" />
                <span>Teleport Author Here</span>
              </button>

              {/* Loot Container */}
              <button
                type="button"
                onClick={() => handleAction(() => handlePlaceLogicTag(4, 'Loot Container', 'loot'))}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-slate-300 hover:bg-amber-950/40 hover:text-amber-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Package className="h-3 w-3 text-amber-400" />
                  <span>Loot Container</span>
                </div>
                <span className="text-[8px] text-amber-400/60 font-mono">#4</span>
              </button>

              {/* Encounter Zone */}
              <button
                type="button"
                onClick={() => handleAction(() => handlePlaceLogicTag(6, 'Encounter Zone', 'creature'))}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-slate-300 hover:bg-rose-950/40 hover:text-rose-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-rose-400" />
                  <span>Encounter Zone</span>
                </div>
                <span className="text-[8px] text-rose-400/60 font-mono">#6</span>
              </button>

              {/* NPC Trigger */}
              <button
                type="button"
                onClick={() => handleAction(() => handlePlaceLogicTag(8, 'NPC Trigger', 'npc'))}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-slate-300 hover:bg-sky-950/40 hover:text-sky-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3 w-3 text-sky-400" />
                  <span>NPC Trigger</span>
                </div>
                <span className="text-[8px] text-sky-400/60 font-mono">#8</span>
              </button>
            </div>
          )}
        </div>

        <div className="my-1 h-px bg-amber-500/20" />

        {/* --- Selection Section --- */}
        <button
          type="button"
          onClick={() => handleAction(handleSelectAll)}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-slate-300 hover:bg-amber-500/20 hover:text-white transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Scan className="h-3.5 w-3.5 text-amber-400" />
            <span>Select All</span>
          </div>
          <span className="text-[9px] text-slate-500 font-mono">Ctrl+A</span>
        </button>

        {hasSelection && (
          <button
            type="button"
            onClick={() => handleAction(handleClearSelection)}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <XCircle className="h-3.5 w-3.5 text-slate-400" />
              <span>Clear Selection</span>
            </div>
            <span className="text-[9px] text-slate-500 font-mono">Escape</span>
          </button>
        )}
      </div>
    </div>
  </div>
  );
};
