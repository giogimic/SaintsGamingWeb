'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';
import {
  BiomeDefinition,
  CANONICAL_BIOMES,
  BiomeTerrainConfig,
  BiomeStrataConfig,
} from '@/shared/game/biome/biomeSchema';
import { SimplexNoise2D } from '@/shared/game/biome/simplexNoise';
import {
  VOXEL_MAT_GRASS,
  VOXEL_MAT_DIRT,
  VOXEL_MAT_STONE,
  VOXEL_MAT_GUNMETAL,
  VOXEL_MAT_SAND,
  VOXEL_MAT_SNOW,
  VOXEL_MAT_ICE,
  VOXEL_MAT_WOOD,
} from '@/shared/game/voxel/VoxelWord';
import { Sliders, Mountain, Layers, Eye, RefreshCw, Check, Sparkles } from 'lucide-react';

const MATERIAL_OPTIONS = [
  { id: VOXEL_MAT_GRASS, name: 'Lush Grass', color: '#10b981' },
  { id: VOXEL_MAT_DIRT, name: 'Rich Dirt', color: '#78350f' },
  { id: VOXEL_MAT_STONE, name: 'Hardened Stone', color: '#64748b' },
  { id: VOXEL_MAT_GUNMETAL, name: 'Bedrock Foundation', color: '#1e293b' },
  { id: VOXEL_MAT_SAND, name: 'Desert Sand', color: '#fbbf24' },
  { id: VOXEL_MAT_SNOW, name: 'Frost Snow', color: '#e0f2fe' },
  { id: VOXEL_MAT_ICE, name: 'Glacial Ice', color: '#38bdf8' },
  { id: VOXEL_MAT_WOOD, name: 'Timber Wood', color: '#92400e' },
];

