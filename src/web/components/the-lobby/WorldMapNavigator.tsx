'use client';

import React, { useState } from 'react';
import { GAME_MAPS } from './data/maps';

interface WorldMapNavigatorProps {
  currentMapId: string;
  onSelectMap: (mapId: string) => void;
  multiMapMode: boolean;
  onToggleMultiMapMode: (enabled: boolean) => void;
}

export default function WorldMapNavigator({
  currentMapId,
  onSelectMap,
  multiMapMode,
  onToggleMultiMapMode,
}: WorldMapNavigatorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'CAMPAIGN' | 'CUSTOM'>('ALL');

  const allMaps = Object.values(GAME_MAPS);
  const currentMap = GAME_MAPS[currentMapId] || GAME_MAPS['SAINTS_VILLAGE'];

  const filteredMaps = allMaps.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.id.toLowerCase().includes(searchTerm.toLowerCase());
    if (categoryFilter === 'CAMPAIGN') return matchesSearch && (m.id.startsWith('tuxemon_') || m.id.startsWith('player_') || m.id.startsWith('spyder_') || m.id.startsWith('professor_'));
    if (categoryFilter === 'CUSTOM') return matchesSearch && (!m.id.startsWith('tuxemon_') && !m.id.startsWith('player_') && !m.id.startsWith('spyder_') && !m.id.startsWith('professor_'));
    return matchesSearch;
  });

  // Extract adjacent gate targets
  const gates = currentMap?.gates || {};
  const adjacentTargetIds = Object.values(gates).map(g => g.targetMapId);

  return (
    <div className="flex flex-col gap-3 p-3 bg-slate-900/90 border border-cyan-800/60 rounded-lg text-mono text-xs text-slate-200 select-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="font-bold text-cyan-400 uppercase tracking-wider">WORLD MAP NAVIGATOR</span>
        <label className="flex items-center gap-2 text-[10px] text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={multiMapMode}
            onChange={(e) => onToggleMultiMapMode(e.target.checked)}
            className="accent-cyan-500 rounded cursor-pointer"
          />
          <span>Multi-Map Preview</span>
        </label>
      </div>

      {/* Active Map Adjacent Connections */}
      <div className="p-2 bg-black/50 border border-slate-800 rounded">
        <div className="text-[10px] text-slate-400 uppercase font-bold mb-1.5">
          ACTIVE MAP: <span className="text-cyan-300 font-bold">{currentMap?.name || currentMapId}</span>
        </div>
        <div className="text-[11px] text-slate-300 mb-1 font-semibold">Adjacent Gate Links ({adjacentTargetIds.length}):</div>
        {adjacentTargetIds.length === 0 ? (
          <div className="text-[10px] text-slate-500 italic">No adjacent warp gates defined on this map.</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {adjacentTargetIds.map(targetId => {
              const targetMap = GAME_MAPS[targetId];
              return (
                <button
                  key={targetId}
                  onClick={() => onSelectMap(targetId)}
                  className="px-2 py-1 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-700/60 text-cyan-200 rounded text-[10px] flex items-center gap-1 transition-colors"
                >
                  <span>→</span>
                  <span>{targetMap?.name || targetId}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter & Search */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search maps..."
          className="flex-1 bg-black/60 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
        />
        <select
          value={categoryFilter}
          onChange={(e: any) => setCategoryFilter(e.target.value)}
          className="bg-black/60 border border-slate-700 rounded px-2 py-1 text-[11px] text-white"
        >
          <option value="ALL">All ({allMaps.length})</option>
          <option value="CAMPAIGN">Campaign</option>
          <option value="CUSTOM">Custom</option>
        </select>
      </div>

      {/* Map Grid / List */}
      <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
        {filteredMaps.map(m => {
          const isSelected = m.id === currentMapId;
          const cols = m.grid[0]?.length || 0;
          const rows = m.grid.length || 0;
          const gateCount = Object.keys(m.gates || {}).length;

          return (
            <div
              key={m.id}
              onClick={() => onSelectMap(m.id)}
              className={`p-2 rounded border cursor-pointer transition-all flex items-center justify-between ${
                isSelected
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700/60 text-slate-300'
              }`}
            >
              <div>
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span>{m.name}</span>
                  {isSelected && <span className="text-[9px] bg-cyan-500 text-black font-bold px-1 rounded">ACTIVE</span>}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  ID: {m.id} ({cols}x{rows})
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-900">
                  {gateCount} Gates
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
