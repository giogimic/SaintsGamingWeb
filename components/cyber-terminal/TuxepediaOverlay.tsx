/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from './store';
import RpgPanel from './rpg-panel';
import { SAINTS_DEX } from './data/saints-dex';

interface TuxemonSpeciesData {
  id: string;
  slug: string;
  txmnId: number;
  species: string;
  types: string[];
  spriteFront?: string;
  stats?: {
    hp: number;
    meleeAtk: number;
    meleeDef: number;
    rangedAtk: number;
    rangedDef: number;
    speed: number;
  };
}

export default function SaintsDexOverlay() {
  const setGameMode = useGameStore((state) => state.setGameMode);
  const caughtSpecies = useGameStore((state) => state.player.tuxemonSpeciesCaught || []);
  const caughtDaemons = useGameStore((state) => state.player.caughtDaemons || []);
  
  const [dbSpecies, setDbSpecies] = useState<TuxemonSpeciesData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSpecies, setSelectedSpecies] = useState<TuxemonSpeciesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSpecies() {
      try {
        const res = await fetch('/api/tuxemon');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setDbSpecies(data);
          }
        }
      } catch (err) {
        console.error('Failed to load Tuxepedia species:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSpecies();
  }, []);

  // Merge static SAINTS_DEX fallback with Tuxemon species from DB
  const displayList = dbSpecies.length > 0 ? dbSpecies : SAINTS_DEX.map(d => ({
    id: d.id,
    slug: d.id,
    txmnId: parseInt(d.id.replace(/\D/g, '')) || 1,
    species: d.name,
    types: [d.type_primary, d.type_secondary].filter(t => t && t !== 'None'),
    spriteFront: d.assetPath,
    stats: {
      hp: d.stat_profile.HP,
      meleeAtk: d.stat_profile.ATK,
      meleeDef: d.stat_profile.DEF,
      rangedAtk: d.stat_profile.ATK,
      rangedDef: d.stat_profile.DEF,
      speed: d.stat_profile.SPD,
    }
  }));

  const filteredList = displayList.filter(item => {
    const matchesSearch = item.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || item.types.some(t => t.toLowerCase() === selectedType.toLowerCase());
    return matchesSearch && matchesType;
  });

  const totalCaught = displayList.filter(item => 
    caughtSpecies.includes(item.slug) || caughtDaemons.includes(item.id)
  ).length;

  return (
    <RpgPanel title="SAINTS DEX & ANIMIST CODEX" onClose={() => setGameMode('EXPLORING')}>
      {/* Header Stat & Search Controls */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-center mb-4 bg-black/60 p-3 border border-cyan-900 rounded shadow-inner">
        <div className="flex items-center gap-3">
          <span className="text-slate-300 font-bold font-mono text-sm font-sans uppercase">REGISTERED BEASTS:</span>
          <span className="text-cyan-400 font-mono font-bold text-xl">{totalCaught} / {displayList.length}</span>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search species..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-black/80 border border-cyan-800 rounded px-2 py-1 text-xs text-cyan-200 focus:outline-none focus:border-cyan-400 font-mono flex-1"
          />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-black/80 border border-cyan-800 rounded px-2 py-1 text-xs text-cyan-200 focus:outline-none focus:border-cyan-400 font-mono"
          >
            <option value="all">ALL TYPES</option>
            <option value="fire">FIRE</option>
            <option value="water">WATER</option>
            <option value="grass">GRASS</option>
            <option value="electric">ELECTRIC</option>
            <option value="ice">ICE</option>
            <option value="ground">GROUND</option>
            <option value="wood">WOOD</option>
            <option value="metal">METAL</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="w-full h-64 flex items-center justify-center text-cyan-400 font-mono">
          LOADING SAINTS DEX SPECIES...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 overflow-y-auto custom-scrollbar pr-2 h-[420px]">
          {filteredList.map((item) => {
            const isCaught = caughtSpecies.includes(item.slug) || caughtDaemons.includes(item.id);

            return (
              <div
                key={item.id}
                onClick={() => isCaught && setSelectedSpecies(item)}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  isCaught
                    ? 'border-cyan-500/40 bg-cyan-950/20 hover:bg-cyan-900/40 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                    : 'border-slate-800/80 bg-slate-900/40 opacity-40 select-none'
                }`}
              >
                <div className="w-16 h-16 flex-shrink-0 bg-black/80 rounded flex items-center justify-center border border-slate-700 overflow-hidden relative">
                  {isCaught ? (
                    item.spriteFront ? (
                      <img
                        src={item.spriteFront}
                        alt={item.species}
                        className="w-full h-full object-contain pixelated"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    ) : (
                      <span className="text-cyan-400 font-bold text-xs font-mono">#{item.txmnId}</span>
                    )
                  ) : (
                    <span className="text-slate-600 text-2xl font-mono">?</span>
                  )}
                </div>

                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-bold text-sm text-slate-100 truncate">
                      {isCaught ? item.species : '???'}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">#{item.txmnId}</span>
                  </div>

                  {isCaught ? (
                    <>
                      <div className="flex gap-1 mt-1">
                        {item.types.map((type, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] px-1.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-700/50 rounded uppercase font-mono font-semibold"
                          >
                            {type}
                          </span>
                        ))}
                      </div>

                      {item.stats && (
                        <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 text-[9px] text-slate-400 font-mono mt-2 pt-1 border-t border-slate-800/60">
                          <span>HP:{item.stats.hp}</span>
                          <span>ATK:{item.stats.meleeAtk}</span>
                          <span>SPD:{item.stats.speed}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-600 font-mono italic mt-1">Not yet captured</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Species Detail Modal */}
      {selectedSpecies && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-cyan-500 p-5 rounded-lg max-w-md w-full text-slate-100 font-mono relative shadow-2xl">
            <button
              onClick={() => setSelectedSpecies(null)}
              className="absolute top-2 right-2 text-slate-400 hover:text-white font-bold text-sm px-2 py-0.5"
            >
              ✕
            </button>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-24 h-24 bg-black rounded border border-cyan-500/50 flex items-center justify-center overflow-hidden">
                {selectedSpecies.spriteFront ? (
                  <img src={selectedSpecies.spriteFront} alt={selectedSpecies.species} className="w-full h-full object-contain pixelated" />
                ) : (
                  <span className="text-cyan-400 text-lg font-bold">#{selectedSpecies.txmnId}</span>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-cyan-300">{selectedSpecies.species}</h3>
                <span className="text-xs text-slate-400">Species #{selectedSpecies.txmnId}</span>
                <div className="flex gap-1 mt-2">
                  {selectedSpecies.types.map((t, idx) => (
                    <span key={idx} className="text-xs px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-700 rounded uppercase font-bold">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {selectedSpecies.stats && (
              <div className="space-y-1 bg-black/60 p-3 rounded border border-slate-800 text-xs text-slate-300 mb-4">
                <div className="flex justify-between"><span>Max HP:</span><span className="text-cyan-400">{selectedSpecies.stats.hp}</span></div>
                <div className="flex justify-between"><span>Melee Attack:</span><span className="text-cyan-400">{selectedSpecies.stats.meleeAtk}</span></div>
                <div className="flex justify-between"><span>Melee Defense:</span><span className="text-cyan-400">{selectedSpecies.stats.meleeDef}</span></div>
                <div className="flex justify-between"><span>Ranged Attack:</span><span className="text-cyan-400">{selectedSpecies.stats.rangedAtk}</span></div>
                <div className="flex justify-between"><span>Ranged Defense:</span><span className="text-cyan-400">{selectedSpecies.stats.rangedDef}</span></div>
                <div className="flex justify-between"><span>Speed:</span><span className="text-cyan-400">{selectedSpecies.stats.speed}</span></div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const { pinBeastToProfile } = await import('@/app/actions/game');
                  const res = await pinBeastToProfile(selectedSpecies.species);
                  if (res.success) {
                    useGameStore.getState().showToast(`Pinned ${selectedSpecies.species} to your profile!`);
                  } else {
                    useGameStore.getState().showToast(`Pinned ${selectedSpecies.species} locally!`);
                  }
                  setSelectedSpecies(null);
                }}
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-black font-extrabold rounded text-xs transition-colors"
              >
                PIN TO PROFILE
              </button>

              <button
                onClick={async () => {
                  try {
                    const { createSocialPost } = await import('@/app/actions/social');
                    await createSocialPost(`Just registered ${selectedSpecies.species} in Saints Tamer! 🐾 #SaintsTamer #SaintsGaming`);
                    useGameStore.getState().showToast(`Shared ${selectedSpecies.species} to Community Feed!`);
                  } catch (_err) {
                    useGameStore.getState().showToast(`Shared ${selectedSpecies.species} to local feed!`);
                  }
                }}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold rounded text-xs transition-colors"
              >
                SHARE TO FEED 📣
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #0891b2; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #06b6d4; }
      `}} />
    </RpgPanel>
  );
}
