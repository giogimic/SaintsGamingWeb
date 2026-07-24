'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { searchMapIndex, registerNewMap } from '../data/map-index';
import { GAME_MAPS } from '../data/maps';
import { TUXEMON_SPRITES } from '../data/sprites';
import { TUXEMON_MONSTERS } from '../data/monsters';
import { TUXEMON_ITEMS } from '../data/items';

import { 
  Layers, 
  MapPin, 
  Trees, 
  UserCheck, 
  Swords, 
  Save, 
  X, 
  Sliders,
  BookOpen,
  Compass,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  UserPlus
} from 'lucide-react';

interface IntegratedDevEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onBrushTileChange?: (tileId: number) => void;
}

type EditorTab = 'maps' | 'spawns' | 'encounters' | 'npcs' | 'battles' | 'quests' | 'chars' | 'index' | 'assets';

export const IntegratedDevEditor: React.FC<IntegratedDevEditorProps> = ({ isOpen, onClose, onBrushTileChange }) => {
  const [activeTab, setActiveTab] = useState<EditorTab>('maps');
  const player = useGameStore((state) => state.player);
  const currentMapId = useGameStore((state) => state.currentMapId);
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const showToast = useGameStore((state) => state.showToast);

  // Map Search & Index State
  const [mapSearchQuery, setMapSearchQuery] = useState<string>('');
  const [isCreatingNewMap, setIsCreatingNewMap] = useState<boolean>(false);
  const [newMapSlug, setNewMapSlug] = useState<string>('');
  const [newMapName, setNewMapName] = useState<string>('');
  const [newMapWidth, setNewMapWidth] = useState<number>(24);
  const [newMapHeight, setNewMapHeight] = useState<number>(24);

  const mapIndex = searchMapIndex(mapSearchQuery);

  // Character & Sprite Customizer State
  const [charNameInput, setCharNameInput] = useState<string>(player.name || 'Hero');
  const [charClassInput, setCharClassInput] = useState<string>((player as any).animistClass || 'Animist');
  const [charSpriteInput, setCharSpriteInput] = useState<string>(player.spriteId || 'player');

  // Active Map Reference
  const currentMapData = GAME_MAPS[currentMapId] || {
    id: currentMapId,
    name: currentMapId,
    grid: Array(24).fill(0).map(() => Array(24).fill(0)),
    gates: {}
  };

  // Editor State Controls
  const [brushTileId, setBrushTileId] = useState<number>(1);
  const [spawnX, setSpawnX] = useState<number>(player.position?.x || 10);
  const [spawnY, setSpawnY] = useState<number>(player.position?.y || 10);
  const [respawnX, _setRespawnX] = useState<number>(10);
  const [respawnY, _setRespawnY] = useState<number>(10);

  // Encounter Configuration State
  const [_encounterRate, _setEncounterRate] = useState<number>(15);
  const [minLevel, setMinLevel] = useState<number>(2);
  const [maxLevel, setMaxLevel] = useState<number>(5);
  const [selectedSpecies, setSelectedSpecies] = useState<string>('ignis');
  const [encounterPool, setEncounterPool] = useState<Array<{ speciesId: string; minLevel: number; maxLevel: number; weight: number }>>(
    currentMapData.encounterPool || [
      { speciesId: 'ignis', minLevel: 2, maxLevel: 5, weight: 60 },
      { speciesId: 'aqua_fox', minLevel: 3, maxLevel: 6, weight: 40 }
    ]
  );

  // Battle Parameters State
  const [battleBackground, setBattleBackground] = useState<string>('forest_field');
  const [_weatherEffect, _setWeatherEffect] = useState<string>('clear');
  const [_aiDifficulty, _setAiDifficulty] = useState<string>('normal');

  // NPC Configuration State
  const [npcName, setNpcName] = useState<string>('Keeper Alex');
  const [npcSprite, setNpcSprite] = useState<string>('/tuxemon-assets/npc/heroine.png');
  const [npcDialogue, setNpcDialogue] = useState<string>('Welcome to the animist grounds, Tamer!');
  const [mapNpcs, setMapNpcs] = useState<Array<{ id: string; name: string; x: number; y: number; sprite: string; dialogueKey: string }>>(
    currentMapData.npcs || []
  );

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

  const handleWarpToMap = (targetMapId: string) => {
    useGameStore.setState({ currentMapId: targetMapId });
    const targetMap = GAME_MAPS[targetMapId];
    if (targetMap) {
      setMapNpcs(targetMap.npcs || []);
      setEncounterPool(targetMap.encounterPool || []);
    }
    setMapSearchQuery('');
    showToast(`Warped to map: ${targetMapId}`);
  };

  const handleCreateNewMapSubmit = () => {
    if (!newMapSlug) {
      showToast('Please enter a valid Map ID slug!');
      return;
    }

    const cleanSlug = newMapSlug.toUpperCase().replace(/\s+/g, '_');
    const newGrid = Array(newMapHeight).fill(0).map((_, r) =>
      Array(newMapWidth).fill(0).map((_, c) =>
        (r === 0 || r === newMapHeight - 1 || c === 0 || c === newMapWidth - 1) ? 1 : 0
      )
    );

    const newMapData = {
      id: cleanSlug,
      name: newMapName || cleanSlug,
      grid: newGrid,
      gates: {},
      npcs: [],
      encounterPool: []
    };

    registerNewMap(newMapData);
    useGameStore.setState({ currentMapId: cleanSlug });
    setIsCreatingNewMap(false);
    showToast(`Created & Warped to new map: ${cleanSlug}`);
  };

  const handleExportMapJson = () => {
    const jsonStr = JSON.stringify(currentMapData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentMapId}_map.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${currentMapId}_map.json`);
  };

  const handleImportMapJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.id && imported.grid) {
          registerNewMap(imported);
          useGameStore.setState({ currentMapId: imported.id });
          showToast(`Imported & Loaded map: ${imported.id}`);
        }
      } catch {
        showToast('Invalid Map JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleApplyCharacterConfig = () => {
    useGameStore.setState((state) => ({
      player: {
        ...state.player,
        name: charNameInput,
        animistClass: charClassInput as any,
        spriteId: charSpriteInput
      }
    }));
    showToast(`Loaded Character: ${charNameInput} [${charClassInput}]`);
  };

  const handleBrushSelect = (tileId: number) => {
    setBrushTileId(tileId);
    if (onBrushTileChange) onBrushTileChange(tileId);
  };

  const handleFillGrid = () => {
    if (!currentMapData.grid) return;
    for (let r = 0; r < currentMapData.grid.length; r++) {
      for (let c = 0; c < (currentMapData.grid[r]?.length || 0); c++) {
        currentMapData.grid[r][c] = brushTileId;
      }
    }
    showToast(`Filled map grid with Tile ID ${brushTileId}`);
  };

  const handleAddEncounterSpecies = () => {
    setEncounterPool([...encounterPool, { speciesId: selectedSpecies, minLevel, maxLevel, weight: 30 }]);
    showToast(`Added ${selectedSpecies} to encounter pool`);
  };

  const handleRemoveEncounterSpecies = (index: number) => {
    setEncounterPool(encounterPool.filter((_, i) => i !== index));
  };

  const handleAddNpc = () => {
    const newNpc = {
      id: `npc_${Date.now()}`,
      name: npcName,
      x: spawnX,
      y: spawnY,
      sprite: npcSprite,
      dialogueKey: npcDialogue
    };
    setMapNpcs([...mapNpcs, newNpc]);
    
    // Also inject instantly into live 2.5D loop
    useGameStore.setState((state) => ({
      mapEntities: [
        ...(state.mapEntities || []),
        {
          id: newNpc.id,
          type: 'NPC',
          spriteKey: npcSprite,
          position: { x: spawnX, y: spawnY },
          isMoving: false,
          facing: 'DOWN',
          mapId: currentMapId,
          name: npcName,
          dialogueKey: npcDialogue
        }
      ]
    }));
    
    showToast(`Placed ${npcName} at (${spawnX}, ${spawnY})`);
  };

  const handleSaveConfig = async () => {
    try {
      setPlayerPosition({ x: spawnX, y: spawnY });
      currentMapData.npcs = mapNpcs;
      currentMapData.encounterPool = encounterPool;

      await fetch(`/api/maps/${currentMapId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grid: currentMapData.grid,
          npcs: mapNpcs,
          encounterPool: encounterPool,
          spawnPoint: { x: spawnX, y: spawnY },
          respawnPoint: { x: respawnX, y: respawnY }
        })
      });

      showToast(`Dev Editor Configuration Saved for ${currentMapId}!`);
    } catch {
      showToast('Configuration saved locally!');
    }
  };

  return (
    <div className="fixed inset-y-4 right-4 z-50 w-[480px] sg-glass bg-slate-950/80 border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col text-slate-200 overflow-hidden font-sans">
      
      {/* Editor Header Bar */}
      <div className="px-4 py-3 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-indigo-950/80 border-b border-cyan-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-cyan-400 animate-pulse" />
          <span className="font-bold text-sm tracking-wide text-white uppercase font-mono">
            Integrated Dev Editor
          </span>
          <span className="px-1.5 py-0.5 text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded font-mono">
            v2.1.7
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

      {/* Map Selector & Teleport Bar */}
      <div className="p-3 bg-slate-950/60 border-b border-white/10 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono text-cyan-400">
          <span className="flex items-center gap-1.5"><Compass className="w-4 h-4 text-cyan-400" /> Active Map:</span>
          <div className="flex items-center gap-1">
            <strong className="text-white bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">{currentMapId}</strong>
            <button
              onClick={() => setIsCreatingNewMap(!isCreatingNewMap)}
              className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow font-mono"
            >
              <Plus className="w-3 h-3" /> New
            </button>
          </div>
        </div>

        {/* Modal form for creating a brand new map */}
        {isCreatingNewMap && (
          <div className="p-3 bg-slate-900 border border-cyan-500/40 rounded space-y-2 text-xs">
            <span className="font-bold text-white block font-mono">Create New Campaign Map</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newMapSlug}
                onChange={(e) => setNewMapSlug(e.target.value)}
                placeholder="ID (e.g. MYSTICAL_GROVE)"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-[11px]"
              />
              <input
                type="text"
                value={newMapName}
                onChange={(e) => setNewMapName(e.target.value)}
                placeholder="Name (e.g. Mystical Grove)"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-[11px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">Width</label>
                <input
                  type="number"
                  value={newMapWidth}
                  onChange={(e) => setNewMapWidth(parseInt(e.target.value) || 24)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Height</label>
                <input
                  type="number"
                  value={newMapHeight}
                  onChange={(e) => setNewMapHeight(parseInt(e.target.value) || 24)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-[11px]"
                />
              </div>
            </div>
            <button
              onClick={handleCreateNewMapSubmit}
              className="w-full py-1 bg-green-600 hover:bg-green-500 text-white rounded font-bold text-xs"
            >
              Generate Map Grid & Teleport
            </button>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={mapSearchQuery}
            onChange={(e) => setMapSearchQuery(e.target.value)}
            placeholder="Search campaign maps to warp..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>
        {mapSearchQuery && (
          <div className="max-h-32 overflow-y-auto bg-slate-900 border border-slate-700 rounded text-xs divide-y divide-slate-800">
            {mapIndex.map((m) => (
              <div
                key={m.id}
                onClick={() => handleWarpToMap(m.id)}
                className="px-3 py-1.5 hover:bg-cyan-950/80 cursor-pointer flex items-center justify-between"
              >
                <span className="font-mono text-white">{m.name}</span>
                <span className="text-[10px] text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded">{m.category}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor Tab Navigation */}
      <div className="flex bg-slate-950/80 border-b border-slate-800/80 p-1 gap-1 text-xs font-medium overflow-x-auto">
        {[
          { id: 'maps', label: 'Tiles', icon: Layers },
          { id: 'index', label: 'Index', icon: Search },
          { id: 'chars', label: 'Heroes', icon: UserPlus },
          { id: 'spawns', label: 'Spawns', icon: MapPin },
          { id: 'encounters', label: 'Grass', icon: Trees },
          { id: 'npcs', label: 'NPCs', icon: UserCheck },
          { id: 'battles', label: 'Battle', icon: Swords },
          { id: 'quests', label: 'Quests', icon: BookOpen },
          { id: 'assets', label: 'Assets', icon: Layers }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as EditorTab)}
              className={`flex-1 min-w-[54px] py-1.5 px-1.5 rounded flex items-center justify-center gap-1 transition-all ${
                isActive 
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-bold shadow' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">

        {/* TAB: MAP INDEX VIEWER */}
        {activeTab === 'index' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
              <span className="font-bold text-slate-300 font-mono text-[11px] uppercase tracking-wide">
                Global Map Index
              </span>
              <p className="text-slate-400 text-[11px]">
                Browse all registered maps in the engine. Teleport directly to them to test collisions and logic.
              </p>
              
              <div className="bg-slate-950 rounded border border-slate-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-slate-800 text-[10px] uppercase text-slate-400">
                      <th className="p-2 font-medium">Name</th>
                      <th className="p-2 font-medium">Category</th>
                      <th className="p-2 font-medium">Size</th>
                      <th className="p-2 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {searchMapIndex('').map((m) => (
                      <tr key={m.id} className="hover:bg-cyan-950/30 transition-colors">
                        <td className="p-2">
                          <div className="font-mono text-cyan-300">{m.name}</div>
                          <div className="text-[9px] text-slate-500">{m.id}</div>
                        </td>
                        <td className="p-2">
                          <span className="text-[10px] text-indigo-300 bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-500/20">
                            {m.category}
                          </span>
                        </td>
                        <td className="p-2 text-slate-400 font-mono text-[10px]">
                          {m.width}x{m.height}
                        </td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => handleWarpToMap(m.id)}
                            className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-bold shadow"
                          >
                            Teleport
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: TILES & TERRAIN */}
        {activeTab === 'maps' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 font-mono text-[11px] uppercase tracking-wide">
                  2.5D Painting Terrain Brush
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={handleExportMapJson}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded text-[10px] font-bold flex items-center gap-1 font-mono"
                    title="Export map JSON"
                  >
                    <Download className="w-3 h-3" /> JSON
                  </button>
                  <label className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded text-[10px] font-bold flex items-center gap-1 font-mono cursor-pointer">
                    <Upload className="w-3 h-3" /> Import
                    <input type="file" accept=".json" onChange={handleImportMapJson} className="hidden" />
                  </label>
                  <button
                    onClick={handleFillGrid}
                    className="px-2 py-1 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 border border-indigo-500/40 rounded text-[10px] font-bold flex items-center gap-1 font-mono"
                    title="Flood fill whole map with active brush tile"
                  >
                    <RefreshCw className="w-3 h-3" /> Fill
                  </button>
                </div>
              </div>
              <p className="text-slate-400 text-[11px]">
                Click any terrain tile below, then click directly on the 2.5D Babylon canvas to paint.
              </p>
              
              <div className="grid grid-cols-4 gap-2 pt-2">
                {[
                  { id: 0, name: 'Safe Grass', color: 'bg-emerald-600' },
                  { id: 1, name: 'Wall / Tree', color: 'bg-slate-700' },
                  { id: 2, name: 'Tall Grass', color: 'bg-green-500' },
                  { id: 4, name: 'Water', color: 'bg-blue-600' },
                  { id: 5, name: 'Wood Tree', color: 'bg-amber-800' },
                  { id: 6, name: 'Ore Rock', color: 'bg-[#8d6e63]' },
                  { id: 7, name: 'Shop Tile', color: 'bg-amber-600' },
                  { id: 8, name: 'Clinic Tile', color: 'bg-cyan-600' }
                ].map((tile) => (
                  <button
                    key={tile.id}
                    onClick={() => handleBrushSelect(tile.id)}
                    className={`p-2 rounded border flex flex-col items-center gap-1 transition-all ${
                      brushTileId === tile.id
                        ? 'border-cyan-400 bg-cyan-950/60 ring-2 ring-cyan-500/40'
                        : 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded ${tile.color}`} />
                    <span className="text-[10px] text-slate-300 font-mono">{tile.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: HEROES & SPRITE CUSTOMIZER */}
        {activeTab === 'chars' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
              <span className="font-bold text-slate-300 block font-mono text-[11px] uppercase tracking-wide">
                Character & Sprite Importer
              </span>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Hero Name</label>
                <input
                  type="text"
                  value={charNameInput}
                  onChange={(e) => setCharNameInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Animist Class</label>
                <select
                  value={charClassInput}
                  onChange={(e) => setCharClassInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono"
                >
                  <option value="Animist">Animist (Spirit Weaver)</option>
                  <option value="Invoker">Invoker (Elemental Surge)</option>
                  <option value="Naturalist">Naturalist (Resource Master)</option>
                  <option value="Tamer">Tamer (Beast Commander)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Sprite Asset Path</label>
                <select
                  value={charSpriteInput}
                  onChange={(e) => setCharSpriteInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono"
                >
                  <option value="player">Default Player Hero (/assets/sprites/)</option>
                  <option disabled>--- Tuxemon NPCS ---</option>
                  {TUXEMON_SPRITES.map(sprite => (
                    <option key={sprite} value={`/tuxemon-assets/npc/${sprite}.png`}>
                      {sprite}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleApplyCharacterConfig}
                className="w-full py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded font-bold text-xs flex items-center justify-center gap-1 shadow"
              >
                <UserPlus className="w-4 h-4" /> Apply Character to 2.5D Hero
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: SPAWNS & WARPS */}
        {activeTab === 'spawns' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
              <span className="font-bold text-slate-300 block font-mono text-[11px] uppercase tracking-wide">
                Player Spawn Coordinates
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Spawn X</label>
                  <input
                    type="number"
                    value={spawnX}
                    onChange={(e) => setSpawnX(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Spawn Y</label>
                  <input
                    type="number"
                    value={spawnY}
                    onChange={(e) => setSpawnY(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TALL GRASS ENCOUNTERS */}
        {activeTab === 'encounters' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-300 font-mono text-[11px] uppercase tracking-wide">
                  Wild Encounter Pool
                </span>
                <button
                  onClick={handleAddEncounterSpecies}
                  className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-[10px] font-bold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Species
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block">Species</label>
                  <select
                    value={selectedSpecies}
                    onChange={(e) => setSelectedSpecies(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-[11px]"
                  >
                    <option value="ignis">Ignis (Fire)</option>
                    <option value="aqua_fox">Aqua Fox (Water)</option>
                    <option value="wood_golem">Wood Golem (Wood)</option>
                    <option value="spark_pup">Spark Pup (Lightning)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Min Lvl</label>
                  <input
                    type="number"
                    value={minLevel}
                    onChange={(e) => setMinLevel(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Max Lvl</label>
                  <input
                    type="number"
                    value={maxLevel}
                    onChange={(e) => setMaxLevel(parseInt(e.target.value) || 5)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-2 divide-y divide-slate-800">
                {encounterPool.map((pool, idx) => (
                  <div key={idx} className="pt-1.5 flex items-center justify-between text-slate-300">
                    <span className="font-mono text-cyan-300">{pool.speciesId}</span>
                    <span className="text-[10px] text-slate-400">Lvl {pool.minLevel}-{pool.maxLevel} ({pool.weight}%)</span>
                    <button
                      onClick={() => handleRemoveEncounterSpecies(idx)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: NPCS & TRAINER BATTLES */}
        {activeTab === 'npcs' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
              <span className="font-bold text-slate-300 block font-mono text-[11px] uppercase tracking-wide">
                Overworld NPC Placer
              </span>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">NPC Name</label>
                <input
                  type="text"
                  value={npcName}
                  onChange={(e) => setNpcName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Dialogue Text</label>
                <textarea
                  value={npcDialogue}
                  onChange={(e) => setNpcDialogue(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Sprite Visual</label>
                <select
                  value={npcSprite}
                  onChange={(e) => setNpcSprite(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono"
                >
                  {TUXEMON_SPRITES.map(sprite => (
                    <option key={sprite} value={`/tuxemon-assets/npc/${sprite}.png`}>
                      {sprite}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAddNpc}
                className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold text-xs flex items-center justify-center gap-1 shadow"
              >
                <Plus className="w-4 h-4" /> Place NPC at Spawn Location
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: BATTLES & ARENAS */}
        {activeTab === 'battles' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
              <span className="font-bold text-slate-300 block font-mono text-[11px] uppercase tracking-wide">
                Battle Arena Configuration
              </span>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Arena Background</label>
                <select
                  value={battleBackground}
                  onChange={(e) => setBattleBackground(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono"
                >
                  <option value="forest_field">Forest Field</option>
                  <option value="cave_arena">Cave Arena</option>
                  <option value="tower_summit">Tower Summit</option>
                  <option value="city_grounds">City Grounds</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: QUESTS */}
        {activeTab === 'quests' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-2">
              <span className="font-bold text-slate-300 block font-mono text-[11px] uppercase tracking-wide">
                Active Map Quests
              </span>
              <p className="text-slate-400 text-[11px]">
                Quests connected to NPCs on {currentMapId}:
              </p>
              <div className="p-2 bg-slate-950 rounded border border-slate-800 text-[11px] font-mono text-cyan-300">
                1. Speak with {npcName} (Intro to Animists)
              </div>
            </div>
          </div>
        )}
        {/* TAB: ASSETS VIEWER */}
        {activeTab === 'assets' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
              <span className="font-bold text-slate-300 font-mono text-[11px] uppercase tracking-wide">
                Asset Library ({TUXEMON_ITEMS.length} Items, {TUXEMON_MONSTERS.length} Monsters)
              </span>
              <p className="text-slate-400 text-[11px]">
                Browse all available mapped items and monster sprites.
              </p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-cyan-400 font-mono text-[10px] uppercase mb-2">Tuxemon Monsters</h4>
                  <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto bg-slate-950 p-2 border border-slate-800 rounded">
                    {TUXEMON_MONSTERS.map(m => (
                      <div key={m.id} className="flex flex-col items-center bg-slate-900 border border-slate-800 rounded p-1">
                        <img src={m.path} alt={m.id} className="h-10 w-auto object-contain" />
                        <span className="text-[9px] text-slate-500 truncate w-full text-center mt-1" title={m.id}>{m.id}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-cyan-400 font-mono text-[10px] uppercase mb-2">Game Items</h4>
                  <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto bg-slate-950 p-2 border border-slate-800 rounded">
                    {TUXEMON_ITEMS.map(i => (
                      <div key={i.id} className="flex flex-col items-center bg-slate-900 border border-slate-800 rounded p-1">
                        <img src={i.path} alt={i.id} className="h-8 w-auto object-contain" />
                        <span className="text-[8px] text-slate-500 truncate w-full text-center mt-1" title={i.id}>{i.id.substring(0, 8)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Editor Footer Action Bar */}
      <div className="px-4 py-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-mono">
          Press <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-cyan-300">Ctrl+E</kbd> to toggle
        </span>
        <button
          onClick={handleSaveConfig}
          className="px-4 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded shadow-lg flex items-center gap-1.5 transition-all text-xs"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

    </div>
  );
};

export default IntegratedDevEditor;
