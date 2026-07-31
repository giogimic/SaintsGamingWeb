'use client';

import React, { useState } from 'react';
import { useGameStore } from '../../store';
import { Settings, Trees, Plus, X } from 'lucide-react';
import { GAME_MAPS } from '../../data/maps';

export const PropertiesPanel: React.FC = () => {
  const currentMapId = useGameStore((state) => state.currentMapId);
  const showToast = useGameStore((state) => state.showToast);
  
  const currentMapData = GAME_MAPS[currentMapId] || {
    id: currentMapId,
    encounterPool: []
  };

  // Logic Tile State
  const [newLogicTile, setNewLogicTile] = useState({
    id: 20,
    name: 'New Tag/Component',
    color: 'bg-emerald-500',
    isSolid: false,
    interactable: false,
    onInteractAction: '',
    onInteractPayload: '',
    onStepAction: '',
    onStepPayload: ''
  });

  // Encounter State
  const [encounterPool, setEncounterPool] = useState<Array<{ speciesId: string; minLevel: number; maxLevel: number; weight: number }>>(
    currentMapData.encounterPool || []
  );
  const [selectedSpecies, setSelectedSpecies] = useState('ignis');
  const [minLevel, setMinLevel] = useState(2);
  const [maxLevel, setMaxLevel] = useState(5);

  const handleSaveLogicTile = async () => {
    try {
      const payload = {
        ...newLogicTile,
        onInteractPayload: newLogicTile.onInteractPayload ? JSON.parse(newLogicTile.onInteractPayload) : null,
        onStepPayload: newLogicTile.onStepPayload ? JSON.parse(newLogicTile.onStepPayload) : null
      };
      const res = await fetch('/api/world/logic-tiles', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Component Saved!');
        await useGameStore.getState().fetchLogicTiles();
      }
    } catch (e) {
      showToast('Failed to save component');
    }
  };

  const handleAddEncounterSpecies = () => {
    setEncounterPool([...encounterPool, { speciesId: selectedSpecies, minLevel, maxLevel, weight: 30 }]);
    showToast(`Added ${selectedSpecies} to map pool`);
  };

  return (
    <div className="space-y-4 text-xs font-mono">
      {/* SELECTION PROPERTIES (Placeholder for future clicking on objects) */}
      <div className="bg-[#0b1320]/60 border border-[#806f47]/30 rounded p-3 text-center text-slate-400 italic">
        Select a Game Object in the world to edit its Tags and Components.
      </div>

      {/* ENCOUNTER POOL */}
      <div className="bg-[#0b1320]/60 border border-[#806f47]/30 rounded p-2 space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-[#cbb26a] border-b border-[#806f47]/30 pb-1">
          <Trees className="w-3.5 h-3.5" /> Encounter Zone Config
        </div>
        
        <div className="space-y-2">
          {encounterPool.map((enc, idx) => (
            <div key={idx} className="flex items-center justify-between bg-[#050b14] p-1.5 border border-[#806f47]/20 rounded">
              <span className="font-bold text-white">{enc.speciesId}</span>
              <span className="text-[10px] text-slate-400">Lv {enc.minLevel}-{enc.maxLevel}</span>
              <button 
                onClick={() => setEncounterPool(encounterPool.filter((_, i) => i !== idx))}
                className="text-red-400 hover:bg-red-500/20 p-1 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-1 pt-1 border-t border-[#806f47]/20">
            <input 
              type="text" 
              value={selectedSpecies} 
              onChange={e => setSelectedSpecies(e.target.value)}
              className="bg-[#050b14] border border-slate-700 rounded px-1 py-1"
            />
            <div className="flex gap-1">
              <input type="number" value={minLevel} onChange={e => setMinLevel(parseInt(e.target.value))} className="w-full bg-[#050b14] border border-slate-700 rounded px-1 py-1" placeholder="Min" />
              <input type="number" value={maxLevel} onChange={e => setMaxLevel(parseInt(e.target.value))} className="w-full bg-[#050b14] border border-slate-700 rounded px-1 py-1" placeholder="Max" />
            </div>
          </div>
          <button onClick={handleAddEncounterSpecies} className="w-full py-1 bg-[#806f47]/20 hover:bg-[#806f47]/40 text-[#e2d5b3] border border-[#806f47]/40 rounded flex items-center justify-center gap-1">
            <Plus className="w-3 h-3" /> Add Species
          </button>
        </div>
      </div>

      {/* COMPONENT/LOGIC TILE CREATOR */}
      <div className="bg-[#0b1320]/60 border border-[#806f47]/30 rounded p-2 space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-[#cbb26a] border-b border-[#806f47]/30 pb-1">
          <Settings className="w-3.5 h-3.5" /> Tag/Component Registry
        </div>
        
        <div className="space-y-1.5">
          <label className="block text-[10px] text-slate-400">ID / Tag Name</label>
          <div className="flex gap-2">
            <input type="number" value={newLogicTile.id} onChange={(e) => setNewLogicTile({...newLogicTile, id: parseInt(e.target.value)})} className="w-16 bg-[#050b14] border border-slate-700 rounded px-1 py-1 text-center" />
            <input type="text" value={newLogicTile.name} onChange={(e) => setNewLogicTile({...newLogicTile, name: e.target.value})} className="flex-1 bg-[#050b14] border border-slate-700 rounded px-1 py-1" />
          </div>

          <label className="block text-[10px] text-slate-400 mt-2">Collision</label>
          <div className="flex gap-2">
            <label className="flex items-center gap-1 bg-[#050b14] border border-slate-700 px-2 py-1 rounded">
              <input type="checkbox" checked={newLogicTile.isSolid} onChange={e => setNewLogicTile({...newLogicTile, isSolid: e.target.checked})} />
              Solid
            </label>
            <label className="flex items-center gap-1 bg-[#050b14] border border-slate-700 px-2 py-1 rounded">
              <input type="checkbox" checked={newLogicTile.interactable} onChange={e => setNewLogicTile({...newLogicTile, interactable: e.target.checked})} />
              Interactable
            </label>
          </div>

          <label className="block text-[10px] text-slate-400 mt-2">Interaction Component (JSON)</label>
          <div className="flex gap-1">
            <input type="text" value={newLogicTile.onInteractAction} onChange={e => setNewLogicTile({...newLogicTile, onInteractAction: e.target.value})} placeholder="Action (e.g. DIALOGUE)" className="w-1/3 bg-[#050b14] border border-slate-700 rounded px-1 py-1 text-[10px]" />
            <input type="text" value={newLogicTile.onInteractPayload} onChange={e => setNewLogicTile({...newLogicTile, onInteractPayload: e.target.value})} placeholder='{"text": "Hello"}' className="w-2/3 bg-[#050b14] border border-slate-700 rounded px-1 py-1 text-[10px]" />
          </div>
          
          <button onClick={handleSaveLogicTile} className="w-full mt-2 py-1 bg-[#806f47]/80 hover:bg-[#806f47] text-white rounded font-bold">
            Register Template
          </button>
        </div>
      </div>
    </div>
  );
};
