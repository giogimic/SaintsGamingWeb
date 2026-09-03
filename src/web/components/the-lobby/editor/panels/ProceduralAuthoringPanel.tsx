'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';
import {
  Sparkles,
  Dice5,
  Layers,
  Mountain,
  Waves,
  Trees,
  Sliders,
  Check,
  RotateCw,
  Globe,
  Play,
  Download,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

interface BiomePreset {
  id: string;
  name: string;
  color: string;
  baseMaterialId: number;
  subMaterialId: number;
  deepMaterialId: number;
  defaultFrequency: number;
  defaultSeaLevel: number;
  blurb: string;
}

const BIOME_PRESETS: BiomePreset[] = [
  {
    id: 'woodlands',
    name: 'Temperate Woodlands',
    color: '#22c55e',
    baseMaterialId: 1, // Grass
    subMaterialId: 2, // Dirt
    deepMaterialId: 3, // Stone
    defaultFrequency: 0.05,
    defaultSeaLevel: 4,
    blurb: 'Rolling emerald meadows, fertile soil, and rocky outcroppings.',
  },
  {
    id: 'desert',
    name: 'Golden Desert Dunes',
    color: '#eab308',
    baseMaterialId: 4, // Sand
    subMaterialId: 4, // Sand
    deepMaterialId: 12, // Obsidian
    defaultFrequency: 0.03,
    defaultSeaLevel: 2,
    blurb: 'Sweeping sand dunes and subterranean bedrock vaults.',
  },
  {
    id: 'alpine',
    name: 'Frost Peak Taiga',
    color: '#38bdf8',
    baseMaterialId: 5, // Snow
    subMaterialId: 3, // Stone
    deepMaterialId: 12, // Obsidian
    defaultFrequency: 0.07,
    defaultSeaLevel: 3,
    blurb: 'Rugged alpine elevation with snow caps and glacial stone.',
  },
  {
    id: 'volcanic',
    name: 'Volcanic Caldera',
    color: '#f97316',
    baseMaterialId: 12, // Obsidian
    subMaterialId: 10, // Lava
    deepMaterialId: 3, // Stone
    defaultFrequency: 0.06,
    defaultSeaLevel: 5,
    blurb: 'Molten hazards, obsidian crust, and basalt pillars.',
  },
  {
    id: 'cavern',
    name: 'Crystalline Cavern',
    color: '#a855f7',
    baseMaterialId: 8, // Dungeon Brick
    subMaterialId: 11, // Amber Crystal
    deepMaterialId: 12, // Obsidian
    defaultFrequency: 0.08,
    defaultSeaLevel: 1,
    blurb: 'Underground maze with glowing crystal strata.',
  },
];

// Simple deterministic 2D pseudo-random noise generator
function pseudoNoise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43758.5453) * 43758.5453;
  return n - Math.floor(n);
}

function sampleNoise(x: number, y: number, freq: number, octaves: number, seed: number): number {
  let val = 0;
  let amp = 1;
  let maxAmp = 0;
  let f = freq;

  for (let o = 0; o < octaves; o++) {
    const nx = Math.floor(x * f);
    const ny = Math.floor(y * f);
    const s1 = pseudoNoise(nx, ny, seed + o);
    const s2 = pseudoNoise(nx + 1, ny, seed + o);
    const s3 = pseudoNoise(nx, ny + 1, seed + o);
    const s4 = pseudoNoise(nx + 1, ny + 1, seed + o);

    const fx = (x * f) % 1;
    const fy = (y * f) % 1;
    const ix1 = s1 * (1 - fx) + s2 * fx;
    const ix2 = s3 * (1 - fx) + s4 * fx;
    val += (ix1 * (1 - fy) + ix2 * fy) * amp;

    maxAmp += amp;
    amp *= 0.5;
    f *= 2.0;
  }
  return maxAmp > 0 ? val / maxAmp : 0;
}

