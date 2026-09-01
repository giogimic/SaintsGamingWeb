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

export const TerrainAtlasEditor: React.FC = () => {
  const activeMapData = useGameStore((s) => s.activeMapData);
  const setActiveMapData = useGameStore((s) => s.setActiveMapData);
  const activeBrushTileId = useEditorStore((s) => s.activeBrushTileId);
  const setActiveBrushTileId = useEditorStore((s) => s.setActiveBrushTileId);
  const markMapDirty = useEditorStore((s) => s.markMapDirty);
  const showToast = useGameStore((s) => s.showToast);

  const [selectedClassification, setSelectedClassification] = useState<EdgeClassification>('CENTER');
  const [selectedSet, setSelectedSet] = useState<string>('grass_standard');

  const presets: TerrainSetPreset[] = [
    {
      id: 'grass_standard',
      name: 'Lush Grassland',
      material: 'GRASS',
      centerGid: 17,
      sourceSheet: 'Terrain_by_George.png',
      tileW: 16,
      tileH: 16,
      columns: 8,
    },
    {
      id: 'dirt_path',
      name: 'Dirt Trail',
      material: 'DIRT',
      centerGid: 19,
      sourceSheet: 'Terrain_by_George.png',
      tileW: 16,
      tileH: 16,
      columns: 8,
    },
    {
      id: 'stone_cobble',
      name: 'Cobblestone Road',
      material: 'STONE',
      centerGid: 20,
      sourceSheet: 'Terrain_by_George.png',
      tileW: 16,
      tileH: 16,
      columns: 8,
    },
    {
      id: 'water_pond',
      name: 'Pond Water',
      material: 'WATER',
      centerGid: 27,
      sourceSheet: 'Terrain_by_George.png',
      tileW: 16,
      tileH: 16,
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
          <span className="text-[9px] text-muted-foreground">Click tile to pick as brush</span>
        </div>

        <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-48 h-48 mx-auto p-1.5 rounded-lg bg-[#03060c] border border-border/50">
          {gridPositions.map(({ pos, classId, label }) => {
            const gid = resolveAutoTileGid(currentPreset.centerGid, classId, currentPreset.columns);
            const isSelected = selectedClassification === classId || activeBrushTileId === gid;

            const col = (gid - 1) % currentPreset.columns;
            const row = Math.floor((gid - 1) / currentPreset.columns);

            return (
              <button
                key={classId}
                type="button"
                onClick={() => handleSelectSlot(classId)}
                title={`${label} (GID #${gid})`}
                className={`relative flex flex-col items-center justify-center rounded overflow-hidden transition-all cursor-pointer ${pos} ${
                  isSelected
                    ? 'ring-2 ring-primary border-primary bg-primary/20'
                    : 'border border-border/40 hover:border-primary/50 bg-[#060e1c]'
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
                <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[7px] font-bold text-center text-slate-300 py-0.2">
                  #{gid}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-1 border-t border-border/20">
          <div>
            Selected: <span className="text-foreground font-bold">{selectedClassification}</span> • GID:{' '}
            <span className="text-primary font-bold">
              #{resolveAutoTileGid(currentPreset.centerGid, selectedClassification, currentPreset.columns)}
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
    </div>
  );
};
