'use client';

import React, { useMemo } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Navigation,
  RefreshCw,
  MapPin,
  Users,
  DoorOpen,
  Layers,
} from 'lucide-react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import { GAME_MAPS } from '../../data/maps';
import { toBaseMapId } from '@/shared/net/mapIds';

export interface MapProblem {
  id: string;
  type: 'ERROR' | 'WARNING' | 'INFO';
  category: 'GATE' | 'ENTITY' | 'LAYER' | 'SPAWN';
  message: string;
  detail?: string;
  coordinate?: { r: number; c: number };
  entityId?: string;
}

export function StudioProblemsPanel() {
  const activeMapData = useGameStore((s) => s.activeMapData);
  const currentMapId = useGameStore((s) => s.currentMapId);
  const mapEntities = useGameStore((s) => s.mapEntities);
  const logicTiles = useGameStore((s) => s.logicTiles);
  const setClickedTile = useEditorStore((s) => s.setClickedTile);

  const baseMapId = toBaseMapId(currentMapId || 'DEMO_SANDBOX');
  const mapData = activeMapData || GAME_MAPS[baseMapId] || GAME_MAPS['DEMO_SANDBOX'];

  const problems = useMemo<MapProblem[]>(() => {
    const list: MapProblem[] = [];
    if (!mapData) {
      list.push({
        id: 'no_map',
        type: 'ERROR',
        category: 'LAYER',
        message: 'No active map data loaded in workspace.',
      });
      return list;
    }

    const grid = mapData.grid || [];
    const rows = grid.length;
    const cols = rows > 0 ? grid[0].length : 0;

    // 1. Check Dimensions
    if (rows === 0 || cols === 0) {
      list.push({
        id: 'zero_dim',
        type: 'ERROR',
        category: 'LAYER',
        message: 'Map grid has invalid or zero dimensions.',
      });
    }

    // 2. Check Gates / Warps
    const gates = mapData.gates || [];
    gates.forEach((gate: any, idx: number) => {
      const targetMap = gate.targetMapId || gate.targetMap;
      if (!targetMap) {
        list.push({
          id: `gate_no_target_${idx}`,
          type: 'ERROR',
          category: 'GATE',
          message: `Gate at [${gate.y}, ${gate.x}] is missing target map ID.`,
          coordinate: { r: gate.y, c: gate.x },
        });
      } else if (!GAME_MAPS[targetMap] && !targetMap.startsWith('TEST_') && !targetMap.startsWith('DEMO_')) {
        list.push({
          id: `gate_unknown_target_${idx}`,
          type: 'WARNING',
          category: 'GATE',
          message: `Gate targets map "${targetMap}" which is not pre-registered in standard atlas.`,
          coordinate: { r: gate.y, c: gate.x },
        });
      }
    });

    // 3. Check Entity Collisions with Solid Tiles
    const npcs = mapData.npcs || mapEntities || [];
    npcs.forEach((npc: any, idx: number) => {
      const x = npc.position?.x ?? npc.x;
      const y = npc.position?.y ?? npc.y;
      if (typeof x === 'number' && typeof y === 'number') {
        if (y < 0 || y >= rows || x < 0 || x >= cols) {
          list.push({
            id: `entity_oob_${idx}`,
            type: 'ERROR',
            category: 'ENTITY',
            message: `Entity "${npc.name || npc.id}" is outside map boundaries at [${y}, ${x}].`,
            coordinate: { r: y, c: x },
            entityId: npc.id,
          });
        } else {
          const tileVal = grid[y]?.[x];
          const isSolid = tileVal === 1 || logicTiles[tileVal]?.isSolid;
          if (isSolid) {
            list.push({
              id: `entity_solid_${idx}`,
              type: 'WARNING',
              category: 'ENTITY',
              message: `Entity "${npc.name || npc.id}" is placed on a solid collision tile (ID: ${tileVal}) at [${y}, ${x}].`,
              coordinate: { r: y, c: x },
              entityId: npc.id,
            });
          }
        }
      }
    });

    // 4. Check Tile Layers
    const layers = mapData.tileLayers || [];
    if (layers.length === 0 && (!mapData.tilesets || mapData.tilesets.length === 0)) {
      list.push({
        id: 'no_visual_layers',
        type: 'INFO',
        category: 'LAYER',
        message: 'Map is operating in pure logic-mode without visual tileset layers.',
      });
    }

    return list;
  }, [mapData, mapEntities, logicTiles]);

  const errorCount = problems.filter((p) => p.type === 'ERROR').length;
  const warningCount = problems.filter((p) => p.type === 'WARNING').length;
  const infoCount = problems.filter((p) => p.type === 'INFO').length;

  const handleJumpTo = (problem: MapProblem) => {
    if (problem.coordinate) {
      setClickedTile(problem.coordinate);
      window.dispatchEvent(
        new CustomEvent('studio_center_camera', {
          detail: { r: problem.coordinate.r, c: problem.coordinate.c },
        })
      );
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#050b14]/95 text-slate-200 font-mono text-xs select-none p-3 overflow-hidden">
      {/* HEADER SUMMARY */}
      <div className="flex items-center justify-between border-b border-[#806f47]/30 pb-2 mb-2">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-[#cbb26a] tracking-wider uppercase flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-[#cbb26a]" />
            Diagnostics & Problems
          </span>
          <div className="flex items-center gap-2 text-[10px]">
            <span className={`px-1.5 py-0.2 rounded font-bold ${errorCount > 0 ? 'bg-rose-950/80 text-rose-400 border border-rose-600/40' : 'text-slate-500'}`}>
              {errorCount} Error{errorCount !== 1 ? 's' : ''}
            </span>
            <span className={`px-1.5 py-0.2 rounded font-bold ${warningCount > 0 ? 'bg-amber-950/80 text-amber-400 border border-amber-600/40' : 'text-slate-500'}`}>
              {warningCount} Warning{warningCount !== 1 ? 's' : ''}
            </span>
            <span className="text-slate-500 px-1 py-0.2">
              {infoCount} Info
            </span>
          </div>
        </div>

        <span className="text-[10px] text-[#e2d5b3]/60 uppercase">
          Map: {baseMapId}
        </span>
      </div>

      {/* PROBLEMS LIST */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-[#806f47]/30">
        {problems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-emerald-400 gap-2 p-6 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]" />
            <span className="font-bold text-sm">No map validation issues found</span>
            <span className="text-[11px] text-slate-400 max-w-xs">
              All gates, entity placements, and layer bounds conform to engine specifications.
            </span>
          </div>
        ) : (
          problems.map((prob) => {
            const isErr = prob.type === 'ERROR';
            const isWarn = prob.type === 'WARNING';

            return (
              <div
                key={prob.id}
                className={`p-2 rounded border flex items-start justify-between gap-3 transition-colors ${
                  isErr
                    ? 'bg-rose-950/20 border-rose-500/40 hover:bg-rose-950/30'
                    : isWarn
                    ? 'bg-amber-950/20 border-amber-500/40 hover:bg-amber-950/30'
                    : 'bg-cyan-950/20 border-cyan-500/30 hover:bg-cyan-950/30'
                }`}
              >
                <div className="flex items-start gap-2 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {isErr ? (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    ) : isWarn ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Info className="w-4 h-4 text-cyan-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] uppercase px-1 py-0.2 rounded font-extrabold ${
                          prob.category === 'GATE'
                            ? 'bg-amber-900/60 text-amber-300'
                            : prob.category === 'ENTITY'
                            ? 'bg-cyan-900/60 text-cyan-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {prob.category}
                      </span>
                      <span className="text-[11px] text-slate-200 font-medium">
                        {prob.message}
                      </span>
                    </div>
                  </div>
                </div>

                {prob.coordinate && (
                  <button
                    type="button"
                    onClick={() => handleJumpTo(prob)}
                    className="shrink-0 flex items-center gap-1 text-[10px] px-2 py-1 bg-[#1a2333] hover:bg-[#253247] text-[#cbb26a] rounded border border-[#806f47]/30 transition-all active:scale-95 cursor-pointer"
                    title={`Jump to [${prob.coordinate.r}, ${prob.coordinate.c}]`}
                  >
                    <Navigation className="w-3 h-3" />
                    <span>[{prob.coordinate.r}, {prob.coordinate.c}]</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