export const BiomeConfiguratorPanel: React.FC = () => {
  const showToast = useGameStore((state) => state.showToast);
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('emerald_plains');
  const [activeBiome, setActiveBiome] = useState<BiomeDefinition>(CANONICAL_BIOMES.emerald_plains);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // When preset dropdown changes
  const handleSelectPreset = (key: string) => {
    setSelectedPresetKey(key);
    const preset = CANONICAL_BIOMES[key];
    if (preset) {
      setActiveBiome(JSON.parse(JSON.stringify(preset)));
    }
  };

  const handleTerrainChange = (key: keyof BiomeTerrainConfig, val: number) => {
    setActiveBiome((prev) => ({
      ...prev,
      terrain: {
        ...prev.terrain,
        [key]: val,
      },
    }));
  };

  const handleStrataChange = (key: keyof BiomeStrataConfig, val: number) => {
    setActiveBiome((prev) => ({
      ...prev,
      strata: {
        ...prev.strata,
        [key]: val,
      },
    }));
  };

  // Render 2D cross-section strata preview
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Dark sky background
    ctx.fillStyle = activeBiome.environment.skyColorHex || '#050b14';
    ctx.fillRect(0, 0, width, height);

    const noise = new SimplexNoise2D(activeBiome.seed);
    const cols = width;
    const maxWorldH = 32;

    const getMaterialColor = (matId: number) => {
      const opt = MATERIAL_OPTIONS.find((m) => m.id === matId);
      return opt ? opt.color : '#64748b';
    };

    const surfaceColor = getMaterialColor(activeBiome.strata.surfaceMaterial);
    const subColor = getMaterialColor(activeBiome.strata.subsurfaceMaterial);
    const mantleColor = getMaterialColor(activeBiome.strata.mantleMaterial);
    const bedrockColor = getMaterialColor(activeBiome.strata.bedrockMaterial);

    for (let x = 0; x < cols; x++) {
      const worldX = x * 0.5;
      const offset = noise.fBm(worldX, 0, activeBiome.terrain);
      const surfaceY = Math.round(activeBiome.terrain.baseHeight + offset);
      const clampedY = Math.max(1, Math.min(31, surfaceY));

      const pxY = height - (clampedY / maxWorldH) * height;

      // Draw vertical strata column from surface down to bedrock (bottom)
      for (let wy = clampedY; wy >= 0; wy--) {
        const depth = clampedY - wy;
        const colY = height - (wy / maxWorldH) * height;
        const cellH = height / maxWorldH;

        if (wy === 0) {
          ctx.fillStyle = bedrockColor;
        } else if (depth === 0) {
          ctx.fillStyle = surfaceColor;
        } else if (depth <= activeBiome.strata.subsurfaceDepth) {
          ctx.fillStyle = subColor;
        } else {
          ctx.fillStyle = mantleColor;
        }
        ctx.fillRect(x, colY, 1, cellH + 0.5);
      }
    }

    // Grid baseline markers
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }, [activeBiome]);

  const handleApplyToWorld = () => {
    showToast(`Biome "${activeBiome.name}" configured for procedural generation.`);
  };

  return (
    <div className="flex flex-col h-full bg-[#050b14] text-gray-200 text-xs overflow-y-auto p-4 space-y-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Mountain className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-sm text-foreground">Biome Configurator</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedPresetKey}
            onChange={(e) => handleSelectPreset(e.target.value)}
            aria-label="Preset"
            className="bg-card/70 border border-border/60 rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
          >
            {Object.keys(CANONICAL_BIOMES).map((k) => (
              <option key={k} value={k}>
                {CANONICAL_BIOMES[k].name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Real-time 2D Cross-Section Strata Preview */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-primary" /> Strata Cross-Section Preview
          </span>
          <span>H: 0m (Bedrock) to 32m (Ceiling)</span>
        </div>
        <div className="relative border border-border/50 rounded-lg overflow-hidden bg-black/40 shadow-inner">
          <canvas ref={canvasRef} width={400} height={120} className="w-full h-28 block" />
        </div>
      </div>

      {/* Terrain Fractal Noise Sliders */}
      <div className="space-y-3 bg-card/40 border border-border/40 rounded-lg p-3">
        <div className="flex items-center gap-1.5 font-medium text-foreground text-[11px]">
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span>Fractal Noise Parameters (Simplex fBm)</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Base Elevation</span>
              <span className="font-mono text-foreground">{activeBiome.terrain.baseHeight}m</span>
            </div>
            <input
              type="range"
              min="4"
              max="28"
              step="1"
              value={activeBiome.terrain.baseHeight}
              onChange={(e) => handleTerrainChange('baseHeight', Number(e.target.value))}
              className="w-full accent-primary h-1.5 bg-card/60 rounded cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Amplitude (Height Swing)</span>
              <span className="font-mono text-foreground">±{activeBiome.terrain.amplitude}m</span>
            </div>
            <input
              type="range"
              min="1"
              max="16"
              step="1"
              value={activeBiome.terrain.amplitude}
              onChange={(e) => handleTerrainChange('amplitude', Number(e.target.value))}
              className="w-full accent-primary h-1.5 bg-card/60 rounded cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Frequency</span>
              <span className="font-mono text-foreground">{activeBiome.terrain.frequency.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="0.005"
              max="0.06"
              step="0.002"
              value={activeBiome.terrain.frequency}
              onChange={(e) => handleTerrainChange('frequency', Number(e.target.value))}
              className="w-full accent-primary h-1.5 bg-card/60 rounded cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Octaves</span>
              <span className="font-mono text-foreground">{activeBiome.terrain.octaves}</span>
            </div>
            <input
              type="range"
              min="1"
              max="6"
              step="1"
              value={activeBiome.terrain.octaves}
              onChange={(e) => handleTerrainChange('octaves', Number(e.target.value))}
              className="w-full accent-primary h-1.5 bg-card/60 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Depth-Indexed Geological Strata Materials */}
      <div className="space-y-3 bg-card/40 border border-border/40 rounded-lg p-3">
        <div className="flex items-center gap-1.5 font-medium text-foreground text-[11px]">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>Geological Strata Palettes</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-muted-foreground mb-1">Surface Layer (Depth = 0)</label>
            <select
              value={activeBiome.strata.surfaceMaterial}
              onChange={(e) => handleStrataChange('surfaceMaterial', Number(e.target.value))}
              aria-label="Surface Layer"
              className="w-full bg-card/70 border border-border/60 rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              {MATERIAL_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-muted-foreground mb-1">Subsurface Layer</label>
            <select
              value={activeBiome.strata.subsurfaceMaterial}
              onChange={(e) => handleStrataChange('subsurfaceMaterial', Number(e.target.value))}
              aria-label="Subsurface Layer"
              className="w-full bg-card/70 border border-border/60 rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              {MATERIAL_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-muted-foreground mb-1">Subsurface Depth (Blocks)</label>
            <input
              type="number"
              min="1"
              max="8"
              value={activeBiome.strata.subsurfaceDepth}
              onChange={(e) => handleStrataChange('subsurfaceDepth', Number(e.target.value))}
              aria-label="Subsurface Depth"
              className="w-full bg-card/70 border border-border/60 rounded px-2 py-1 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-[10px] text-muted-foreground mb-1">Mantle Geological Layer</label>
            <select
              value={activeBiome.strata.mantleMaterial}
              onChange={(e) => handleStrataChange('mantleMaterial', Number(e.target.value))}
              aria-label="Mantle Geological Layer"
              className="w-full bg-card/70 border border-border/60 rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              {MATERIAL_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleApplyToWorld}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Check className="w-4 h-4" />
          <span>Apply Biome Rules</span>
        </button>
      </div>
    </div>
  );
};
