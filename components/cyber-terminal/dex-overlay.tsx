/* eslint-disable @next/next/no-img-element */
'use client';

import { useGameStore } from './store';
import { SAINTS_DEX } from './data/saints-dex';
import RpgPanel from './rpg-panel';

export default function DexOverlay() {
  const caughtDaemons = useGameStore((state) => state.player.caughtDaemons);
  const activeDaemonId = useGameStore((state) => state.player.activeDaemonId);
  const setGameMode = useGameStore((state) => state.setGameMode);

  const handleEquip = (id: string) => {
    if (caughtDaemons.includes(id)) {
      useGameStore.getState().hydratePlayer({ activeDaemonId: id });
    }
  };

  return (
    <RpgPanel title="DAEMON REGISTRY" onClose={() => setGameMode('EXPLORING')}>
      <div className="flex justify-between items-center mb-4 bg-black/50 p-2 border border-cyan-900 rounded shadow-inner">
        <span className="text-slate-300 font-bold font-mono text-sm">TOTAL REGISTERED</span>
        <span className="text-cyan-400 font-mono font-bold text-lg">{caughtDaemons.length} / {SAINTS_DEX.length}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto custom-scrollbar pr-2 h-[400px]">
        {[...SAINTS_DEX]
          .sort((a, b) => {
            const aCaught = caughtDaemons.includes(a.id);
            const bCaught = caughtDaemons.includes(b.id);
            if (aCaught && !bCaught) return -1;
            if (!aCaught && bCaught) return 1;
            return 0;
          })
          .map((daemon) => {
          const isCaught = caughtDaemons.includes(daemon.id);
          const isActive = activeDaemonId === daemon.id;

          return (
            <div 
              key={daemon.id}
              onClick={() => handleEquip(daemon.id)}
              className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                isCaught 
                  ? isActive ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_15px_rgba(34,211,238,0.2)] cursor-pointer' : 'border-cyan-500/30 bg-cyan-950/10 cursor-pointer hover:bg-cyan-950/20' 
                  : 'border-slate-800 bg-slate-900/50 opacity-50'
              }`}
            >
              <div className="w-20 h-20 flex-shrink-0 bg-black rounded flex items-center justify-center overflow-hidden border border-slate-700">
                {isCaught ? (
                  daemon.assetPath ? <img src={daemon.assetPath} alt={daemon.name} className="w-full h-full object-cover pixelated" style={{ imageRendering: 'pixelated' }} /> : <span className="text-slate-600 text-xs text-center font-mono p-1">No Image Data</span>
                ) : (
                  <span className="text-slate-600 text-3xl font-mono">?</span>
                )}
              </div>
              
              <div className="flex flex-col flex-1">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-lg text-slate-200">
                    {isCaught ? daemon.name : 'UNKNOWN'}
                  </h3>
                  {isActive && <span className="text-[10px] bg-cyan-500 text-black px-1.5 py-0.5 rounded font-bold">ACTIVE</span>}
                </div>
                
                {isCaught && (
                  <>
                    <span className={`text-xs font-mono font-bold mb-1 text-slate-300`}>
                      {daemon.type_primary} {daemon.type_secondary !== 'None' ? `/ ${daemon.type_secondary}` : ''}
                    </span>
                    <p className="text-[10px] text-slate-400 leading-tight mb-1">
                      {daemon.passive_ability}
                    </p>
                    <p className="text-[10px] text-cyan-400/80 leading-tight mb-2">
                      {daemon.world_skill}
                    </p>
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-auto">
                      <span>HP:{daemon.stat_profile.HP}</span>
                      <span>ATK:{daemon.stat_profile.ATK}</span>
                      <span>DEF:{daemon.stat_profile.DEF}</span>
                      <span>SPD:{daemon.stat_profile.SPD}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
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
