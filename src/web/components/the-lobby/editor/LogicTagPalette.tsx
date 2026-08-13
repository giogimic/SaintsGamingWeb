'use client';

import React, { useEffect, useMemo } from 'react';
import { useGameStore } from '../store';
import { useEditorStore } from './editor-store';
import { Tag, MousePointerClick } from 'lucide-react';
import { LOGIC_COMPONENT_PRESETS } from '@/shared/game/logicComponents';

/**
 * Creator-facing logic tag palette (bible: tags/components over raw GIDs).
 * Selects a MapLogicTile id as the Logic (−1) brush.
 */
export function LogicTagPalette() {
  const logicTiles = useGameStore((s) => s.logicTiles);
  const fetchLogicTiles = useGameStore((s) => s.fetchLogicTiles);
  const brushId = useEditorStore((s) => s.activeLogicTileId);
  const setBrush = useEditorStore((s) => s.setActiveLogicTileId);
  const setLayer = useEditorStore((s) => s.setActiveLayerIdx);
  const showToast = useGameStore((s) => s.showToast);

  useEffect(() => {
    if (Object.keys(logicTiles).length === 0) {
      void fetchLogicTiles();
    }
  }, [logicTiles, fetchLogicTiles]);

  const tiles = Object.values(logicTiles).sort((a, b) => a.id - b.id);

  const quickPresets = useMemo(
    () => LOGIC_COMPONENT_PRESETS.filter((p) => p.paintTileId != null && logicTiles[p.paintTileId!]),
    [logicTiles]
  );

  if (tiles.length === 0) {
    return (
      <div className="rounded border border-slate-800 bg-[#050b14]/80 p-3 text-[11px] text-slate-400">
        No logic tags loaded. Open Inspector → Register Component, or wait for DemoBootstrap tiles.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] leading-relaxed text-slate-400">
        Logic paints colored overlays on the map — not tileset art. After painting, switch to{' '}
        <span className="text-emerald-300">Walk Mode</span> to step on / interact with tags, then Save Map.
      </p>

      <div className="flex items-start gap-2 rounded border border-rose-500/25 bg-rose-950/20 px-2 py-1.5 text-[10px] text-rose-100/90">
        <MousePointerClick className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>Click or drag across cells. Overlay colors update live so you can see what you painted.</span>
      </div>

      {quickPresets.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => {
              setLayer(-1);
              setBrush(0);
              showToast('Brush: Clear — erasing logic');
            }}
            className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              brushId === 0
                ? 'border-rose-400 bg-rose-900/50 text-rose-100'
                : 'border-slate-700 bg-[#050b14] text-slate-400 hover:border-[#806f47]/50'
            }`}
            title="Clear / Passable (0)"
          >
            Clear (0)
          </button>
          {quickPresets.slice(0, 8).map((p) => (
            <button
              key={p.kind}
              type="button"
              onClick={() => {
                setLayer(-1);
                setBrush(p.paintTileId!);
                showToast(`Brush: ${p.label} — paint, then Walk to test`);
              }}
              className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                brushId === p.paintTileId
                  ? 'border-[#cbb26a] bg-[#806f47]/30 text-[#e2d5b3]'
                  : 'border-slate-700 bg-[#050b14] text-slate-400 hover:border-[#806f47]/50'
              }`}
              title={p.description}
            >
              {p.tag}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-1 max-h-[280px] overflow-y-auto custom-scrollbar pr-0.5">
        {tiles.map((tile) => {
          const active = brushId === tile.id;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => {
                setLayer(-1);
                setBrush(tile.id);
              }}
              className={`flex items-center gap-2 rounded border px-2 py-1.5 text-left transition-all ${
                active
                  ? 'border-[#cbb26a] bg-[#806f47]/25 text-white'
                  : 'border-slate-800 bg-[#050b14]/80 text-slate-300 hover:border-[#806f47]/50 hover:bg-white/5'
              }`}
            >
              <span
                className={`h-5 w-5 shrink-0 rounded-md border border-white/25 shadow-inner ${tile.color || 'bg-slate-600'}`}
                title={tile.color}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-bold">{tile.name}</span>
                <span className="block truncate text-[9px] text-slate-500">
                  {tile.interactable ? 'Interact (face tile + F)' : tile.onStepAction ? `Step: ${tile.onStepAction}` : 'Collision / tag'}
                </span>
              </span>
              <span className="font-mono text-[9px] text-slate-500">#{tile.id}</span>
              {tile.isSolid && (
                <span className="rounded bg-red-900/40 px-1 text-[8px] uppercase text-red-300">solid</span>
              )}
              {tile.interactable && (
                <span className="rounded bg-sky-900/40 px-1 text-[8px] uppercase text-sky-300">use</span>
              )}
              {active && <Tag className="h-3 w-3 shrink-0 text-[#cbb26a]" />}
            </button>
          );
        })}
      </div>
      <div className="rounded border border-slate-800 bg-[#0b1320] px-2 py-1 text-[10px] text-[#e2d5b3]">
        Active brush: <span className="font-bold text-white">#{brushId}</span>
        {logicTiles[brushId] ? ` · ${logicTiles[brushId].name}` : ''}
      </div>
    </div>
  );
}
