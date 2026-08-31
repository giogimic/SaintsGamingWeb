'use client';

import React from 'react';
import { useEditorStore } from './editor-store';
import { useGameStore } from '../store';
import { Layers, Replace, Combine, Pin, X, Check } from 'lucide-react';
import type { PasteMode } from '@/shared/game/subgridStamp';

export const PasteOptionsToolbar: React.FC = () => {
  const isPasting = useEditorStore((s) => s.isPasting);
  const brushMode = useEditorStore((s) => s.brushMode);
  const clipboard = useEditorStore((s) => s.tileClipboard);
  const pasteMode = useEditorStore((s) => s.pasteMode);
  const setPasteMode = useEditorStore((s) => s.setPasteMode);
  const pasteClipboard = useEditorStore((s) => s.pasteClipboard);
  const cancelPaste = useEditorStore((s) => s.cancelPaste);
  const hoveredTile = useEditorStore((s) => s.hoveredTile);
  const activeMapData = useGameStore((s) => s.activeMapData);
  const showToast = useGameStore((s) => s.showToast);

  if (!isPasting && brushMode !== 'paste') {
    return null;
  }

  if (!clipboard) {
    return null;
  }

  const handlePasteAtCursor = () => {
    if (!activeMapData) return;
    const r = hoveredTile?.r ?? clipboard.sourceOrigin.r;
    const c = hoveredTile?.c ?? clipboard.sourceOrigin.c;
    const res = pasteClipboard(activeMapData, null, r, c, pasteMode);
    if (res.ok) {
      showToast(`Pasted ${res.count} tiles (${pasteMode})`);
      cancelPaste();
    } else {
      showToast(res.error || 'Paste failed.');
    }
  };

  const handlePasteInPlace = () => {
    if (!activeMapData) return;
    const res = pasteClipboard(
      activeMapData,
      null,
      clipboard.sourceOrigin.r,
      clipboard.sourceOrigin.c,
      pasteMode
    );
    if (res.ok) {
      showToast(`Pasted in place at [${clipboard.sourceOrigin.c}, ${clipboard.sourceOrigin.r}]`);
      cancelPaste();
    } else {
      showToast(res.error || 'Paste failed.');
    }
  };

  const MODES: Array<{ id: PasteMode; label: string; icon: React.FC<{ className?: string }>; desc: string }> = [
    {
      id: 'overlay',
      label: 'Overlay',
      icon: Combine,
      desc: 'Transparent merge — skips empty 0 tiles',
    },
    {
      id: 'replace',
      label: 'Replace',
      icon: Replace,
      desc: 'Overwrites entire footprint including empty tiles',
    },
    {
      id: 'new_layer',
      label: 'New Layer',
      icon: Layers,
      desc: 'Creates a new visual layer and pastes onto it',
    },
  ];

  return (
    <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[150] pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-2xl border border-amber-500/50 bg-[#050b14]/95 shadow-[0_0_30px_rgba(245,158,11,0.25)] backdrop-blur-xl font-mono text-xs text-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2 border-r border-amber-500/20 pr-3">
        <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="font-bold text-amber-300">
          PASTE ({clipboard.width}×{clipboard.height})
        </span>
      </div>

      {/* Mode Switches */}
      <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-amber-500/20">
        {MODES.map((m) => {
          const Icon = m.icon;
          const isActive = pasteMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setPasteMode(m.id)}
              title={m.desc}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-600 text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 pl-2">
        <button
          type="button"
          onClick={handlePasteAtCursor}
          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow cursor-pointer"
          title="Paste at current cursor tile (or click ground)"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Apply</span>
        </button>

        <button
          type="button"
          onClick={handlePasteInPlace}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold transition-all border border-amber-500/30 cursor-pointer"
          title={`Paste at original coordinates [${clipboard.sourceOrigin.c}, ${clipboard.sourceOrigin.r}] (Ctrl+Shift+V)`}
        >
          <Pin className="w-3.5 h-3.5" />
          <span>In Place</span>
        </button>

        <button
          type="button"
          onClick={cancelPaste}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-red-500/20 transition-all cursor-pointer"
          title="Cancel Paste (Escape)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
