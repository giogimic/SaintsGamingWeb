'use client';

import React, { useState, useEffect } from 'react';
import {
  Compass,
  AlertCircle,
  CheckCircle2,
  Grid3X3,
  Activity,
  Users,
  Wifi,
  Sparkles,
  Save,
} from 'lucide-react';
import { useEditorStore } from './editor-store';
import { useGameStore } from '../store';
import { soundSynth } from '@/engine/sound-synth';
import { getClientAtlas } from '../data/maps';
import { type AtlasGridData, getAdjacentAtlasNeighbors } from '@/shared/game/atlas/spatialAtlas';
import { STUDIO_TRIGGER_SAVE_MAP_EVENT } from '@/shared/game/studioEvents';

const InlineAtlasStatus = () => {
  const currentMapId = useGameStore((s) => s.currentMapId);
  const activeAtlasNodeId = useGameStore((s) => s.activeAtlasNodeId);
  const [atlas, setAtlas] = useState<AtlasGridData | null>(null);

  useEffect(() => {
    getClientAtlas().then(setAtlas).catch(() => {});
  }, [currentMapId, activeAtlasNodeId]);

  const node = atlas?.nodes.find((n) =>
    activeAtlasNodeId ? n.id === activeAtlasNodeId : n.mapId === currentMapId
  );
  const neighbors = node && atlas ? getAdjacentAtlasNeighbors(atlas, node) : null;

  if (!node) {
    return (
      <div
        onClick={() => useEditorStore.getState().openPanel('atlas')}
        className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/40 border border-border/40 text-[9px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        title="Unbound Map — Click to open World Atlas"
      >
        <Compass className="w-3 h-3 text-amber-500/50" />
        <span>Unbound Atlas Node</span>
      </div>
    );
  }

  return (
    <div
      onClick={() => useEditorStore.getState().openPanel('atlas')}
      className="hidden md:flex items-center gap-2 text-[9px] bg-black/40 border border-border/40 hover:border-primary/40 px-2 py-0.5 rounded cursor-pointer transition-colors"
      title={`World Atlas Node: ${node.mapId} — Click to open World Atlas`}
    >
      <Compass className="w-3 h-3 text-primary" />
      <span className="text-primary font-bold truncate max-w-[130px]">{node.mapId}</span>
      <div className="flex gap-1 text-muted-foreground/70 border-l border-border/40 pl-1.5">
        <span title={`North: ${neighbors?.north?.mapId || 'none'}`}>N:{neighbors?.north ? '✓' : '×'}</span>
        <span title={`East: ${neighbors?.east?.mapId || 'none'}`}>E:{neighbors?.east ? '✓' : '×'}</span>
        <span title={`South: ${neighbors?.south?.mapId || 'none'}`}>S:{neighbors?.south ? '✓' : '×'}</span>
        <span title={`West: ${neighbors?.west?.mapId || 'none'}`}>W:{neighbors?.west ? '✓' : '×'}</span>
      </div>
    </div>
  );
};

export const StudioBottomToolbar: React.FC = () => {
  const isCreationMode = useEditorStore((s) => s.isCreationMode);
  const activeWorkflowTool = useEditorStore((s) => s.activeWorkflowTool);
  const activeVoxelMaterialId = useEditorStore((s) => s.activeVoxelMaterialId);
  const activeBrushTileId = useEditorStore((s) => s.activeBrushTileId);
  const hoveredTile = useEditorStore((s) => s.hoveredTile);
  const hoveredVoxel = useEditorStore((s) => s.hoveredVoxel);
  const mapDirty = useEditorStore((s) => s.mapDirty);
  const hasUnsavedChanges = useEditorStore((s) => s.hasUnsavedChanges);
  const isSavingMap = useEditorStore((s) => s.isSavingMap);
  const snapToGrid = useEditorStore((s) => s.snapToGrid);
  const setSnapToGrid = useEditorStore((s) => s.setSnapToGrid);
  const openPanel = useEditorStore((s) => s.openPanel);

  const currentMapId = useGameStore((s) => s.currentMapId);
  const otherPlayers = useGameStore((s) => s.otherPlayers);
  const showToast = useGameStore((s) => s.showToast);

  const isDirty = mapDirty || hasUnsavedChanges;
  const peerCount = otherPlayers ? Object.keys(otherPlayers).length : 0;

  return (
    <footer className="h-7 w-full bg-[#050b14]/95 border-t border-border/40 backdrop-blur-xl flex items-center justify-between px-3 text-[11px] font-mono select-none z-30 shrink-0 pointer-events-auto">
      {/* ── Left: Cursor Coordinates & Active Tool ── */}
      <div className="flex items-center gap-3">
        {/* Coordinates */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="text-[9px] uppercase font-bold text-muted-foreground/60">POS:</span>
          {hoveredVoxel ? (
            <span className="text-foreground font-bold">
              X:{hoveredVoxel.wx} Y:{hoveredVoxel.wy} Z:{hoveredVoxel.wz}
            </span>
          ) : hoveredTile ? (
            <span className="text-foreground font-bold">
              X:{hoveredTile.c} Y:{hoveredTile.r}
            </span>
          ) : (
            <span className="text-muted-foreground/40 italic">--</span>
          )}
        </div>

        {/* Active Tool Badge */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/40 border border-border/30">
          <span className="text-[9px] uppercase font-bold text-muted-foreground/60">TOOL:</span>
          <span className="font-bold text-primary uppercase">{activeWorkflowTool}</span>
        </div>

        {/* Active Material */}
        <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-black/40 border border-border/30">
          <span className="text-[9px] uppercase font-bold text-muted-foreground/60">MAT:</span>
          <span className="text-foreground font-bold">#{activeVoxelMaterialId}</span>
          <span className="text-muted-foreground/50 text-[9px]">(GID {activeBrushTileId})</span>
        </div>
      </div>

      {/* ── Center: Atlas Node Status & Save Indicator ── */}
      <div className="flex items-center gap-3">
        <InlineAtlasStatus />

        {/* Dirty / Save Indicator */}
        <button
          onClick={() => {
            if (isDirty) {
              window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT));
            }
          }}
          className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors cursor-pointer text-[10px] ${
            isSavingMap
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
              : isDirty
              ? 'bg-red-500/15 text-red-300 border-red-500/40 hover:bg-red-500/25'
              : 'bg-black/40 text-emerald-400 border-border/30'
          }`}
          title={isDirty ? 'Unsaved map changes — click to Save (Ctrl+S)' : 'All changes saved to database'}
        >
          {isSavingMap ? (
            <>
              <Save className="w-3 h-3 text-amber-300 animate-spin" />
              <span>Saving...</span>
            </>
          ) : isDirty ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
              <span>Unsaved Edits</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Saved</span>
            </>
          )}
        </button>
      </div>

      {/* ── Right: Snap, Problems, Telemetry ── */}
      <div className="flex items-center gap-2.5">
        {/* Grid Snap */}
        <button
          onClick={() => {
            setSnapToGrid(!snapToGrid);
            showToast(`Snap to Grid: ${!snapToGrid ? 'ON' : 'OFF'}`);
          }}
          className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
            snapToGrid
              ? 'bg-primary/20 text-primary border-primary/40'
              : 'bg-black/30 border-border/30 text-muted-foreground hover:text-foreground'
          }`}
        >
          <Grid3X3 className="w-3 h-3" />
          <span>Snap</span>
        </button>

        {/* Diagnostics & Problems */}
        <button
          onClick={() => openPanel('problems')}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/40 hover:bg-white/5 border border-border/30 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Diagnostics & Problem Inspector"
        >
          <AlertCircle className="w-3 h-3 text-primary" />
          <span>Problems (0)</span>
        </button>

        {/* Shard Peers & Latency */}
        <div className="flex items-center gap-2 border-l border-border/40 pl-2 text-[10px] text-muted-foreground/70">
          <div className="flex items-center gap-1" title="Connected Peers on this shard">
            <Users className="w-3 h-3 text-muted-foreground/60" />
            <span>{peerCount}</span>
          </div>
          <div className="flex items-center gap-1" title="Realtime Shard Connection">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-400/90 font-bold">LIVE</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
