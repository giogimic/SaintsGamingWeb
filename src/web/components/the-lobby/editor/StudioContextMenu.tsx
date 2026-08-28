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
  Shield,
  Tag,
  Coins,
  ScrollText,
  PawPrint,
  Grid3X3,
  Trees,
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
  const openPanel = useEditorStore((s) => s.openPanel);
  const activeMapData = useGameStore((s) => s.activeMapData);
  const showToast = useGameStore((s) => s.showToast);

  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isSelectingGateType, setIsSelectingGateType] = useState(false);
  
  const currentGates = activeMapData ? normalizeGates(activeMapData.gates) : [];
  const gateOnTile = currentGates.find(
    (g) => g.position.x === tileC && g.position.y === tileR
  );

  const handleSaveGateEdits = () => {
    if (!activeMapData || !gateOnTile) return;
    
    const updatedGate = {
      ...gateOnTile,
      targetMapId: editGateTarget.trim().toUpperCase() || 'DEMO_SANDBOX',
      spawnPoint: { x: editGateSpawnX, y: editGateSpawnY },
      category: editGateCategory,
    };
    
    const nextGates = upsertWarpGate(activeMapData.gates, updatedGate);
    useGameStore.setState({ activeMapData: { ...activeMapData, gates: nextGates } });
    useEditorStore.getState().markMapDirty();
    setIsEditingGate(false);
    showToast(`Gate updated → ${updatedGate.targetMapId}`);
  };

  const [isEditingGate, setIsEditingGate] = useState(false);
  const [editGateTarget, setEditGateTarget] = useState(gateOnTile?.targetMapId || '');
  const [editGateSpawnX, setEditGateSpawnX] = useState(gateOnTile?.spawnPoint?.x ?? 14);
  const [editGateSpawnY, setEditGateSpawnY] = useState(gateOnTile?.spawnPoint?.y ?? 15);
  const [editGateCategory, setEditGateCategory] = useState(gateOnTile?.category || 'CUSTOM');

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
  const menuWidth = 270;
  const menuHeight = 440;
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
      showToast(`Copied ${res.width}×${res.height} selection to clipboard`);
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
      showToast(`Cut ${res.width}×${res.height} selection (${res.count} tiles)`);
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

  const handleSampleTile = () => {
    if (!activeMapData) return;
    const store = useEditorStore.getState();
    if (store.activeLayerIdx === -1) {
      const gid = activeMapData.grid?.[tileR]?.[tileC] ?? 0;
      store.setActiveLogicTileId(gid);
      showToast(`Sampled Logic Tag #${gid}`);
    } else {
      const layer = activeMapData.tileLayers?.[store.activeLayerIdx];
      const gid = layer?.grid?.[tileR]?.[tileC] ?? (activeMapData.grid?.[tileR]?.[tileC] ?? 17);
      store.setActiveBrushTileId(gid);
      showToast(`Sampled Tile GID ${gid} on Layer ${store.activeLayerIdx}`);
    }
  };

  const handleFillLayerWithBrush = () => {
    if (!activeMapData) return;
    const store = useEditorStore.getState();
    const engine = typeof window !== 'undefined' ? (window as any).__babylonEngine : null;
    const gid = store.activeLayerIdx === -1 ? store.activeLogicTileId : store.activeBrushTileId;
    const res = store.fillSelection(activeMapData, engine, store.activeLayerIdx, gid);
    if (res.error) {
      showToast(res.error);
    } else {
      showToast(`Filled ${res.count} tile${res.count === 1 ? '' : 's'} with GID ${gid}`);
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
      openPanel(panelToOpen);
    }
    showToast(`Placed ${label} (#${tagId}) at [${tileC}, ${tileR}]`);
  };

  const handleSelectAll = () => {
    if (!activeMapData) return;
    const h = activeMapData.grid?.length || (activeMapData.tileLayers?.[0]?.grid?.length ?? 24);
    const w = activeMapData.grid?.[0]?.length || (activeMapData.tileLayers?.[0]?.grid?.[0]?.length ?? 24);
    useEditorStore.getState().setSelectionBox(0, h - 1, 0, w - 1);
    if (typeof window !== 'undefined') {
      (window as any).__babylonEngine?.setSelectionPreview?.(0, 0, h - 1, w - 1);
    }
    showToast(`Selected entire map (${w}×${h})`);
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



  const isWarpTag = logicTag === 3 || (logicTag >= 14 && logicTag <= 23);
  const isEncounterTag = logicTag === 6 || logicTag === 10;
  const isLootTag = logicTag === 4 || logicTag === 11;
  const logicTiles = useGameStore((s) => s.logicTiles);
  const currentTagObj = logicTiles[logicTag];
  const tagLabel = currentTagObj?.name || `Tag #${logicTag}`;
  const hasSmartActions = npcsOnTile.length > 0 || gateOnTile || isWarpTag || logicTag > 0;

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
        className="fixed z-[250] min-w-[250px] max-w-[290px] rounded-xl border border-border/80 bg-card/95 p-1.5 font-mono text-xs text-foreground shadow-2xl backdrop-blur-2xl pointer-events-auto select-none max-h-[85vh] overflow-y-auto custom-scrollbar"
      >
        {/* Header Info */}
        <div className="flex items-center justify-between border-b border-border/40 px-2.5 py-1.5 text-[10px] text-primary font-bold">
          <span className="uppercase tracking-wider">
            Tile [{tileC}, {tileR}]
          </span>
          <span className="rounded bg-background/60 px-1.5 py-0.5 text-muted-foreground border border-border/40 text-[9px]">
            {activeLayerIdx === -1 ? 'Logic (−1)' : `Layer ${activeLayerIdx}`}
          </span>
        </div>

        {/* --- Context-Sensitive Smart Actions --- */}
        {hasSmartActions && (
          <div className="p-1.5 space-y-1.5 border-b border-border/40 bg-background/40">
            <div className="px-1 py-0.5 text-[9px] font-bold text-primary uppercase tracking-wider">
              Context Actions
            </div>

            {/* NPCs */}
            {npcsOnTile.map((npc: any) => (
              <div key={npc.id} className="rounded-lg bg-emerald-950/30 border border-emerald-500/30 p-1.5 space-y-1">
                <div className="px-1 text-[10px] font-bold text-emerald-300 flex items-center gap-1.5 truncate">
                  <UserRound className="h-3 w-3 shrink-0" />
                  <span className="truncate">{npc.name || 'Unnamed NPC'}</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      handleAction(() => {
                        openPanel('npc');
                        setTimeout(() => {
                          window.dispatchEvent(
                            new CustomEvent('studio_select_npc', {
                              detail: { npcId: npc.id },
                            })
                          );
                        }, 50);
                      })
                    }
                    className="px-1.5 py-1 text-center bg-background/70 border border-border/60 hover:border-emerald-500/50 text-foreground rounded text-[9px] cursor-pointer"
                  >
                    NPC Studio
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAction(() => {
                        openPanel('dialogue');
                        setTimeout(() => {
                          window.dispatchEvent(
                            new CustomEvent('studio_focus_dialogue', {
                              detail: { npcId: npc.id, name: npc.name },
                            })
                          );
                        }, 50);
                      })
                    }
                    className="px-1.5 py-1 text-center bg-background/70 border border-border/60 hover:border-emerald-500/50 text-foreground rounded text-[9px] cursor-pointer"
                  >
                    Dialogue
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      handleAction(() => {
                        openPanel('quest');
                      })
                    }
                    className="px-1.5 py-0.5 text-center bg-background/50 border border-border/40 text-muted-foreground hover:text-foreground rounded text-[8px] cursor-pointer"
                  >
                    Attach Quest
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAction(() => {
                        openPanel('shop');
                      })
                    }
                    className="px-1.5 py-0.5 text-center bg-background/50 border border-border/40 text-muted-foreground hover:text-foreground rounded text-[8px] cursor-pointer"
                  >
                    Shop / Trade
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleAction(() => {
                      window.dispatchEvent(
                        new CustomEvent('studio_delete_npc_context', {
                          detail: { npcId: npc.id, name: npc.name },
                        })
                      );
                    })
                  }
                  className="w-full py-0.5 text-center bg-destructive/20 border border-destructive/30 hover:bg-destructive/30 text-destructive-foreground rounded text-[9px] cursor-pointer"
                >
                  Delete NPC
                </button>
              </div>
            ))}

            {/* Warp Gates */}
            {(gateOnTile || isWarpTag) && (
              <div className="rounded-lg bg-purple-950/30 border border-purple-500/30 p-1.5 space-y-1">
                <div className="px-1 text-[10px] font-bold text-purple-300 flex items-center gap-1.5 truncate">
                  <DoorOpen className="h-3 w-3 shrink-0" />
                  <span className="truncate">Warp Gate {gateOnTile?.category ? `(${gateOnTile.category})` : ''}</span>
                </div>
                
                {isEditingGate ? (
                  <div className="space-y-1 mt-1 p-1 bg-black/40 rounded border border-purple-500/20">
                    <label className="block text-[8px] text-purple-300/70 uppercase">Target Map ID</label>
                    <input
                      type="text"
                      value={editGateTarget}
                      onChange={(e) => setEditGateTarget(e.target.value)}
                      className="w-full bg-black/60 border border-purple-500/30 rounded px-1.5 py-1 text-purple-100 text-[10px] uppercase"
                      placeholder="DEMO_SANDBOX"
                    />
                    
                    <label className="block text-[8px] text-purple-300/70 uppercase mt-1">Category</label>
                    <select
                      value={editGateCategory}
                      onChange={(e) => setEditGateCategory(e.target.value)}
                      className="w-full bg-black/60 border border-purple-500/30 rounded px-1.5 py-1 text-purple-100 text-[10px]"
                    >
                      <option value="CUSTOM">Custom Warp (Classic)</option>
                      <option value="ATLAS_NORTH">🧭 Atlas North Gate</option>
                      <option value="ATLAS_EAST">🧭 Atlas East Gate</option>
                      <option value="ATLAS_SOUTH">🧭 Atlas South Gate</option>
                      <option value="ATLAS_WEST">🧭 Atlas West Gate</option>
                      <option value="DUNGEON">🏰 Dungeon Gate</option>
                      <option value="RAID">⚔️ Raid Gate</option>
                      <option value="EVENT">🎉 Event Gate</option>
                      <option value="MINE">⛏️ Mine Entrance Gate</option>
                      <option value="DEEP_FOREST">🌲 Deep Forest Gate</option>
                      <option value="PORTAL">🌀 Mystic Portal</option>
                    </select>

                    <label className="block text-[8px] text-purple-300/70 uppercase mt-1">Spawn Coords</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={editGateSpawnX}
                        onChange={(e) => setEditGateSpawnX(Number(e.target.value))}
                        className="w-full bg-black/60 border border-purple-500/30 rounded px-1.5 py-1 text-purple-100 text-[10px]"
                        placeholder="X"
                      />
                      <input
                        type="number"
                        value={editGateSpawnY}
                        onChange={(e) => setEditGateSpawnY(Number(e.target.value))}
                        className="w-full bg-black/60 border border-purple-500/30 rounded px-1.5 py-1 text-purple-100 text-[10px]"
                        placeholder="Y"
                      />
                    </div>
                    
                    <div className="flex gap-1 mt-1 pt-1 border-t border-purple-500/20">
                      <button
                        onClick={handleSaveGateEdits}
                        className="flex-1 py-1 text-center bg-purple-500/20 hover:bg-purple-500/40 text-purple-200 border border-purple-500/40 rounded text-[9px] font-bold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditingGate(false)}
                        className="px-2 py-1 text-center bg-background/50 hover:bg-background/80 text-foreground border border-border/60 rounded text-[9px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {gateOnTile?.targetMapId && (
                      <div className="px-1 text-[8px] text-purple-400 font-mono">
                        Target: {gateOnTile.targetMapId} ({gateOnTile.spawnPoint?.x}, {gateOnTile.spawnPoint?.y})
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingGate(true)}
                        className="px-1.5 py-1 text-center bg-background/70 border border-border/60 hover:border-purple-500/50 text-foreground rounded text-[9px] cursor-pointer"
                      >
                        Configure
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(handleDeleteWarpGate)}
                        className="px-1.5 py-1 text-center bg-destructive/20 border border-destructive/30 hover:bg-destructive/30 text-destructive-foreground rounded text-[9px] cursor-pointer"
                      >
                        Delete Gate
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Encounter / Creature Hooks */}
            {isEncounterTag && (
              <div className="rounded-lg bg-rose-950/30 border border-rose-500/30 p-1.5 space-y-1">
                <div className="px-1 text-[10px] font-bold text-rose-300 flex items-center gap-1.5 truncate">
                  <PawPrint className="h-3 w-3 shrink-0" />
                  <span>Encounter / Spawner Zone</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => handleAction(() => openPanel('creature'))}
                    className="px-1.5 py-1 text-center bg-background/70 border border-border/60 hover:border-rose-500/50 text-foreground rounded text-[9px] cursor-pointer"
                  >
                    Creature Studio
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(() => openPanel('loot'))}
                    className="px-1.5 py-1 text-center bg-background/70 border border-border/60 hover:border-rose-500/50 text-foreground rounded text-[9px] cursor-pointer"
                  >
                    Loot Tables
                  </button>
                </div>
              </div>
            )}

            {/* Other Logic Components */}
            {logicTag > 0 && !isWarpTag && !isEncounterTag && (
              <div className="rounded-lg bg-cyan-950/30 border border-cyan-500/30 p-1.5 space-y-1">
                <div className="px-1 text-[10px] font-bold text-cyan-300 flex items-center gap-1.5 truncate">
                  <Tag className="h-3 w-3 shrink-0" />
                  <span className="truncate">{tagLabel}</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      handleAction(() => {
                        openPanel('properties');
                        useEditorStore.getState().setClickedTile({ r: tileR, c: tileC });
                      })
                    }
                    className="px-1.5 py-1 text-center bg-background/70 border border-border/60 hover:border-cyan-500/50 text-foreground rounded text-[9px] cursor-pointer"
                  >
                    Configure
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(() => handlePlaceLogicTag(0, 'Clear Tag'))}
                    className="px-1.5 py-1 text-center bg-destructive/20 border border-destructive/30 hover:bg-destructive/30 text-destructive-foreground rounded text-[9px] cursor-pointer"
                  >
                    Clear Tag
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="py-1 space-y-0.5">
          {/* Quick Tool Windows */}
          <button
            type="button"
            onClick={() => handleAction(() => openPanel('tileset'))}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-foreground hover:bg-primary/20 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Grid3X3 className="h-3.5 w-3.5 text-primary" />
              <span>Open Tile Selector</span>
            </div>
            <span className="text-[9px] text-muted-foreground">Dock</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction(() => openPanel('logic'))}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-foreground hover:bg-primary/20 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-cyan-400" />
              <span>Open Logic Painter</span>
            </div>
            <span className="text-[9px] text-muted-foreground">Dock</span>
          </button>

          <div className="my-1 h-px bg-border/40" />

          {/* --- Clipboard Section --- */}
          <button
            type="button"
            onClick={() => handleAction(handleCopy)}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-foreground hover:bg-primary/20 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Copy className="h-3.5 w-3.5 text-primary" />
              <span>Copy {hasMultiSelection ? `${selectedCount} Tiles` : 'Tile'}</span>
            </div>
            <span className="text-[9px] text-muted-foreground font-mono">Ctrl+C</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction(handleCut)}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-foreground hover:bg-primary/20 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Scissors className="h-3.5 w-3.5 text-primary" />
              <span>Cut {hasMultiSelection ? `${selectedCount} Tiles` : 'Tile'}</span>
            </div>
            <span className="text-[9px] text-muted-foreground font-mono">Ctrl+X</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction(handlePaste)}
            disabled={!hasClipboard}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors ${
              hasClipboard
                ? 'text-foreground hover:bg-primary/20 cursor-pointer'
                : 'text-muted-foreground cursor-not-allowed opacity-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <ClipboardPaste className="h-3.5 w-3.5 text-primary" />
              <span>{hasMultiSelection ? 'Paste at Selection' : 'Paste'}</span>
            </div>
            <span className="text-[9px] text-muted-foreground font-mono">Ctrl+V</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction(handlePasteInPlace)}
            disabled={!hasClipboard}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors ${
              hasClipboard
                ? 'text-foreground hover:bg-primary/20 cursor-pointer'
                : 'text-muted-foreground cursor-not-allowed opacity-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Pin className="h-3.5 w-3.5 text-primary" />
              <span>Paste in Place</span>
            </div>
            <span className="text-[9px] text-muted-foreground font-mono">Ctrl+Shift+V</span>
          </button>

          <div className="my-1 h-px bg-border/40" />

          {/* --- Sample & Fill --- */}
          <button
            type="button"
            onClick={() => handleAction(handleSampleTile)}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-foreground hover:bg-primary/20 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Pipette className="h-3.5 w-3.5 text-cyan-400" />
              <span>Eyedropper (Sample)</span>
            </div>
            <span className="text-[9px] text-muted-foreground font-mono">I</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction(handleFillLayerWithBrush)}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-foreground hover:bg-primary/20 transition-colors cursor-pointer"
          >
            <PaintBucket className="h-3.5 w-3.5 text-sky-400" />
            <span>{hasMultiSelection ? `Fill Selection (${selectedCount})` : 'Fill Layer with Brush'}</span>
          </button>

          {hasSelection && (
            <>
              <button
                type="button"
                onClick={() => handleAction(handleRotateSelection)}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-foreground hover:bg-primary/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <RotateCw className="h-3.5 w-3.5 text-primary" />
                  <span>Rotate 90° CW</span>
                </div>
                <span className="text-[9px] text-muted-foreground font-mono">R</span>
              </button>

              <div className="grid grid-cols-2 gap-1 px-1 py-0.5">
                <button
                  type="button"
                  onClick={() => handleAction(handleFlipSelectionH)}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-background/50 border border-border/60 px-2 py-1 text-foreground hover:bg-primary/20 transition-colors cursor-pointer text-[10px]"
                >
                  <FlipHorizontal className="h-3 w-3 text-cyan-400" />
                  <span>Flip H</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAction(handleFlipSelectionV)}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-background/50 border border-border/60 px-2 py-1 text-foreground hover:bg-primary/20 transition-colors cursor-pointer text-[10px]"
                >
                  <FlipVertical className="h-3 w-3 text-cyan-400" />
                  <span>Flip V</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleAction(handleDuplicateSelection)}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-foreground hover:bg-primary/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CopyPlus className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Duplicate Selection</span>
                </div>
                <span className="text-[9px] text-muted-foreground font-mono">Ctrl+D</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => handleAction(handleClearTile)}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete {hasMultiSelection ? `${selectedCount} Tiles` : 'Tile'}</span>
            </div>
            <span className="text-[9px] text-destructive/70 font-mono">Del</span>
          </button>

          <div className="my-1 h-px bg-border/40" />

          {/* --- Quick Create Section --- */}
          <div>
            <button
              type="button"
              onClick={() => setIsQuickCreateOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-primary hover:bg-primary/20 transition-colors cursor-pointer font-bold"
            >
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span>Quick Create Zone</span>
              </div>
              {isQuickCreateOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>

            {isQuickCreateOpen && (
              <div className="mt-1 ml-2 pl-2 border-l border-border/60 space-y-0.5 animate-in slide-in-from-top-1 duration-150">
                {/* Warp Gate Placement */}
                {!isSelectingGateType ? (
                  <button
                    type="button"
                    onClick={() => setIsSelectingGateType(true)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-foreground hover:bg-purple-950/40 transition-colors cursor-pointer"
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
                        className="text-muted-foreground hover:text-foreground text-xs"
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

                {/* Default Spawn */}
                <button
                  type="button"
                  onClick={() => handleAction(handleSetDefaultMapSpawn)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-foreground hover:bg-primary/20 transition-colors cursor-pointer"
                >
                  <MapPin className="h-3 w-3 text-primary" />
                  <span>Set Default Map Spawn</span>
                </button>

                {/* Teleport Author Avatar */}
                <button
                  type="button"
                  onClick={() => handleAction(handleSetPlayerSpawn)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-foreground hover:bg-emerald-950/40 transition-colors cursor-pointer"
                >
                  <UserRound className="h-3 w-3 text-emerald-400" />
                  <span>Teleport Author Here</span>
                </button>

                {/* Encounter Zone */}
                <button
                  type="button"
                  onClick={() => handleAction(() => handlePlaceLogicTag(6, 'Encounter Zone', 'creature'))}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-foreground hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-rose-400" />
                    <span>Encounter Zone</span>
                  </div>
                  <span className="text-[8px] text-muted-foreground font-mono">#6</span>
                </button>

                {/* Loot Container */}
                <button
                  type="button"
                  onClick={() => handleAction(() => handlePlaceLogicTag(4, 'Loot Container', 'loot'))}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-foreground hover:bg-primary/20 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-3 w-3 text-primary" />
                    <span>Loot Container</span>
                  </div>
                  <span className="text-[8px] text-muted-foreground font-mono">#4</span>
                </button>

                {/* Resource Gathering */}
                <button
                  type="button"
                  onClick={() => handleAction(() => handlePlaceLogicTag(11, 'Harvest Resource', 'loot'))}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-foreground hover:bg-emerald-950/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Trees className="h-3 w-3 text-emerald-400" />
                    <span>Resource Gathering Zone</span>
                  </div>
                  <span className="text-[8px] text-muted-foreground font-mono">#11</span>
                </button>
              </div>
            )}
          </div>

          <div className="my-1 h-px bg-border/40" />

          {/* --- Selection Section --- */}
          <button
            type="button"
            onClick={() => handleAction(handleSelectAll)}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-foreground hover:bg-primary/20 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Scan className="h-3.5 w-3.5 text-primary" />
              <span>Select All Map Tiles</span>
            </div>
            <span className="text-[9px] text-muted-foreground font-mono">Ctrl+A</span>
          </button>

          {hasSelection && (
            <button
              type="button"
              onClick={() => handleAction(handleClearSelection)}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <XCircle className="h-3.5 w-3.5" />
                <span>Clear Selection</span>
              </div>
              <span className="text-[9px] text-muted-foreground font-mono">Escape</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
