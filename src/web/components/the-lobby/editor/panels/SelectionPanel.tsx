'use client';

import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';
import {
  Crosshair,
  Square,
  Circle,
  Wand2,
  Maximize2,
  Trash2,
  Copy,
  Scissors,
  Clipboard,
  Layers,
  Sparkles,
  RotateCw,
  Plus,
  Minus,
  Check,
  X,
  Package,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

const SELECTION_MODES = [
  { id: 'box', label: 'Box', icon: Square },
  { id: 'circle', label: 'Circle', icon: Circle },
  { id: 'ellipse', label: 'Ellipse', icon: Circle },
  { id: 'lasso', label: 'Lasso', icon: Crosshair },
  { id: 'polygon', label: 'Polygon', icon: Crosshair },
  { id: 'magic-wand', label: 'Magic Wand', icon: Wand2 },
] as const;

export function SelectionPanel() {
  const selectionMode = useEditorStore((s) => s.selectionMode);
  const setSelectionMode = useEditorStore((s) => s.setSelectionMode);
  const selectedCells = useEditorStore((s) => s.selectedCells);
  const clearSelectedCells = useEditorStore((s) => s.clearSelectedCells);
  const addSelectedBox = useEditorStore((s) => s.addSelectedBox);
  const getSelectedBounds = useEditorStore((s) => s.getSelectedBounds);
  const getSelectedCount = useEditorStore((s) => s.getSelectedCount);
  const fillSelection = useEditorStore((s) => s.fillSelection);
  const eraseSelection = useEditorStore((s) => s.eraseSelection);
  const deleteSelectionTiles = useEditorStore((s) => s.deleteSelectionTiles);
  const copySelection = useEditorStore((s) => s.copySelection);
  const duplicateSelection = useEditorStore((s) => s.duplicateSelection);
  const activeBrushTileId = useEditorStore((s) => s.activeBrushTileId);
  const openPanel = useEditorStore((s) => s.openPanel);

  const activeMapData = useGameStore((s) => s.activeMapData);
  const showToast = useGameStore((s) => s.showToast);

  const [selectedCount, setSelectedCount] = useState(0);
  const [bounds, setBounds] = useState<ReturnType<typeof getSelectedBounds>>(null);

  useEffect(() => {
    setSelectedCount(getSelectedCount());
    setBounds(getSelectedBounds());
  }, [selectedCells, getSelectedCount, getSelectedBounds]);

  const handleSelectAll = () => {
    soundSynth?.playUiClick?.();
    if (!activeMapData) return;
    addSelectedBox(0, activeMapData.height - 1, 0, activeMapData.width - 1);
    showToast('Selected entire map');
  };

  const handleClear = () => {
    soundSynth?.playUiClick?.();
    clearSelectedCells();
    showToast('Cleared selection');
  };

  const handleFill = () => {
    soundSynth?.playUiClick?.();
    if (!activeMapData) return;
    const res = fillSelection(activeMapData, null, undefined, activeBrushTileId);
    if (res.error) showToast(res.error);
    else showToast(`Filled ${res.count} cells with active material`);
  };

  const handleErase = () => {
    soundSynth?.playUiClick?.();
    if (!activeMapData) return;
    const res = eraseSelection(activeMapData);
    if (res.error) showToast(res.error);
    else showToast(`Erased ${res.count} cells`);
  };

  const handleDelete = () => {
    soundSynth?.playUiClick?.();
    if (!activeMapData) return;
    const res = deleteSelectionTiles(activeMapData);
    if (res.error) showToast(res.error);
    else showToast(`Deleted ${res.count} tiles`);
  };

  const handleCopy = () => {
    soundSynth?.playUiClick?.();
    if (!activeMapData) return;
    const res = copySelection(activeMapData);
    if (res.ok) showToast(`Copied ${res.width}×${res.height} area to clipboard`);
  };

  const handleDuplicate = () => {
    soundSynth?.playUiClick?.();
    if (!activeMapData) return;
    const res = duplicateSelection(activeMapData, null, 1, 1);
    if (res.ok) showToast(`Duplicated selection (+1, +1)`);
  };

  return (
    <div className="flex flex-col h-full gap-3 text-foreground/90 font-mono text-xs select-none">
      {/* ── Selection Modes ── */}
      <div>
        <label className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase mb-1.5 block">
          Shape & Selection Tool
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {SELECTION_MODES.map((tool) => {
            const Icon = tool.icon;
            const isSelected = selectionMode === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => {
                  soundSynth?.playSelectSound?.();
                  setSelectionMode(tool.id);
                  useEditorStore.getState().setBrushMode('select');
                  showToast(`Tool: ${tool.label} Selection`);
                }}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary/20 text-primary border-primary/60'
                    : 'bg-black/30 border-border/40 text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{tool.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Selection Telemetry & Metrics ── */}
      <div className="p-2.5 rounded-xl border border-border/40 bg-black/30 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Selection Status
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              selectedCount > 0
                ? 'bg-primary/20 text-primary border border-primary/40'
                : 'bg-white/5 text-muted-foreground'
            }`}
          >
            {selectedCount} cells
          </span>
        </div>

        {bounds ? (
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="bg-black/40 p-1.5 rounded border border-white/5">
              <span className="text-muted-foreground block text-[9px]">Dimensions</span>
              <span className="font-bold text-foreground">
                {bounds.width} × {bounds.height}
              </span>
            </div>
            <div className="bg-black/40 p-1.5 rounded border border-white/5">
              <span className="text-muted-foreground block text-[9px]">Row Bounds</span>
              <span className="font-bold text-foreground">
                R{bounds.minR} - R{bounds.maxR}
              </span>
            </div>
            <div className="bg-black/40 p-1.5 rounded border border-white/5">
              <span className="text-muted-foreground block text-[9px]">Col Bounds</span>
              <span className="font-bold text-foreground">
                C{bounds.minC} - C{bounds.maxC}
              </span>
            </div>
            <div className="bg-black/40 p-1.5 rounded border border-white/5">
              <span className="text-muted-foreground block text-[9px]">Area Coverage</span>
              <span className="font-bold text-primary">
                {Math.round((selectedCount / (bounds.width * bounds.height)) * 100)}%
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground/60 italic py-1">
            Drag on the viewport or click Select All to establish a selection.
          </p>
        )}
      </div>

      {/* ── Batch Operations ── */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase block">
          Selection Actions
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={handleFill}
            disabled={selectedCount === 0}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 border border-primary/40 text-primary text-[11px] font-bold disabled:opacity-30 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fill Material</span>
          </button>
          <button
            onClick={handleErase}
            disabled={selectedCount === 0}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-border/40 text-foreground text-[11px] disabled:opacity-30 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Erase Area</span>
          </button>
          <button
            onClick={handleCopy}
            disabled={selectedCount === 0}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-border/40 text-foreground text-[11px] disabled:opacity-30 transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Copy Area</span>
          </button>
          <button
            onClick={handleDuplicate}
            disabled={selectedCount === 0}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-border/40 text-foreground text-[11px] disabled:opacity-30 transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Duplicate (+1)</span>
          </button>
        </div>
      </div>

      {/* ── Select All / Clear ── */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/30">
        <button
          onClick={handleSelectAll}
          className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-border/40 text-foreground text-[11px] transition-colors cursor-pointer"
        >
          Select All (Ctrl+A)
        </button>
        <button
          onClick={handleClear}
          disabled={selectedCount === 0}
          className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 border border-border/40 hover:border-red-500/40 text-muted-foreground hover:text-red-400 text-[11px] disabled:opacity-30 transition-colors cursor-pointer"
        >
          Deselect (Esc)
        </button>
      </div>

      {/* ── Blueprint Converter ── */}
      <div className="pt-2 border-t border-border/30">
        <button
          onClick={() => {
            openPanel('assets');
            showToast('Save active selection as Blueprint Stamp');
          }}
          disabled={selectedCount === 0}
          className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-[11px] disabled:opacity-30 transition-colors cursor-pointer"
        >
          <Package className="w-3.5 h-3.5" />
          <span>Convert Selection to Blueprint</span>
        </button>
      </div>
    </div>
  );
}
