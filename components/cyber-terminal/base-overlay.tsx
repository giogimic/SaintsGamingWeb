'use client';

import { useGameStore } from './store';
import RpgPanel from './rpg-panel';
import { getCreatureById } from './data/saints-dex';
import { useEffect, useState } from 'react';

export default function BaseOverlay() {
  const player = useGameStore(state => state.player);
  const setGameMode = useGameStore(state => state.setGameMode);
  const assignBeast = useGameStore(state => state.assignBeast);
  const collectBaseResources = useGameStore(state => state.collectBaseResources);
  const showToast = useGameStore(state => state.showToast);

  const [assigningTo, setAssigningTo] = useState<'lumber_mill' | 'quarry' | null>(null);

  // Auto collect when opening the base
  useEffect(() => {
    collectBaseResources();
  }, [collectBaseResources]);

  const handleAssign = (daemonId: string) => {
    if (assigningTo) {
      assignBeast(assigningTo, daemonId);
      setAssigningTo(null);
    }
  };

  const renderFacility = (id: 'lumber_mill' | 'quarry', title: string, description: string, resource: string) => {
    const assignedId = player.assignedBeasts[id];
    const daemon = assignedId ? getCreatureById(assignedId) : null;

    return (
      <div className="bg-[#1a1a1a]/80 border-2 border-[#3e2723] rounded-lg p-4 flex flex-col md:flex-row gap-4 mb-4 shadow-inner">
        {/* Facility Info */}
        <div className="flex-1">
          <h3 className="text-[#ca8a04] font-bold text-lg tracking-wider uppercase">{title}</h3>
          <p className="text-slate-400 text-xs italic mb-2">{description}</p>
          <div className="text-[10px] text-emerald-400 font-mono font-bold bg-black/50 p-1 rounded border border-[#166534] inline-block">
            YIELD: 1 {resource} / 10s
          </div>
        </div>

        {/* Assigned Daemon */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center bg-black/40 border border-[#3e2723] rounded p-2 min-w-[120px]">
          {daemon ? (
            <>
              <div className="w-12 h-12 mb-1 bg-black rounded overflow-hidden flex items-center justify-center border border-[#333]">
                {daemon.assetPath ? (
                  <img src={daemon.assetPath} alt={daemon.name} className="w-full h-full object-cover pixelated" style={{ imageRendering: 'pixelated' }} />
                ) : (
                  <span className="text-[#5d4037] text-xl font-mono">?</span>
                )}
              </div>
              <span className="text-white text-xs font-bold">{daemon.name}</span>
              <span className="text-[9px] text-slate-400 font-mono mt-0.5">{daemon.type_primary}</span>
              <button 
                onClick={() => assignBeast(id, null)}
                className="mt-2 text-[10px] bg-red-900/50 hover:bg-red-700/50 text-red-300 px-2 py-0.5 rounded border border-red-900/50 transition-colors"
              >
                UNASSIGN
              </button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 mb-1 bg-[#1a1a1a] rounded flex items-center justify-center border border-dashed border-[#3e2723]">
                <span className="text-[#3e2723] text-2xl font-mono">+</span>
              </div>
              <span className="text-[#5d4037] text-xs font-bold italic">Unassigned</span>
              <button 
                onClick={() => setAssigningTo(id)}
                className="mt-2 text-[10px] bg-[#4e342e] hover:bg-[#5d4037] text-[#e0e0e0] px-3 py-0.5 rounded shadow transition-colors"
              >
                ASSIGN
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <RpgPanel title="BASE MANAGEMENT" onClose={() => setGameMode('EXPLORING')}>
      
      {assigningTo ? (
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center mb-4 border-b border-[#3e2723] pb-2">
            <h3 className="text-[#ca8a04] font-bold">Select a Beast for the {assigningTo.replace('_', ' ')}</h3>
            <button onClick={() => setAssigningTo(null)} className="text-slate-400 text-xs hover:text-white">Cancel</button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-2 sm:grid-cols-3 gap-3 pr-2">
            {player.caughtDaemons.length === 0 && (
              <div className="col-span-full text-center text-slate-500 italic mt-8 font-mono text-sm">
                You have not captured any Beasts yet.
              </div>
            )}
            {player.caughtDaemons.map(id => {
              const daemon = getCreatureById(id);
              if (!daemon) return null;
              
              // Prevent assigning a beast that is already working
              const isWorking = Object.values(player.assignedBeasts).includes(id);

              return (
                <div 
                  key={id}
                  onClick={() => !isWorking && handleAssign(id)}
                  className={`bg-black/60 border rounded p-2 flex flex-col items-center transition-colors ${
                    isWorking 
                      ? 'border-[#333] opacity-50 cursor-not-allowed' 
                      : 'border-[#3e2723] hover:border-[#ca8a04] cursor-pointer shadow-inner'
                  }`}
                >
                  <div className="w-10 h-10 mb-1 bg-black rounded overflow-hidden flex items-center justify-center">
                    {daemon.assetPath ? (
                      <img src={daemon.assetPath} alt={daemon.name} className="w-full h-full object-cover pixelated" style={{ imageRendering: 'pixelated' }} />
                    ) : (
                      <span className="text-[#5d4037] text-lg font-mono">?</span>
                    )}
                  </div>
                  <span className="text-white text-[10px] font-bold text-center break-all leading-tight">{daemon.name}</span>
                  {isWorking && <span className="text-[8px] text-red-400 font-bold mt-1">WORKING</span>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="bg-black/50 border border-[#ca8a04] rounded p-3 mb-4 text-center">
            <p className="text-[#e0e0e0] text-sm font-mono leading-relaxed">
              Assigned Beasts will generate resources passively while you are online and offline!
            </p>
            <button 
              onClick={() => { collectBaseResources(); showToast('Collected base yields!'); }}
              className="mt-3 px-4 py-1.5 bg-[#166534] hover:bg-[#15803d] text-white text-xs font-bold rounded shadow transition-colors border border-[#14532d]"
            >
              FORCE COLLECT NOW
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {renderFacility('lumber_mill', 'Lumber Mill', 'Generates Wood Logs passively over time.', 'Wood Log')}
            {renderFacility('quarry', 'Quarry', 'Mines Copper Ore from the earth passively.', 'Copper Ore')}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4e342e; border-radius: 4px; border: 1px solid #3e2723; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #5d4037; }
      `}} />
    </RpgPanel>
  );
}
