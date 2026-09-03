'use client';

import React, { useState } from 'react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import {
  Grid,
  Sparkles,
  Layers,
  Save,
  Check,
  RotateCcw,
  Sliders,
  ChevronRight,
  Shield,
  HelpCircle,
  Info,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CornerLeftUp,
  CornerRightUp,
  CornerLeftDown,
  CornerRightDown,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';
import {
  NINE_SLICE_OFFSETS,
  type EdgeClassification,
  resolveAutoTileGid,
  type TerrainTransitionRule,
} from '@/shared/game/terrainEdgeDetection';
import { TileVisualThumbnail } from '../TilesetPicker';

interface TerrainSetPreset {
  id: string;
  name: string;
  material: string;
  centerGid: number;
  sourceSheet: string;
  tileW: number;
  tileH: number;
  columns: number;
}

/** Human-readable tooltip descriptions for each edge classification */
const EDGE_DESCRIPTIONS: Record<string, string> = {
  CENTER: 'Interior tile — fully surrounded by the same material on all sides.',
  EDGE_N: 'Top edge — open ground (or different material) above this tile.',
  EDGE_S: 'Bottom edge — open ground below this tile.',
  EDGE_W: 'Left edge — open ground to the left.',
  EDGE_E: 'Right edge — open ground to the right.',
  OUTER_CORNER_NW: 'Top-left outer corner — open ground above and to the left.',
  OUTER_CORNER_NE: 'Top-right outer corner — open ground above and to the right.',
  OUTER_CORNER_SW: 'Bottom-left outer corner — open ground below and to the left.',
  OUTER_CORNER_SE: 'Bottom-right outer corner — open ground below and to the right.',
};

/** Color accents for different slot types */
const EDGE_COLORS: Record<string, string> = {
  CENTER: 'border-emerald-500/60',
  EDGE_N: 'border-amber-400/50',
  EDGE_S: 'border-amber-400/50',
  EDGE_W: 'border-amber-400/50',
  EDGE_E: 'border-amber-400/50',
  OUTER_CORNER_NW: 'border-cyan-400/50',
  OUTER_CORNER_NE: 'border-cyan-400/50',
  OUTER_CORNER_SW: 'border-cyan-400/50',
  OUTER_CORNER_SE: 'border-cyan-400/50',
};

const EDGE_LABELS: Record<string, string> = {
  CENTER: '■',
  EDGE_N: '↑',
  EDGE_S: '↓',
  EDGE_W: '←',
  EDGE_E: '→',
  OUTER_CORNER_NW: '◤',
  OUTER_CORNER_NE: '◥',
  OUTER_CORNER_SW: '◣',
  OUTER_CORNER_SE: '◢',
};

