'use client';

import { useGameStore } from './store';
import RpgPanel from './rpg-panel';
import { getCreatureById } from './data/saints-dex';

export default function PartyOverlay() {
  const caughtDaemons = useGameStore(state => state.player.caughtDaemons);
  const activeDaemonId = useGameStore(state => state.player.activeDaemonId);
  const setGameMode = useGameStore(state => state.setGameMode);

  return (
    <RpgPanel title="SAINTS PARTY" onClose={() => setGameMode('EXPLORING')}>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {caughtDaemons.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 font-mono italic text-center p-4">
            You have not bound any Beasts yet.<br/>Walk into tall grass to find some!
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {caughtDaemons.map((id) => {
              const daemon = getCreatureById(id);
              if (!daemon) return null;
              
              const isActive = activeDaemonId === id;

              return (
                <div 
                  key={id} 
                  className={`flex items-center gap-4 p-3 rounded-lg border-2 transition-all ${
                    isActive 
                      ? 'bg-[#3e2723]/80 border-[#ca8a04] shadow-[0_0_15px_rgba(202,138,4,0.3)]' 
                      : 'bg-[#1a1a1a]/80 border-[#333] hover:border-[#666]'
                  }`}
                >
                  {/* Sprite Box */}
                  <div className="w-16 h-16 bg-black rounded border border-[#3e2723] flex items-center justify-center overflow-hidden shrink-0">
                    {daemon.assetPath ? (
                      <img src={daemon.assetPath} alt={daemon.name} className="w-full h-full object-cover pixelated" style={{ imageRendering: 'pixelated' }} />
                    ) : (
                      <span className="text-[#5d4037] text-2xl font-mono">?</span>
                    )}
                  </div>
                  
                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[#e0e0e0] font-bold text-lg">{daemon.name}</h3>
                      {isActive && <span className="text-[10px] bg-[#ca8a04] text-black font-bold px-2 py-0.5 rounded-full">ACTIVE</span>}
                    </div>
                    <span className="text-[#a1887f] text-sm font-mono mt-1">{daemon.type_primary} / {daemon.type_secondary}</span>
                  </div>

                  {/* Actions */}
                  {!isActive && (
                    <button 
                      onClick={() => useGameStore.setState(state => { state.player.activeDaemonId = id })}
                      className="px-4 py-2 bg-[#4e342e] hover:bg-[#5d4037] text-white text-sm font-bold rounded border border-[#3e2723] transition-colors"
                    >
                      EQUIP
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4e342e; border-radius: 4px; border: 1px solid #3e2723; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #5d4037; }
      `}} />
    </RpgPanel>
  );
}
