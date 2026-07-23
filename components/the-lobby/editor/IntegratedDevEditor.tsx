'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { 
  Layers, 
  MapPin, 
  Trees, 
  UserCheck, 
  Swords, 
  Save, 
  X, 
  Sliders, 
  Sparkles, 
  Eye, 
  Settings2,
  RefreshCw
} from 'lucide-react';

interface IntegratedDevEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onBrushTileChange?: (tileId: number) => void;
}

type EditorTab = 'maps' | 'spawns' | 'encounters' | 'npcs' | 'battles';

export const IntegratedDevEditor: React.FC<IntegratedDevEditorProps> = ({ isOpen, onClose, onBrushTileChange }) => {
  const [activeTab, setActiveTab] = useState<EditorTab>('maps');
  const player = useGameStore((state) => state.player);
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const showToast = useGameStore((state) => state.showToast);

  // Editor State Controls
  const [brushTileId, setBrushTileId] = useState<number>(1);
  const [spawnX, setSpawnX] = useState<number>(player.position?.x || 10);
  const [spawnY, setSpawnY] = useState<number>(player.position?.y || 10);
  const [respawnX, setRespawnX] = useState<number>(10);
  const [respawnY, setRespawnY] = useState<number>(10);

  // Encounter Configuration State
  const [encounterRate, setEncounterRate] = useState<number>(15); // 15% chance per step in grass
  const [minLevel, setMinLevel] = useState<number>(2);
  const [maxLevel, setMaxLevel] = useState<number>(5);
  const [selectedSpecies, setSelectedSpecies] = useState<string>('ignis');

  // Battle Parameters State
  const [battleBackground, setBattleBackground] = useState<string>('forest_field');
  const [weatherEffect, setWeatherEffect] = useState<string>('clear');
  const [aiDifficulty, setAiDifficulty] = useState<string>('normal');

  // NPC Configuration State
  const [npcName, setNpcName] = useState<string>('Keeper Alex');
  const [npcSprite, setNpcSprite] = useState<string>('/assets/sprites/npc_old_man.png');
  const [npcDialogue, setNpcDialogue] = useState<string>('Welcome to the animist grounds, Tamer!');

  // Listen for Ctrl+E hotkey toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSaveConfig = async () => {
    try {
      // Live update player spawn in state
      setPlayerPosition({ x: spawnX, y: spawnY });
      showToast('Dev Editor Configuration Saved!');
    } catch {
      showToast('Error saving configuration.');
    }
  };

  return (
    <div className="fixed inset-y-4 right-4 z-50 w-[440px] bg-[#0c0d14]/95 border border-cyan-500/30 rounded-xl shadow-2xl backdrop-blur-xl flex flex-col text-slate-200 overflow-hidden font-sans">
      
      {/* Editor Header Bar */}
      <div className="px-4 py-3 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-indigo-950/80 border-b border-cyan-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-cyan-400 animate-pulse" />
          <span className="font-bold text-sm tracking-wide text-white uppercase font-mono">
            Integrated Dev Editor
          </span>
          <span className="px-1.5 py-0.5 text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded font-mono">
            v2.0.6
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Close Editor (Ctrl+E)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Editor Tab Navigation */}
      <div className="grid grid-cols-5 bg-black/40 border-b border-white/10 text-xs font-medium">
        <button
          onClick={() => setActiveTab('maps')}
          className={`py-2.5 flex flex-col items-center gap-1 border-b-2 transition-all ${
            activeTab === 'maps'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Tiles</span>
        </button>

        <button
          onClick={() => setActiveTab('spawns')}
          className={`py-2.5 flex flex-col items-center gap-1 border-b-2 transition-all ${
            activeTab === 'spawns'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Spawns</span>
        </button>

        <button
          onClick={() => setActiveTab('encounters')}
          className={`py-2.5 flex flex-col items-center gap-1 border-b-2 transition-all ${
            activeTab === 'encounters'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Trees className="w-4 h-4" />
          <span>Grass</span>
        </button>

        <button
          onClick={() => setActiveTab('npcs')}
          className={`py-2.5 flex flex-col items-center gap-1 border-b-2 transition-all ${
            activeTab === 'npcs'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>NPCs</span>
        </button>

        <button
          onClick={() => setActiveTab('battles')}
          className={`py-2.5 flex flex-col items-center gap-1 border-b-2 transition-all ${
            activeTab === 'battles'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Swords className="w-4 h-4" />
          <span>Battle</span>
        </button>
      </div>

      {/* Editor Content Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
        
        {/* Tab 1: Maps & Tiles */}
        {activeTab === 'maps' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-900/60 border border-white/10 rounded-lg">
              <h4 className="font-semibold text-cyan-400 mb-2 flex items-center gap-1.5">
                <Layers className="w-4 h-4" /> 2.5D Tile Palette & Layer Brush
              </h4>
              <p className="text-slate-400 mb-3">Select active tile ID for overworld painting.</p>
              
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 1, label: 'Grass', color: 'bg-emerald-900 border-emerald-500' },
                  { id: 2, label: 'Dirt Path', color: 'bg-amber-900 border-amber-500' },
                  { id: 3, label: 'Tall Grass', color: 'bg-green-700 border-green-400' },
                  { id: 4, label: 'Water', color: 'bg-cyan-900 border-cyan-400' },
                  { id: 5, label: 'Rock Wall', color: 'bg-slate-700 border-slate-400' },
                  { id: 6, label: 'Wood Floor', color: 'bg-amber-950 border-amber-600' },
                  { id: 7, label: 'Cobblestone', color: 'bg-stone-800 border-stone-400' },
                  { id: 8, label: 'Sand', color: 'bg-yellow-900 border-yellow-500' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setBrushTileId(t.id);
                      onBrushTileChange?.(t.id);
                    }}
                    className={`p-2 rounded border text-center font-mono flex flex-col items-center gap-1 transition-all ${t.color} ${
                      brushTileId === t.id ? 'ring-2 ring-cyan-400 scale-105' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className="font-bold text-[10px]">ID #{t.id}</span>
                    <span className="text-[11px] truncate w-full">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Player & Spawns */}
        {activeTab === 'spawns' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-900/60 border border-white/10 rounded-lg space-y-3">
              <h4 className="font-semibold text-cyan-400 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> World Spawn & Respawn Coordinates
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Player Spawn X</label>
                  <input
                    type="number"
                    value={spawnX}
                    onChange={(e) => setSpawnX(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-black/60 border border-white/10 rounded font-mono text-cyan-300"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Player Spawn Y</label>
                  <input
                    type="number"
                    value={spawnY}
                    onChange={(e) => setSpawnY(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-black/60 border border-white/10 rounded font-mono text-cyan-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                <div>
                  <label className="block text-slate-400 mb-1">Respawn Point X</label>
                  <input
                    type="number"
                    value={respawnX}
                    onChange={(e) => setRespawnX(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-black/60 border border-white/10 rounded font-mono text-amber-300"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Respawn Point Y</label>
                  <input
                    type="number"
                    value={respawnY}
                    onChange={(e) => setRespawnY(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-black/60 border border-white/10 rounded font-mono text-amber-300"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Tall Grass & Wild Encounters */}
        {activeTab === 'encounters' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-900/60 border border-white/10 rounded-lg space-y-3">
              <h4 className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <Trees className="w-4 h-4" /> Wild Encounter Zone Configuration
              </h4>

              <div>
                <label className="block text-slate-400 mb-1">Step Encounter Chance ({encounterRate}%)</label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={encounterRate}
                  onChange={(e) => setEncounterRate(Number(e.target.value))}
                  className="w-full accent-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Min Wild Level</label>
                  <input
                    type="number"
                    value={minLevel}
                    onChange={(e) => setMinLevel(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-black/60 border border-white/10 rounded font-mono text-emerald-300"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Max Wild Level</label>
                  <input
                    type="number"
                    value={maxLevel}
                    onChange={(e) => setMaxLevel(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-black/60 border border-white/10 rounded font-mono text-emerald-300"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: NPCs & Trainers */}
        {activeTab === 'npcs' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-900/60 border border-white/10 rounded-lg space-y-3">
              <h4 className="font-semibold text-purple-400 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" /> Overworld NPC & Trainer Setter
              </h4>

              <div>
                <label className="block text-slate-400 mb-1">NPC Name</label>
                <input
                  type="text"
                  value={npcName}
                  onChange={(e) => setNpcName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-black/60 border border-white/10 rounded text-purple-300"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Dialogue Prompt</label>
                <textarea
                  rows={2}
                  value={npcDialogue}
                  onChange={(e) => setNpcDialogue(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-black/60 border border-white/10 rounded text-slate-200"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Battle Parameters */}
        {activeTab === 'battles' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-900/60 border border-white/10 rounded-lg space-y-3">
              <h4 className="font-semibold text-amber-400 flex items-center gap-1.5">
                <Swords className="w-4 h-4" /> Battle Scene & AI Parameters
              </h4>

              <div>
                <label className="block text-slate-400 mb-1">Weather Environment</label>
                <select
                  value={weatherEffect}
                  onChange={(e) => setWeatherEffect(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-black/60 border border-white/10 rounded text-amber-300 font-mono"
                >
                  <option value="clear">Clear Weather</option>
                  <option value="rain">Heavy Rain (Hydro +20%)</option>
                  <option value="sun">Harsh Sunlight (Solar +20%)</option>
                  <option value="sandstorm">Sandstorm (Geo Damage)</option>
                  <option value="fog">Thick Fog (Evasion Boost)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Trainer AI Difficulty</label>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-black/60 border border-white/10 rounded text-amber-300 font-mono"
                >
                  <option value="easy">Casual (Random Moves)</option>
                  <option value="normal">Standard (Type Matching)</option>
                  <option value="tactical">Tactical (Switching & Statuses)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Editor Footer / Action Bar */}
      <div className="p-3 bg-slate-950 border-t border-white/10 flex items-center justify-between gap-2">
        <button
          onClick={handleSaveConfig}
          className="flex-1 py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-950/50 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>Save Configuration</span>
        </button>
      </div>
    </div>
  );
};

export default IntegratedDevEditor;
