import React, { useState } from 'react';
import MapEditorWebGL from './MapEditorWebGL';
import WorldMapNavigator from './WorldMapNavigator';
import { GAME_MAPS } from './data/maps';
import { useGameStore } from './store';
import { saveWorldMap } from '@/app/actions/game-admin';

export default function MapEditorPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'navigator' | 'tiles' | 'collision' | 'rpg_nodes' | 'npcs' | 'encounters' | 'gates'>('navigator');
  const [currentMapId, setCurrentMapId] = useState<string>('PLAYER_HOUSE_BEDROOM');
  const [mapName, setMapName] = useState(GAME_MAPS['PLAYER_HOUSE_BEDROOM']?.name || 'Player Bedroom');
  const [mapSlug, setMapSlug] = useState('PLAYER_HOUSE_BEDROOM');
  const [multiMapMode, setMultiMapMode] = useState<boolean>(false);
  const [brushSize, setBrushSize] = useState<1 | 2 | 3>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('outdoor');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // RPG Node Placement State
  const [selectedNodeType, setSelectedNodeType] = useState<'TREE' | 'ORE' | 'FISHING' | 'FARM'>('TREE');
  const [nodeLevel, setNodeLevel] = useState<number>(1);

  // Encounter Zone State
  const [encounters, setEncounters] = useState<Array<{speciesId: string, minLevel: number, maxLevel: number, weight: number}>>(GAME_MAPS['PLAYER_HOUSE_BEDROOM']?.encounterPool || []);
  const [encounterSpecies, setEncounterSpecies] = useState<string>('dracoflare');
  const [encounterMinLvl, setEncounterMinLvl] = useState<number>(2);
  const [encounterMaxLvl, setEncounterMaxLvl] = useState<number>(5);
  const [encounterRate, setEncounterRate] = useState<number>(0.15);

  const [mapGridData, setMapGridData] = useState<number[][] | null>(null);

  const showToast = useGameStore((state) => state.showToast);

  const handleLoadMap = (id: string) => {
    const map = GAME_MAPS[id];
    if (map) {
      setCurrentMapId(map.id);
      setMapName(map.name);
      setMapSlug(map.id);
      setEncounters(map.encounterPool || []);
      showToast(`Loaded map: ${map.name}`);
    } else {
      showToast(`Map ${id} not found in client registry.`);
    }
  };

  const handleSaveMap = async () => {
    setIsSaving(true);
    setStatusMsg('Saving map data to database...');
    try {
      const dummyGrid = Array(30).fill(0).map(() => Array(40).fill(1));
      const gridToSave = mapGridData || dummyGrid;
      
      const res = await saveWorldMap({
        id: mapSlug,
        name: mapName,
        gridData: JSON.stringify(gridToSave),
        gatesData: JSON.stringify({}),
        npcsData: JSON.stringify([]),
        encountersData: JSON.stringify(encounters)
      });

      if (res.success) {
        showToast(`Map '${mapName}' successfully saved!`);
        setStatusMsg('Map saved successfully!');
      } else {
        showToast('Failed to save map: ' + res.error);
        setStatusMsg('Error saving map');
      }
    } catch (err: any) {
      showToast('Save exception: ' + err?.message);
      setStatusMsg('Error: ' + err?.message);
    }
    setIsSaving(false);
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#12141a]/95 text-slate-100 flex flex-col font-mono select-none overflow-hidden backdrop-blur-md border-4 border-cyan-600/80 rounded-lg shadow-2xl">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-cyan-950/80 border-b border-cyan-500/50">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 text-lg font-extrabold tracking-wider animate-pulse">
            [ MAP EDITOR PANEL ]
          </span>
          <input
            type="text"
            value={mapName}
            onChange={(e) => setMapName(e.target.value)}
            className="bg-black/60 border border-cyan-600/50 rounded px-2 py-0.5 text-xs text-cyan-200 focus:outline-none focus:border-cyan-400"
            placeholder="Map Name"
          />
          <input
            type="text"
            value={mapSlug}
            onChange={(e) => setMapSlug(e.target.value)}
            className="bg-black/60 border border-slate-600/50 rounded px-2 py-0.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
            placeholder="Map Slug"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveMap}
            disabled={isSaving}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)] disabled:opacity-50"
          >
            {isSaving ? 'SAVING...' : 'SAVE MAP'}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold transition-all"
          >
            CLOSE
          </button>
        </div>
      </div>

      {/* Main Container: Left Toolbar + Right Canvas Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-80 bg-slate-900/90 border-r border-slate-800 flex flex-col p-3 gap-3 overflow-y-auto">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-4 gap-1 bg-black/40 p-1 rounded border border-slate-800">
            <button
              onClick={() => setActiveTab('navigator')}
              className={`py-1 rounded text-[10px] font-bold transition-colors ${activeTab === 'navigator' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              NAVIGATOR
            </button>
            <button
              onClick={() => setActiveTab('tiles')}
              className={`py-1 rounded text-[10px] font-bold transition-colors ${activeTab === 'tiles' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              TILES
            </button>
            <button
              onClick={() => setActiveTab('collision')}
              className={`py-1 rounded text-[10px] font-bold transition-colors ${activeTab === 'collision' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              COLLISION
            </button>
            <button
              onClick={() => setActiveTab('rpg_nodes')}
              className={`py-1 rounded text-[10px] font-bold transition-colors ${activeTab === 'rpg_nodes' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              NODES
            </button>
            <button
              onClick={() => setActiveTab('npcs')}
              className={`py-1 rounded text-[10px] font-bold transition-colors ${activeTab === 'npcs' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              NPCS
            </button>
            <button
              onClick={() => setActiveTab('encounters')}
              className={`py-1 rounded text-[10px] font-bold transition-colors ${activeTab === 'encounters' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              ENCOUNTERS
            </button>
            <button
              onClick={() => setActiveTab('gates')}
              className={`py-1 rounded text-[10px] font-bold transition-colors ${activeTab === 'gates' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              GATES
            </button>
          </div>

          {/* TAB CONTENT */}
          {activeTab === 'navigator' && (
            <WorldMapNavigator
              currentMapId={currentMapId}
              onSelectMap={handleLoadMap}
              multiMapMode={multiMapMode}
              onToggleMultiMapMode={(enabled) => setMultiMapMode(enabled)}
            />
          )}
          {activeTab === 'tiles' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-cyan-400 font-bold">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-black/60 border border-slate-700 rounded p-1 text-xs text-white"
                >
                  <option value="outdoor">Outdoor / Grass</option>
                  <option value="indoor">Indoor / Furniture</option>
                  <option value="cave">Cave / Dungeon</option>
                  <option value="water">Water / Shore</option>
                  <option value="buildings">Buildings & Structures</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-cyan-400 font-bold">Brush Size</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((size) => (
                    <button
                      key={size}
                      onClick={() => setBrushSize(size as 1 | 2 | 3)}
                      className={`flex-1 py-1 rounded text-xs border ${brushSize === size ? 'bg-cyan-700 border-cyan-400 text-white' : 'bg-black/40 border-slate-700 text-slate-400'}`}
                    >
                      {size}x{size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                <span className="text-xs text-slate-300">Show Grid</span>
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="accent-cyan-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'collision' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs text-amber-400 font-bold">Collision Painter</span>
              <p className="text-[11px] text-slate-400">
                Click on canvas tiles to toggle blocked/walkable status. Blocked tiles render with a red overlay.
              </p>
            </div>
          )}

          {activeTab === 'rpg_nodes' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs text-emerald-400 font-bold">RPG Resource Node Spawner</span>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300">Node Type</label>
                <select
                  value={selectedNodeType}
                  onChange={(e: any) => setSelectedNodeType(e.target.value)}
                  className="bg-black/60 border border-slate-700 rounded p-1 text-xs text-white"
                >
                  <option value="TREE">Woodcutting Tree (Oak/Willow)</option>
                  <option value="ORE">Mining Rock (Copper/Iron/Mithril)</option>
                  <option value="FISHING">Fishing Spot (Net/Harpoon)</option>
                  <option value="FARM">Herb Patch (Farming)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300">Required Skill Level</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={nodeLevel}
                  onChange={(e) => setNodeLevel(parseInt(e.target.value) || 1)}
                  className="bg-black/60 border border-slate-700 rounded p-1 text-xs text-white"
                />
              </div>
            </div>
          )}

          {activeTab === 'npcs' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs text-purple-400 font-bold">NPC & Dialogue Script Editor</span>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300">NPC Name</label>
                <input
                  type="text"
                  placeholder="e.g. Prof. Oakwood"
                  className="bg-black/60 border border-slate-700 rounded p-1 text-xs text-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300">Dialogue Key / Text</label>
                <textarea
                  rows={3}
                  placeholder="Welcome Tamer! Choose your starter beast..."
                  className="bg-black/60 border border-slate-700 rounded p-1 text-xs text-white"
                />
              </div>
              <button className="py-1 bg-purple-700 hover:bg-purple-600 rounded text-xs font-bold text-white transition-colors">
                Place NPC on Canvas
              </button>
            </div>
          )}

          {activeTab === 'gates' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs text-indigo-400 font-bold">Portal & Door Linker</span>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300">Target Map ID</label>
                <input
                  type="text"
                  placeholder="SPYDER_PAPER_TOWN"
                  className="bg-black/60 border border-slate-700 rounded p-1 text-xs text-white"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-xs text-slate-300">Spawn X</label>
                  <input type="number" defaultValue={10} className="bg-black/60 border border-slate-700 rounded p-1 text-xs text-white" />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-xs text-slate-300">Spawn Y</label>
                  <input type="number" defaultValue={12} className="bg-black/60 border border-slate-700 rounded p-1 text-xs text-white" />
                </div>
              </div>
              <button className="py-1 bg-indigo-700 hover:bg-indigo-600 rounded text-xs font-bold text-white transition-colors">
                Link Gate Trigger
              </button>
            </div>
          )}

          {activeTab === 'encounters' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs text-rose-400 font-bold">Wild Beast Encounter Zones</span>
              
              <div className="bg-black/40 border border-slate-700 rounded p-2 flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 font-bold">SPECIES ID</label>
                  <input
                    type="text"
                    value={encounterSpecies}
                    onChange={(e) => setEncounterSpecies(e.target.value)}
                    className="bg-black border border-slate-600 rounded p-1 text-xs text-white"
                    placeholder="e.g. dracoflare"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 font-bold">MIN LVL</label>
                    <input
                      type="number"
                      min={1}
                      value={encounterMinLvl}
                      onChange={(e) => setEncounterMinLvl(parseInt(e.target.value) || 1)}
                      className="bg-black border border-slate-600 rounded p-1 text-xs text-white"
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 font-bold">MAX LVL</label>
                    <input
                      type="number"
                      min={1}
                      value={encounterMaxLvl}
                      onChange={(e) => setEncounterMaxLvl(parseInt(e.target.value) || 1)}
                      className="bg-black border border-slate-600 rounded p-1 text-xs text-white"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 font-bold">WEIGHT (RATE)</label>
                  <input
                    type="number"
                    step="0.05"
                    min={0.01}
                    max={0.5}
                    value={encounterRate}
                    onChange={(e) => setEncounterRate(parseFloat(e.target.value) || 0.15)}
                    className="bg-black border border-slate-600 rounded p-1 text-xs text-white"
                  />
                </div>
                <button
                  onClick={() => {
                    setEncounters([...encounters, {
                      speciesId: encounterSpecies,
                      minLevel: encounterMinLvl,
                      maxLevel: encounterMaxLvl,
                      weight: encounterRate
                    }]);
                  }}
                  className="mt-1 py-1 bg-rose-700 hover:bg-rose-600 rounded text-[10px] font-bold text-white transition-colors"
                >
                  + Add Encounter to Map
                </button>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Active Encounters ({encounters.length})</span>
                {encounters.length === 0 ? (
                  <div className="text-[10px] text-slate-500 italic p-2 bg-black/20 rounded border border-slate-800 border-dashed">
                    No encounters configured for this map.
                  </div>
                ) : (
                  encounters.map((enc, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-black/60 border border-slate-700 p-1.5 rounded">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-rose-300">{enc.speciesId}</span>
                        <span className="text-[9px] text-slate-400">Lv {enc.minLevel}-{enc.maxLevel} • Rate: {enc.weight}</span>
                      </div>
                      <button
                        onClick={() => {
                          const newArr = [...encounters];
                          newArr.splice(idx, 1);
                          setEncounters(newArr);
                        }}
                        className="text-[10px] text-rose-500 hover:text-rose-400 font-bold px-2 py-0.5"
                      >
                        DEL
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {statusMsg && (
            <div className="mt-auto p-2 bg-black/60 border border-cyan-500/30 rounded text-[11px] text-cyan-300">
              {statusMsg}
            </div>
          )}
        </div>

        {/* Right Canvas Container */}
        <div className="flex-1 bg-black relative flex items-center justify-center p-2">
          <MapEditorWebGL mapId={mapSlug} onChange={setMapGridData} />
        </div>
      </div>
    </div>
  );
}
