'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

  const [categoryFilter, setCategoryFilter] = useState<'all' | 'movement' | 'harvest' | 'service'>('all');

  const categories = [
    { id: 'all', label: 'All Tags' },
    { id: 'movement', label: 'Collision' },
    { id: 'harvest', label: 'Gathering' },
    { id: 'service', label: 'Services' },
  ] as const;

  const filteredPresets = useMemo(() => {
    return LOGIC_COMPONENT_PRESETS.filter((p) => {
      // Gates are physical connections, not painted logic tags
      if (p.kind.startsWith('gate_')) return false;
      if (categoryFilter === 'all') return true;
      if (categoryFilter === 'movement') return ['walkable', 'solid', 'bramble'].includes(p.kind);
      if (categoryFilter === 'harvest') return ['harvest_wood', 'harvest_ore', 'fishing'].includes(p.kind);
      if (categoryFilter === 'service') return ['shop', 'heal', 'craft', 'base', 'monster_spawner', 'encounter', 'bank', 'rule_trigger'].includes(p.kind);
      return true;
    });
  }, [categoryFilter]);

  return (
    <div className="space-y-2.5">
      <p className="text-[10px] leading-relaxed text-slate-400">
        Logic paints gameplay rules directly onto the map. Switch to{' '}
        <span className="text-emerald-300 font-bold">Walk Mode</span> to step on or interact with painted tags, then Save Map.
      </p>

      <div className="flex items-start gap-2 rounded border border-rose-500/25 bg-rose-950/20 px-2 py-1.5 text-[10px] text-rose-100/90">
        <MousePointerClick className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>Click or drag across cells. In-world colored overlays update live so you can inspect placement.</span>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-800 pb-1.5">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategoryFilter(cat.id)}
            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase transition-all ${
              categoryFilter === cat.id
                ? 'bg-[#806f47] text-white shadow-sm'
                : 'bg-black/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Quick Brush Presets */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-300">
          <span>Logic Presets ({filteredPresets.length}):</span>
          <button
            type="button"
            onClick={() => {
              setLayer(-1);
              setBrush(0);
              showToast('Brush: Clear — erasing logic tags');
            }}
            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase border ${
              brushId === 0
                ? 'border-rose-400 bg-rose-900/50 text-rose-100'
                : 'border-slate-700 bg-[#050b14] text-slate-400 hover:border-rose-500/50 hover:text-rose-200'
            }`}
            title="Erase / Clear logic"
          >
            Eraser (0)
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1 max-h-[160px] overflow-y-auto custom-scrollbar pr-0.5">
          {filteredPresets.map((p) => {
            const tileId = p.paintTileId ?? 0;
            const isActive = brushId === tileId && tileId !== 0;
            return (
              <button
                key={p.kind}
                type="button"
                onClick={() => {
                  setLayer(-1);
                  setBrush(tileId);
                  showToast(`Brush: ${p.label} (#${tileId})`);
                }}
                className={`flex items-center gap-1.5 rounded border p-1.5 text-left transition-all ${
                  isActive
                    ? 'border-[#cbb26a] bg-[#806f47]/30 text-white'
                    : 'border-slate-800 bg-[#050b14] text-slate-300 hover:border-[#806f47]/50 hover:bg-white/5'
                }`}
                title={p.description}
              >
                <span className={`h-3 w-3 shrink-0 rounded-sm ${p.color || 'bg-slate-600'} border border-white/20`} />
                <div className="min-w-0 flex-1 truncate">
                  <span className="block truncate text-[10px] font-bold">{p.name}</span>
                  <span className="block truncate text-[8px] text-slate-500">{p.tag}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Database Registered Tiles */}
      <div className="space-y-1 pt-1 border-t border-slate-800">
        <div className="text-[10px] font-semibold text-slate-400">Database Registered Tags ({tiles.length}):</div>
        <div className="grid grid-cols-1 gap-1 max-h-[140px] overflow-y-auto custom-scrollbar pr-0.5">
          {tiles.map((tile) => {
            const active = brushId === tile.id;
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => {
                  setLayer(-1);
                  setBrush(tile.id);
                  showToast(`Brush: ${tile.name} (#${tile.id})`);
                }}
                className={`flex items-center gap-2 rounded border px-2 py-1 text-left transition-all ${
                  active
                    ? 'border-[#cbb26a] bg-[#806f47]/25 text-white'
                    : 'border-slate-800 bg-[#050b14]/80 text-slate-300 hover:border-[#806f47]/50 hover:bg-white/5'
                }`}
              >
                <span
                  className={`h-4 w-4 shrink-0 rounded-sm border border-white/25 shadow-inner ${tile.color || 'bg-slate-600'}`}
                  title={tile.color}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[10px] font-bold">{tile.name}</span>
                  <span className="block truncate text-[8px] text-slate-500">
                    {tile.interactable ? 'Interact (F / E)' : tile.onStepAction ? `Step: ${tile.onStepAction}` : 'Collision / tag'}
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
      </div>

      <div className="rounded border border-slate-800 bg-[#0b1320] px-2 py-1 text-[10px] text-[#e2d5b3] flex items-center justify-between">
        <span>Active brush: <span className="font-bold text-white">#{brushId}</span> {logicTiles[brushId] ? `(${logicTiles[brushId].name})` : ''}</span>
        <span className="text-[9px] text-slate-400">Layer: Logic (−1)</span>
      </div>
    </div>
  );
}