export const TerrainAtlasEditor: React.FC = () => {
  const activeMapData = useGameStore((s) => s.activeMapData);
  const setActiveMapData = useGameStore((s) => s.setActiveMapData);
  const activeBrushTileId = useEditorStore((s) => s.activeBrushTileId);
  const setActiveBrushTileId = useEditorStore((s) => s.setActiveBrushTileId);
  const markMapDirty = useEditorStore((s) => s.markMapDirty);
  const showToast = useGameStore((s) => s.showToast);

  const [selectedClassification, setSelectedClassification] = useState<EdgeClassification>('CENTER');
  const [selectedSet, setSelectedSet] = useState<string>('grass_standard');
  const [showGuide, setShowGuide] = useState(false);

  const presets: TerrainSetPreset[] = [
    {
      id: 'grass_standard',
      name: 'Lush Grassland',
      material: 'GRASS',
      centerGid: 17,
      sourceSheet: 'terrain-overworld.png',
      tileW: 128,
      tileH: 128,
      columns: 8,
    },
    {
      id: 'dirt_path',
      name: 'Dirt Trail',
      material: 'DIRT',
      centerGid: 19,
      sourceSheet: 'terrain-overworld.png',
      tileW: 128,
      tileH: 128,
      columns: 8,
    },
    {
      id: 'stone_cobble',
      name: 'Cobblestone Road',
      material: 'STONE',
      centerGid: 20,
      sourceSheet: 'terrain-overworld.png',
      tileW: 128,
      tileH: 128,
      columns: 8,
    },
    {
      id: 'water_pond',
      name: 'Pond Water',
      material: 'WATER',
      centerGid: 27,
      sourceSheet: 'terrain-overworld.png',
      tileW: 128,
      tileH: 128,
      columns: 8,
    },
  ];

  const currentPreset = presets.find((p) => p.id === selectedSet) || presets[0];

  const gridPositions: Array<{ pos: string; classId: EdgeClassification; label: string }> = [
    { pos: 'col-start-1 row-start-1', classId: 'OUTER_CORNER_NW', label: 'NW Corner' },
    { pos: 'col-start-2 row-start-1', classId: 'EDGE_N', label: 'Top Edge' },
    { pos: 'col-start-3 row-start-1', classId: 'OUTER_CORNER_NE', label: 'NE Corner' },
    { pos: 'col-start-1 row-start-2', classId: 'EDGE_W', label: 'Left Edge' },
    { pos: 'col-start-2 row-start-2', classId: 'CENTER', label: 'Center (Base)' },
    { pos: 'col-start-3 row-start-2', classId: 'EDGE_E', label: 'Right Edge' },
    { pos: 'col-start-1 row-start-3', classId: 'OUTER_CORNER_SW', label: 'SW Corner' },
    { pos: 'col-start-2 row-start-3', classId: 'EDGE_S', label: 'Bottom Edge' },
    { pos: 'col-start-3 row-start-3', classId: 'OUTER_CORNER_SE', label: 'SE Corner' },
  ];

  const handleSelectSlot = (classId: EdgeClassification) => {
    soundSynth?.playUiClick?.();
    setSelectedClassification(classId);
    const gid = resolveAutoTileGid(currentPreset.centerGid, classId, currentPreset.columns);
    setActiveBrushTileId(gid);
    showToast(`Active Brush set to ${classId} (GID #${gid})`);
  };

  const handleApplyPreset = (preset: TerrainSetPreset) => {
    soundSynth?.playActionSound?.();
    setSelectedSet(preset.id);
    setActiveBrushTileId(preset.centerGid);
    showToast(`Loaded 9-Slice Auto-Tile Set: ${preset.name}`);
  };

  return (
    <div className="flex flex-col gap-3 font-mono text-xs">
      {/* Set Selector Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handleApplyPreset(preset)}
            className={`px-2.5 py-1 rounded text-[10px] font-bold shrink-0 transition-colors cursor-pointer ${
              selectedSet === preset.id
                ? 'bg-primary/20 text-primary border border-primary/50'
                : 'bg-[#060e1c] text-muted-foreground border border-border/30 hover:border-border hover:text-foreground'
            }`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* 3x3 Auto-Tile Preview Matrix */}
      <div className="p-3 rounded-lg bg-[#060d18] border border-border/40 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
          <span className="flex items-center gap-1 text-primary">
            <Sparkles className="w-3 h-3 text-primary" /> 9-Slice Smart Edge Matrix
          </span>
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-primary transition cursor-pointer"
            title="Toggle visual guide"
          >
            <HelpCircle className="w-3 h-3" />
            <span>{showGuide ? 'Hide Guide' : 'How it works'}</span>
          </button>
        </div>

        <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-48 h-48 mx-auto p-1.5 rounded-lg bg-[#03060c] border border-border/50">
          {gridPositions.map(({ pos, classId, label }) => {
            const gid = resolveAutoTileGid(currentPreset.centerGid, classId, currentPreset.columns);
            const isSelected = selectedClassification === classId || activeBrushTileId === gid;
            const edgeColor = EDGE_COLORS[classId] || 'border-border/40';
            const description = EDGE_DESCRIPTIONS[classId] || label;

            const col = (gid - 1) % currentPreset.columns;
            const row = Math.floor((gid - 1) / currentPreset.columns);

            return (
              <button
                key={classId}
                type="button"
                onClick={() => handleSelectSlot(classId)}
                title={`${label}\n${description}\n(GID #${gid})`}
                className={`relative flex flex-col items-center justify-center rounded overflow-hidden transition-all cursor-pointer ${pos} ${
                  isSelected
                    ? 'ring-2 ring-primary border-primary bg-primary/20 scale-105'
                    : `border-2 ${edgeColor} hover:border-primary/50 bg-[#060e1c] hover:scale-105`
                }`}
              >
                <TileVisualThumbnail
                  sourceSheet={currentPreset.sourceSheet}
                  sourceX={col * currentPreset.tileW}
                  sourceY={row * currentPreset.tileH}
                  sourceWidth={currentPreset.tileW}
                  sourceHeight={currentPreset.tileH}
                  size={42}
                />
                {/* Slot label overlay */}
                <span className="absolute top-0 left-0.5 text-[8px] font-bold text-white/60 drop-shadow-sm">
                  {EDGE_LABELS[classId] || '?'}
                </span>
                <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[7px] font-bold text-center text-slate-300 py-0.2">
                  #{gid}
                </span>
              </button>
            );
          })}
        </div>

        {/* Slot info bar */}
        <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-1 border-t border-border/20">
          <div className="flex-1">
            <span className="text-foreground font-bold">{selectedClassification.replace(/_/g, ' ')}</span>
            <span className="text-slate-500 mx-1">•</span>
            <span className="text-primary font-bold">
              GID #{resolveAutoTileGid(currentPreset.centerGid, selectedClassification, currentPreset.columns)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!activeMapData) return;
              soundSynth?.playActionSound?.();
              const existingRules = activeMapData.terrainTransitionRules || [];
              const ruleIndex = existingRules.findIndex((r: any) => r.id === currentPreset.id || r.centerGid === currentPreset.centerGid);
              const newRule: TerrainTransitionRule = {
                id: currentPreset.id,
                name: currentPreset.name,
                centerGid: currentPreset.centerGid,
                columns: currentPreset.columns,
              };
              let updatedRules = [...existingRules];
              if (ruleIndex >= 0) {
                updatedRules[ruleIndex] = newRule;
              } else {
                updatedRules.push(newRule);
              }
              const nextMap = { ...activeMapData, terrainTransitionRules: updatedRules };
              setActiveMapData(nextMap);
              markMapDirty();
              showToast(`Saved "${currentPreset.name}" auto-tile rules to map!`);
            }}
            className="px-2 py-0.5 rounded bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer"
          >
            <Save className="w-2.5 h-2.5" />
            <span>Save Rules to Map</span>
          </button>
        </div>
      </div>

      {/* Selected slot description tooltip */}
      <div className="p-2.5 rounded-lg bg-[#070e1c] border border-border/30 text-[9px] text-muted-foreground flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="text-foreground font-bold">{selectedClassification.replace(/_/g, ' ')}</span>
          <p className="text-slate-400 leading-relaxed">
            {EDGE_DESCRIPTIONS[selectedClassification] || 'Select a slot from the matrix above to see its description.'}
          </p>
        </div>
      </div>

      {/* Visual Guide (collapsible) */}
      {showGuide && (
        <div className="p-3 rounded-lg bg-[#070e1c] border border-primary/20 space-y-3 animate-in fade-in duration-200">
          <div className="text-[10px] font-bold text-primary flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-primary" /> How Smart Border Works
          </div>

          {/* Before/After Visual */}
          <div className="grid grid-cols-2 gap-3">
            {/* Before: plain grid */}
            <div className="space-y-1">
              <span className="text-[8px] font-bold text-slate-500 uppercase">Before (Manual Paint)</span>
              <div className="grid grid-cols-4 gap-px p-1 rounded bg-[#03060c] border border-border/30">
                {[0,0,0,0, 0,1,1,0, 0,1,1,0, 0,0,0,0].map((v, i) => (
                  <div key={i} className={`w-5 h-5 rounded-sm ${v ? 'bg-emerald-700/60 border border-emerald-500/40' : 'bg-slate-800/40 border border-slate-700/20'}`} />
                ))}
              </div>
              <p className="text-[7px] text-slate-600">All tiles use the same CENTER variant — no visual edge transitions.</p>
            </div>

            {/* After: auto-tiled */}
            <div className="space-y-1">
              <span className="text-[8px] font-bold text-primary uppercase">After (Smart Border)</span>
              <div className="grid grid-cols-4 gap-px p-1 rounded bg-[#03060c] border border-primary/30">
                {[
                  0,0,0,0,
                  0,'◤','↑','◥',
                  0,'←','■','→',
                  0,'◣','↓','◢',
                ].map((v, i) => (
                  <div key={i} className={`w-5 h-5 rounded-sm flex items-center justify-center text-[7px] font-bold ${
                    v === 0
                      ? 'bg-slate-800/40 border border-slate-700/20'
                      : v === '■'
                      ? 'bg-emerald-700/60 border border-emerald-500/40 text-emerald-300'
                      : typeof v === 'string' && (v.includes('◤') || v.includes('◥') || v.includes('◣') || v.includes('◢'))
                      ? 'bg-cyan-700/40 border border-cyan-500/30 text-cyan-300'
                      : 'bg-amber-700/40 border border-amber-500/30 text-amber-300'
                  }`}>
                    {v !== 0 ? v : ''}
                  </div>
                ))}
              </div>
              <p className="text-[7px] text-slate-500">Each tile adapts — corners, edges, and center picked automatically.</p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-[8px] pt-1 border-t border-border/20">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-emerald-700/60 border border-emerald-500/40 inline-block" /> Center
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-amber-700/40 border border-amber-500/30 inline-block" /> Edges
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-cyan-700/40 border border-cyan-500/30 inline-block" /> Corners
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-slate-800/40 border border-slate-700/20 inline-block" /> Empty
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