export function ProceduralAuthoringPanel() {
  const [selectedBiome, setSelectedBiome] = useState<BiomePreset>(BIOME_PRESETS[0]);
  const [seed, setSeed] = useState<number>(42);
  const [frequency, setFrequency] = useState<number>(0.05);
  const [octaves, setOctaves] = useState<number>(3);
  const [seaLevel, setSeaLevel] = useState<number>(4);
  const [mountainPeak, setMountainPeak] = useState<number>(24);
  const [slopeSolver, setSlopeSolver] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const activeMapData = useGameStore((s) => s.activeMapData);
  const showToast = useGameStore((s) => s.showToast);
  const pushPaintOp = useEditorStore((s) => s.pushPaintOp);
  const markMapDirty = useEditorStore((s) => s.markMapDirty);

  // Render live preview on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.createImageData(w, h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const height = sampleNoise(x, y, frequency, octaves, seed);
        const idx = (y * w + x) * 4;

        if (height * 31 < seaLevel) {
          // Water
          imgData.data[idx] = 2;
          imgData.data[idx + 1] = 132;
          imgData.data[idx + 2] = 199;
          imgData.data[idx + 3] = 255;
        } else if (height * 31 > mountainPeak) {
          // Mountain / Snow
          imgData.data[idx] = 226;
          imgData.data[idx + 1] = 232;
          imgData.data[idx + 2] = 240;
          imgData.data[idx + 3] = 255;
        } else {
          // Main Biome Color
          const intensity = 0.6 + height * 0.4;
          if (selectedBiome.id === 'desert') {
            imgData.data[idx] = Math.min(255, 234 * intensity);
            imgData.data[idx + 1] = Math.min(255, 179 * intensity);
            imgData.data[idx + 2] = Math.min(255, 8 * intensity);
          } else if (selectedBiome.id === 'volcanic') {
            imgData.data[idx] = Math.min(255, 60 * intensity);
            imgData.data[idx + 1] = Math.min(255, 40 * intensity);
            imgData.data[idx + 2] = Math.min(255, 50 * intensity);
          } else if (selectedBiome.id === 'alpine') {
            imgData.data[idx] = Math.min(255, 140 * intensity);
            imgData.data[idx + 1] = Math.min(255, 160 * intensity);
            imgData.data[idx + 2] = Math.min(255, 180 * intensity);
          } else if (selectedBiome.id === 'cavern') {
            imgData.data[idx] = Math.min(255, 100 * intensity);
            imgData.data[idx + 1] = Math.min(255, 60 * intensity);
            imgData.data[idx + 2] = Math.min(255, 140 * intensity);
          } else {
            imgData.data[idx] = Math.min(255, 34 * intensity);
            imgData.data[idx + 1] = Math.min(255, 197 * intensity);
            imgData.data[idx + 2] = Math.min(255, 94 * intensity);
          }
          imgData.data[idx + 3] = 255;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, [selectedBiome, seed, frequency, octaves, seaLevel, mountainPeak]);

  const handleRandomizeSeed = () => {
    soundSynth?.playUiClick?.();
    setSeed(Math.floor(Math.random() * 999999));
    showToast('Randomized generator seed');
  };

  const handleSelectBiome = (b: BiomePreset) => {
    soundSynth?.playSelectSound?.();
    setSelectedBiome(b);
    setFrequency(b.defaultFrequency);
    setSeaLevel(b.defaultSeaLevel);
    showToast(`Biome: ${b.name}`);
  };

  const handleBakeToActiveMap = () => {
    soundSynth?.playActionSound?.();
    if (!activeMapData) {
      showToast('No active map loaded to bake into');
      return;
    }

    const mapH = activeMapData.height;
    const mapW = activeMapData.width;
    const paintedCells: Array<{ r: number; c: number; before: number; after: number; layerIdx: number }> = [];

    // Synthesize tiles across map grid
    for (let r = 0; r < mapH; r++) {
      for (let c = 0; c < mapW; c++) {
        const height = sampleNoise(c, r, frequency, octaves, seed);
        let tileId = 17; // Default solid ground

        if (height * 31 < seaLevel) {
          tileId = 25; // Water
        } else if (height * 31 > mountainPeak) {
          tileId = 19; // Granite / Stone
        } else {
          tileId = selectedBiome.baseMaterialId === 4 ? 20 : selectedBiome.baseMaterialId === 5 ? 21 : 17;
        }

        const prev = activeMapData.grid?.[r]?.[c] ?? 17;
        paintedCells.push({
          r,
          c,
          before: prev,
          after: tileId,
          layerIdx: 0,
        });
      }
    }

    pushPaintOp(paintedCells);
    markMapDirty();
    showToast(`Broke & synthesized procedural terrain across ${mapW}×${mapH} volume!`);
  };

  const [isSavingRules, setIsSavingRules] = useState(false);

  const handleSaveRulesToRegion = async () => {
    soundSynth?.playActionSound?.();
    const mapId = activeMapData?.id;
    if (!mapId) {
      showToast('No active map loaded to attach rules to');
      return;
    }
    setIsSavingRules(true);
    try {
      const config = {
        biome: selectedBiome.id,
        seed,
        frequency,
        octaves,
        seaLevel,
        mountainPeak,
        slopeSolver,
      };
      const res = await fetch(`/api/maps/${encodeURIComponent(mapId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionClass: 'procedural',
          proceduralConfig: config,
        }),
      });
      if (res.ok) {
        showToast(`Saved procedural generation rules to region ${mapId}!`);
        useEditorStore.getState().markMapDirty();
      } else {
        showToast('Failed to save procedural rules to region');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving procedural rules');
    } finally {
      setIsSavingRules(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3 text-foreground/90 font-mono text-xs select-none">
      {/* ── Biome Presets ── */}
      <div>
        <label className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase mb-1.5 block">
          Biome Archetype
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {BIOME_PRESETS.map((b) => {
            const isSelected = selectedBiome.id === b.id;
            return (
              <button
                key={b.id}
                onClick={() => handleSelectBiome(b)}
                className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary/20 border-primary text-foreground shadow-sm'
                    : 'bg-black/30 border-border/40 text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0 shadow"
                  style={{ backgroundColor: b.color }}
                />
                <span className="truncate font-bold text-[10px]">{b.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Live Heightmap Canvas Preview ── */}
      <div className="flex items-center gap-3 p-2.5 rounded-xl border border-border/40 bg-black/30">
        <div className="w-24 h-24 rounded-lg overflow-hidden border border-border/60 bg-black shrink-0 relative shadow-inner">
          <canvas ref={canvasRef} width={64} height={64} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <span className="font-bold text-[11px] text-primary block">Live Terrain Synthesis</span>
          <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
            {selectedBiome.blurb}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[9px] text-muted-foreground font-mono">Seed: {seed}</span>
            <button
              onClick={handleRandomizeSeed}
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-border/40 text-[10px] flex items-center gap-1 cursor-pointer"
            >
              <Dice5 className="w-3 h-3 text-primary" />
              <span>Reroll</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Synthesis Parameters ── */}
      <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {/* Frequency */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">
              Feature Scale (Frequency)
            </span>
            <span className="text-primary font-bold text-[10px]">{frequency.toFixed(3)}</span>
          </div>
          <input
            type="range"
            min={0.01}
            max={0.15}
            step={0.005}
            value={frequency}
            onChange={(e) => setFrequency(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Octaves */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">
              Fractal Octaves (Detail)
            </span>
            <span className="text-primary font-bold text-[10px]">{octaves} passes</span>
          </div>
          <input
            type="range"
            min={1}
            max={6}
            step={1}
            value={octaves}
            onChange={(e) => setOctaves(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Sea Level */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">
              Sea Level Fluid Depth
            </span>
            <span className="text-primary font-bold text-[10px]">Y = {seaLevel}</span>
          </div>
          <input
            type="range"
            min={0}
            max={15}
            step={1}
            value={seaLevel}
            onChange={(e) => setSeaLevel(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Mountain Peak */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">
              Peak Ridge Altitude
            </span>
            <span className="text-primary font-bold text-[10px]">Y = {mountainPeak}</span>
          </div>
          <input
            type="range"
            min={15}
            max={31}
            step={1}
            value={mountainPeak}
            onChange={(e) => setMountainPeak(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Slope Solver Toggle */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-muted-foreground uppercase font-bold">
            Slope Ramp Auto-Solver
          </span>
          <button
            onClick={() => setSlopeSolver(!slopeSolver)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
              slopeSolver
                ? 'bg-primary/20 text-primary border-primary/40'
                : 'bg-white/5 text-muted-foreground border-border/40'
            }`}
          >
            {slopeSolver ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      {/* ── Bottom Actions ── */}
      <div className="pt-2 border-t border-border/30 flex items-center gap-2 shrink-0">
        <button
          onClick={handleBakeToActiveMap}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary font-bold text-[11px] transition-colors cursor-pointer shadow"
          title="Synthesize and write procedural voxels directly into current map cells"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Bake into Active Map</span>
        </button>

        <button
          onClick={handleSaveRulesToRegion}
          disabled={isSavingRules}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/50 text-purple-300 font-bold text-[11px] transition-colors cursor-pointer shadow disabled:opacity-50"
          title="Save procedural generation parameters to backend region definition"
        >
          <Globe className="w-3.5 h-3.5 text-purple-400" />
          <span>{isSavingRules ? 'Saving Rules...' : 'Save Rules to Region'}</span>
        </button>
      </div>
    </div>
  );
}
