'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';
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
import { Sliders, Mountain, Layers, Eye, RefreshCw, Check, Sparkles, Plus, Trash2, TreePine, Save } from 'lucide-react';
import { listBiomes, upsertBiome, listFoliageDefs, upsertBiomeFoliage, deleteBiomeFoliage } from '@/app/actions/studio/environment';

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
  
  const [biomes, setBiomes] = useState<any[]>([]);
  const [foliageDefs, setFoliageDefs] = useState<any[]>([]);
  const [selectedBiomeId, setSelectedBiomeId] = useState<string>('');
  const [activeBiome, setActiveBiome] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState<'terrain' | 'climate' | 'foliage'>('terrain');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fetchAll = async () => {
    const [biomeRes, folRes] = await Promise.all([
      listBiomes(),
      listFoliageDefs()
    ]);
    if (biomeRes.success && biomeRes.data) setBiomes(biomeRes.data);
    if (folRes.success && folRes.data) setFoliageDefs(folRes.data);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSelectBiome = (id: string) => {
    if (id === 'new') {
      const newBiome = {
        id: '',
        name: 'New Custom Biome',
        slug: 'new_custom_biome',
        seed: 12345,
        baseHeight: 12,
        amplitude: 8,
        frequency: 0.02,
        octaves: 3,
        surfaceMaterial: VOXEL_MAT_GRASS,
        subsurfaceMaterial: VOXEL_MAT_DIRT,
        subsurfaceDepth: 3,
        mantleMaterial: VOXEL_MAT_STONE,
        bedrockMaterial: VOXEL_MAT_GUNMETAL,
        temperature: 0.5,
        moisture: 0.5,
        colorHex: '#348C31',
        skyColorHex: '#050b14',
        ambientColorHex: '#ffffff',
        foliageItems: []
      };
      setActiveBiome(newBiome);
      setSelectedBiomeId('new');
    } else {
      setSelectedBiomeId(id);
      const b = biomes.find(x => x.id === id);
      if (b) setActiveBiome(JSON.parse(JSON.stringify(b)));
    }
  };

  const handleChange = (key: string, val: any) => {
    setActiveBiome((prev: any) => ({ ...prev, [key]: val }));
  };

  const handleSaveBiome = async () => {
    if (!activeBiome) return;
    const res = await upsertBiome(activeBiome);
    if (res.success && res.data) {
      showToast(`Saved Biome: ${res.data.name}`);
      await fetchAll();
      if (selectedBiomeId === 'new') {
        handleSelectBiome(res.data.id);
      }
    } else {
      showToast(`Error: ${res.error}`);
    }
  };

  const handleAddFoliage = async (foliageId: string) => {
    if (!activeBiome || !activeBiome.id) {
      showToast('Please save the biome first before adding foliage.');
      return;
    }
    const res = await upsertBiomeFoliage({
      biomeId: activeBiome.id,
      foliageId,
      spawnWeight: 10
    });
    if (res.success) {
      showToast('Foliage added to biome.');
      await fetchAll();
      handleSelectBiome(activeBiome.id);
    } else {
      showToast('Error: ' + res.error);
    }
  };

  const handleUpdateFoliageWeight = async (bfId: string, biomeId: string, foliageId: string, weight: number) => {
    const res = await upsertBiomeFoliage({ id: bfId, biomeId, foliageId, spawnWeight: weight });
    if (res.success) {
      await fetchAll();
      handleSelectBiome(biomeId);
    }
  };

  const handleRemoveFoliage = async (bfId: string) => {
    const res = await deleteBiomeFoliage(bfId);
    if (res.success) {
      showToast('Foliage removed from biome.');
      await fetchAll();
      if (activeBiome?.id) handleSelectBiome(activeBiome.id);
    } else {
      showToast('Error: ' + res.error);
    }
  };

  // Render 2D cross-section strata preview
  useEffect(() => {
    if (activeTab !== 'terrain' || !activeBiome) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Dark sky background
    ctx.fillStyle = activeBiome.skyColorHex || '#050b14';
    ctx.fillRect(0, 0, width, height);

    const terrainConfig = {
      baseHeight: activeBiome.baseHeight,
      amplitude: activeBiome.amplitude,
      frequency: activeBiome.frequency,
      octaves: activeBiome.octaves,
      persistence: activeBiome.persistence || 0.5,
      lacunarity: activeBiome.lacunarity || 2.0
    };
    const noise = new SimplexNoise2D(activeBiome.seed);
    const cols = width;
    const maxWorldH = 32;

    const getMaterialColor = (matId: number) => {
      const opt = MATERIAL_OPTIONS.find((m) => m.id === matId);
      return opt ? opt.color : '#64748b';
    };

    const surfaceColor = getMaterialColor(activeBiome.surfaceMaterial);
    const subColor = getMaterialColor(activeBiome.subsurfaceMaterial);
    const mantleColor = getMaterialColor(activeBiome.mantleMaterial);
    const bedrockColor = getMaterialColor(activeBiome.bedrockMaterial);

    for (let x = 0; x < cols; x++) {
      const worldX = x * 0.5;
      const offset = noise.fBm(worldX, 0, terrainConfig);
      const surfaceY = Math.round(activeBiome.baseHeight + offset);
      const clampedY = Math.max(1, Math.min(31, surfaceY));

      const pxY = height - (clampedY / maxWorldH) * height;

      for (let wy = clampedY; wy >= 0; wy--) {
        const depth = clampedY - wy;
        const colY = height - (wy / maxWorldH) * height;
        const cellH = height / maxWorldH;

        if (wy === 0) {
          ctx.fillStyle = bedrockColor;
        } else if (depth === 0) {
          ctx.fillStyle = surfaceColor;
        } else if (depth <= activeBiome.subsurfaceDepth) {
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
  }, [activeBiome, activeTab]);

  return (
    <div className="flex flex-col h-full bg-[#050b14] text-gray-200 text-xs overflow-y-auto font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 p-3">
        <div className="flex items-center gap-2">
          <Mountain className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-sm text-foreground">Biome Configurator</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedBiomeId}
            onChange={(e) => handleSelectBiome(e.target.value)}
            className="bg-card/70 border border-border/60 rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
          >
            <option value="" disabled>Select Biome...</option>
            {biomes.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
            <option value="new">+ Create New Biome</option>
          </select>
          {activeBiome && (
            <button
              onClick={handleSaveBiome}
              className="flex items-center gap-1.5 px-3 py-1 bg-primary text-primary-foreground font-medium rounded hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          )}
        </div>
      </div>

      {activeBiome ? (
        <div className="flex flex-col flex-1">
          {/* Tabs */}
          <div className="flex border-b border-border/40 px-3 gap-4">
            <button
              className={`py-2 border-b-2 font-medium ${activeTab === 'terrain' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('terrain')}
            >
              <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Terrain & Strata</span>
            </button>
            <button
              className={`py-2 border-b-2 font-medium ${activeTab === 'climate' ? 'border-amber-400 text-amber-400' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('climate')}
            >
              <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Climate & Environment</span>
            </button>
            <button
              className={`py-2 border-b-2 font-medium ${activeTab === 'foliage' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('foliage')}
            >
              <span className="flex items-center gap-1.5"><TreePine className="w-3.5 h-3.5" /> Biome Foliage</span>
            </button>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1 uppercase">Biome Name</label>
                <input
                  type="text"
                  value={activeBiome.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full bg-card/60 border border-border/50 rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1 uppercase">Internal Slug</label>
                <input
                  type="text"
                  value={activeBiome.slug}
                  onChange={(e) => handleChange('slug', e.target.value)}
                  className="w-full bg-card/60 border border-border/50 rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:border-primary font-mono"
                />
              </div>
            </div>

            {activeTab === 'terrain' && (
              <>
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
                        <span className="font-mono text-foreground">{activeBiome.baseHeight}m</span>
                      </div>
                      <input
                        type="range" min="4" max="28" step="1"
                        value={activeBiome.baseHeight}
                        onChange={(e) => handleChange('baseHeight', Number(e.target.value))}
                        className="w-full accent-primary h-1.5 bg-card/60 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Amplitude (Height Swing)</span>
                        <span className="font-mono text-foreground">±{activeBiome.amplitude}m</span>
                      </div>
                      <input
                        type="range" min="1" max="16" step="1"
                        value={activeBiome.amplitude}
                        onChange={(e) => handleChange('amplitude', Number(e.target.value))}
                        className="w-full accent-primary h-1.5 bg-card/60 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Frequency</span>
                        <span className="font-mono text-foreground">{Number(activeBiome.frequency).toFixed(3)}</span>
                      </div>
                      <input
                        type="range" min="0.005" max="0.06" step="0.002"
                        value={activeBiome.frequency}
                        onChange={(e) => handleChange('frequency', Number(e.target.value))}
                        className="w-full accent-primary h-1.5 bg-card/60 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Octaves</span>
                        <span className="font-mono text-foreground">{activeBiome.octaves}</span>
                      </div>
                      <input
                        type="range" min="1" max="6" step="1"
                        value={activeBiome.octaves}
                        onChange={(e) => handleChange('octaves', Number(e.target.value))}
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
                        value={activeBiome.surfaceMaterial}
                        onChange={(e) => handleChange('surfaceMaterial', Number(e.target.value))}
                        className="w-full bg-card/70 border border-border/60 rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                      >
                        {MATERIAL_OPTIONS.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-foreground mb-1">Subsurface Layer</label>
                      <select
                        value={activeBiome.subsurfaceMaterial}
                        onChange={(e) => handleChange('subsurfaceMaterial', Number(e.target.value))}
                        className="w-full bg-card/70 border border-border/60 rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                      >
                        {MATERIAL_OPTIONS.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-foreground mb-1">Subsurface Depth (Blocks)</label>
                      <input
                        type="number" min="1" max="8"
                        value={activeBiome.subsurfaceDepth}
                        onChange={(e) => handleChange('subsurfaceDepth', Number(e.target.value))}
                        className="w-full bg-card/70 border border-border/60 rounded px-2 py-1 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-foreground mb-1">Mantle Geological Layer</label>
                      <select
                        value={activeBiome.mantleMaterial}
                        onChange={(e) => handleChange('mantleMaterial', Number(e.target.value))}
                        className="w-full bg-card/70 border border-border/60 rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                      >
                        {MATERIAL_OPTIONS.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'climate' && (
              <div className="space-y-4">
                <div className="space-y-3 bg-card/40 border border-border/40 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 font-medium text-foreground text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Atmospheric Conditions</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Temperature</span>
                        <span className="font-mono text-foreground">{Number(activeBiome.temperature).toFixed(2)}</span>
                      </div>
                      <input
                        type="range" min="0" max="1" step="0.01"
                        value={activeBiome.temperature || 0}
                        onChange={(e) => handleChange('temperature', Number(e.target.value))}
                        className="w-full accent-amber-500 h-1.5 bg-card/60 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Moisture</span>
                        <span className="font-mono text-foreground">{Number(activeBiome.moisture).toFixed(2)}</span>
                      </div>
                      <input
                        type="range" min="0" max="1" step="0.01"
                        value={activeBiome.moisture || 0}
                        onChange={(e) => handleChange('moisture', Number(e.target.value))}
                        className="w-full accent-blue-500 h-1.5 bg-card/60 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-card/40 border border-border/40 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 font-medium text-foreground text-[11px]">
                    <Eye className="w-3.5 h-3.5 text-pink-400" />
                    <span>Colors & Lighting</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-muted-foreground mb-1">Biome 2D Map Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={activeBiome.colorHex || '#348C31'}
                          onChange={(e) => handleChange('colorHex', e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                        />
                        <span className="font-mono text-xs">{activeBiome.colorHex || '#348C31'}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-foreground mb-1">Sky Zenith Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={activeBiome.skyColorHex || '#050b14'}
                          onChange={(e) => handleChange('skyColorHex', e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                        />
                        <span className="font-mono text-xs">{activeBiome.skyColorHex || '#050b14'}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-foreground mb-1">Ambient Fog/Light Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={activeBiome.ambientColorHex || '#ffffff'}
                          onChange={(e) => handleChange('ambientColorHex', e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                        />
                        <span className="font-mono text-xs">{activeBiome.ambientColorHex || '#ffffff'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'foliage' && (
              <div className="space-y-4">
                <div className="bg-card/40 border border-border/40 rounded-lg p-3">
                  <h4 className="font-medium text-foreground flex items-center gap-1.5 mb-2">
                    <TreePine className="w-3.5 h-3.5 text-emerald-400" />
                    Spawnable Foliage
                  </h4>
                  {(!activeBiome.foliageItems || activeBiome.foliageItems.length === 0) ? (
                    <div className="text-muted-foreground/50 text-center py-4">No foliage attached to this biome.</div>
                  ) : (
                    <div className="space-y-2">
                      {activeBiome.foliageItems.map((bf: any) => (
                        <div key={bf.id} className="flex items-center gap-3 bg-black/20 p-2 rounded border border-border/30">
                          <div className="flex-1">
                            <div className="font-medium">{bf.foliage?.name}</div>
                            <div className="text-[10px] text-muted-foreground">{bf.foliage?.category}</div>
                          </div>
                          <div>
                            <label className="block text-[10px] text-muted-foreground mb-0.5">Spawn Weight</label>
                            <input
                              type="number"
                              className="w-16 bg-card/60 border border-border/50 rounded px-1.5 py-0.5 text-foreground font-mono"
                              value={bf.spawnWeight}
                              onChange={(e) => handleUpdateFoliageWeight(bf.id, activeBiome.id, bf.foliageId, parseInt(e.target.value))}
                            />
                          </div>
                          <button onClick={() => handleRemoveFoliage(bf.id)} className="p-1.5 text-red-400 hover:bg-red-900/40 rounded ml-2">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-card/40 border border-border/40 rounded-lg p-3">
                  <h4 className="font-medium text-foreground mb-2">Add Foliage from Global Library</h4>
                  <div className="flex gap-2">
                    <select
                      id="newFoliageSelector"
                      className="flex-1 bg-card/70 border border-border/60 rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                    >
                      {foliageDefs.filter(fd => !activeBiome.foliageItems?.find((b: any) => b.foliageId === fd.id)).map(fd => (
                        <option key={fd.id} value={fd.id}>{fd.name} ({fd.category})</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const sel = document.getElementById('newFoliageSelector') as HTMLSelectElement;
                        if (sel && sel.value) handleAddFoliage(sel.value);
                      }}
                      className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 border border-emerald-500/30 rounded font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add to Biome
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground/50">
          Select a biome to configure, or create a new one.
        </div>
      )}
    </div>
  );
};
