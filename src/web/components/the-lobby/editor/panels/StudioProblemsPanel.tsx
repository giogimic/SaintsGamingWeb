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
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import { GAME_MAPS } from '../../data/maps';
import { toBaseMapId } from '@/shared/net/mapIds';
import { normalizeGatesToArray } from '@/shared/game/mapGates';
import { AssetManager } from '@/engine/assets/AssetManager';
import { PLAYABLE_CLASS_IDS } from '@/shared/game/classCatalog';

export interface MapProblem {
  id: string;
  type: 'ERROR' | 'WARNING' | 'INFO';
  category: 'GATE' | 'ENTITY' | 'LAYER' | 'SPAWN' | 'CONNECTION' | 'ASSET' | 'LIFECYCLE';
  message: string;
  detail?: string;
  coordinate?: { r: number; c: number };
  entityId?: string;
}

export function StudioProblemsPanel() {
  const [activeTab, setActiveTab] = React.useState<'map' | 'runtime_assets'>('map');
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
    const gates = normalizeGatesToArray(mapData.gates);
    gates.forEach((gate, idx) => {
      const targetMap = gate.targetMapId;
      if (!targetMap) {
        list.push({
          id: `gate_no_target_${idx}`,
          type: 'ERROR',
          category: 'GATE',
          message: `Gate at [${gate.position.y}, ${gate.position.x}] is missing target map ID.`,
          coordinate: { r: gate.position.y, c: gate.position.x },
        });
      } else if (!GAME_MAPS[targetMap] && !targetMap.startsWith('TEST_') && !targetMap.startsWith('DEMO_')) {
        list.push({
          id: `gate_unknown_target_${idx}`,
          type: 'WARNING',
          category: 'GATE',
          message: `Gate targets map "${targetMap}" which is not pre-registered in standard atlas.`,
          coordinate: { r: gate.position.y, c: gate.position.x },
        });
      }
    });

    // 2.5 Check Map Connections
    if (mapData.connections) {
      const dirs = ['north', 'south', 'east', 'west'] as const;
      dirs.forEach(dir => {
        const conn = mapData.connections![dir];
        if (!conn) return;

        const targetMapId = typeof conn === 'string' ? conn : conn.targetMapId;
        const targetMap = GAME_MAPS[targetMapId];

        if (!targetMap && !targetMapId.startsWith('TEST_') && !targetMapId.startsWith('DEMO_')) {
          list.push({
            id: `conn_unknown_${dir}`,
            type: 'ERROR',
            category: 'CONNECTION',
            message: `Connection ${dir.toUpperCase()} targets map "${targetMapId}" which is missing from the atlas.`,
          });
        } else if (targetMap) {
          // Check reciprocity
          const opposite = { north: 'south', south: 'north', east: 'west', west: 'east' }[dir] as 'north'|'south'|'east'|'west';
          const reciprocal = targetMap.connections?.[opposite];
          let reciprocalTargetId = null;
          if (reciprocal) {
             reciprocalTargetId = typeof reciprocal === 'string' ? reciprocal : reciprocal.targetMapId;
          }
          
          if (reciprocalTargetId !== baseMapId) {
             list.push({
                id: `conn_nonreciprocal_${dir}`,
                type: 'WARNING',
                category: 'CONNECTION',
                message: `Connection ${dir.toUpperCase()} to "${targetMapId}" is not reciprocal (target does not connect ${opposite.toUpperCase()} back to this map).`,
             });
          }
        }
      });
    }

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
    } else if (layers.length > 0) {
      const groundLayer = (layers as any[]).find((l: any) => l.name?.toLowerCase() === 'ground') || (layers as any[])[0];
      if (groundLayer?.grid && Array.isArray(groundLayer.grid)) {
        const isAllZeros = groundLayer.grid.every((row: any[]) => Array.isArray(row) && row.every((val: any) => val === 0));
        if (isAllZeros) {
          list.push({
            id: 'ground_all_zeros',
            type: 'WARNING',
            category: 'LAYER',
            message: 'Ground tile layer contains only empty zero tiles (may render black void).',
          });
        }
      }
    }

    // 5. Check Spawners
    const spawners = (mapData as any).spawners || (mapData as any).logicComponents?.filter((c: any) => c.kind === 'monster_spawner') || [];
    spawners.forEach((spawner: any, idx: number) => {
      const x = spawner.position?.x ?? spawner.x;
      const y = spawner.position?.y ?? spawner.y;
      if (typeof x === 'number' && typeof y === 'number') {
        if (y < 0 || y >= rows || x < 0 || x >= cols) {
          list.push({
            id: `spawner_oob_${idx}`,
            type: 'ERROR',
            category: 'SPAWN',
            message: `Spawner "${spawner.name || spawner.id || 'Monster Spawner'}" is outside map boundaries at [${y}, ${x}].`,
            coordinate: { r: y, c: x },
            entityId: spawner.id,
          });
        } else {
          const tileVal = grid[y]?.[x];
          const isSolid = tileVal === 1 || logicTiles[tileVal]?.isSolid;
          if (isSolid) {
            list.push({
              id: `spawner_solid_${idx}`,
              type: 'WARNING',
              category: 'SPAWN',
              message: `Spawner "${spawner.name || spawner.id || 'Monster Spawner'}" is placed on a solid collision tile at [${y}, ${x}].`,
              coordinate: { r: y, c: x },
              entityId: spawner.id,
            });
          }
        }
      }
    });

    // 5. Check Tileset Asset References
    if (mapData.tilesets && mapData.tilesets.length > 0) {
      (mapData.tilesets as any[]).forEach((ts: any, idx: number) => {
        if (!ts.imageSource) {
          list.push({
            id: `ts_empty_${idx}`,
            type: 'ERROR',
            category: 'ASSET',
            message: `Tileset #${idx + 1} has no valid image source URL defined.`,
          });
        }
      });
    }

    // 6. Check Entity Asset Dependencies & Preload Requirements
    const entityList = Array.isArray(mapEntities) ? mapEntities : Object.values(mapEntities || {});
    entityList.forEach((ent: any, idx: number) => {
      const sprite = ent.sprite || ent.spriteKey || ent.customSprite;
      if (!sprite && ent.type !== 'trigger' && ent.type !== 'spawner') {
        list.push({
          id: `ent_no_sprite_${idx}`,
          type: 'WARNING',
          category: 'ASSET',
          message: `Entity "${ent.name || ent.id}" has no presentation or sprite defined.`,
          coordinate: ent.position ? { r: ent.position.y ?? ent.position.r, c: ent.position.x ?? ent.position.c } : undefined,
          entityId: ent.id,
        });
      }

      // Check character class validity if entity specifies a class
      if (ent.classId && !PLAYABLE_CLASS_IDS.includes(ent.classId.toUpperCase() as any)) {
        list.push({
          id: `ent_invalid_class_${idx}`,
          type: 'WARNING',
          category: 'ENTITY',
          message: `Entity "${ent.name || ent.id}" references unverified class "${ent.classId}".`,
          coordinate: ent.position ? { r: ent.position.y ?? ent.position.r, c: ent.position.x ?? ent.position.c } : undefined,
          entityId: ent.id,
        });
      }
    });

    return list;
  }, [mapData, mapEntities, logicTiles]);

  const mapProblems = useMemo(() => problems.filter((p) => p.category !== 'ASSET' && p.category !== 'LIFECYCLE'), [problems]);
  const assetProblems = useMemo(() => problems.filter((p) => p.category === 'ASSET' || p.category === 'LIFECYCLE'), [problems]);

  const activeProblemList = activeTab === 'map' ? mapProblems : assetProblems;

  const [isScanning, setIsScanning] = React.useState(false);
  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 400);
  };

  const errorCount = activeProblemList.filter((p) => p.type === 'ERROR').length;
  const warningCount = activeProblemList.filter((p) => p.type === 'WARNING').length;
  const infoCount = activeProblemList.filter((p) => p.type === 'INFO').length;

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
      {/* HEADER SUMMARY & TAB SELECTOR */}
      <div className="flex flex-col gap-2 border-b border-[#806f47]/30 pb-2 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-[#cbb26a] tracking-wider uppercase flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-[#cbb26a]" />
              Diagnostics & Health
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleScan}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-[#1a2333] hover:bg-[#253247] text-[#cbb26a] rounded border border-[#806f47]/30 transition-all cursor-pointer"
              title="Scan map for issues"
            >
              <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
              <span>Scan</span>
            </button>
            <span className="text-[10px] text-[#e2d5b3]/60 uppercase">
              Map: {baseMapId}
            </span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
              activeTab === 'map'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                : 'bg-black/40 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Map Topology ({mapProblems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('runtime_assets')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
              activeTab === 'runtime_assets'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                : 'bg-black/40 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Runtime Asset Health ({assetProblems.length})
          </button>
        </div>
      </div>

      {/* PROBLEMS LIST */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-[#806f47]/30">
        {activeProblemList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-emerald-400 gap-2 p-6 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]" />
            <span className="font-bold text-sm">
              {activeTab === 'map' ? 'No map validation issues found' : 'All runtime assets healthy'}
            </span>
            <span className="text-[11px] text-slate-400 max-w-xs">
              {activeTab === 'map'
                ? 'All gates, entity placements, spawners, and layer bounds conform to engine specifications.'
                : 'All tilesets, presentations, and entity sprite dependencies are resolved.'}
            </span>
          </div>
        ) : (
          activeProblemList.map((prob) => {
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
                            : prob.category === 'SPAWN'
                            ? 'bg-rose-900/60 text-rose-300'
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
