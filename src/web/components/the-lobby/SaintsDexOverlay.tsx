/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from './store';
import { HudPanelShell } from './hud/HudPanelShell';
import { SAINTS_DEX } from './data/saints-dex';
import { BookOpen, Search, Filter, Sparkles, Pin, Share2, X, Heart, Shield, Zap, Sword } from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

interface CreatureSpeciesData {
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
  const caughtSpecies = useGameStore((state) => state.player.creaturesCaught || []);
  const caughtDaemons = useGameStore((state) => state.player.caughtDaemons || []);
  
  const [dbSpecies, setDbSpecies] = useState<CreatureSpeciesData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSpecies, setSelectedSpecies] = useState<CreatureSpeciesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSpecies() {
      try {
        const res = await fetch('/api/creatures');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setDbSpecies(data);
          }
        }
      } catch (err) {
        console.error('Failed to load SaintsDex species:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSpecies();
  }, []);

  // Merge static SAINTS_DEX fallback with Creature species from DB
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
    <div className="pointer-events-auto z-40 flex w-[min(95vw,700px)] max-w-full flex-col font-mono text-xs select-none">
      <HudPanelShell 
        title="SAINTS DEX & ANIMIST CODEX" 
        icon={<BookOpen className="w-4 h-4 text-cyan-400" />}
        onClose={() => setGameMode('EXPLORING')}
        headerRight={
          <span className="text-[9px] font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/40 uppercase">
            {totalCaught} / {displayList.length} DISCOVERED
          </span>
        }
      >
        <div className="flex flex-col gap-3 h-[68vh] p-3">
          {/* Search and Category Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2 justify-between items-center bg-black/60 p-2.5 rounded-xl border border-cyan-500/20 shadow-inner">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute top-2.5 left-2.5" />
              <input
                type="text"
                placeholder="Search registered beasts by species..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/80 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-cyan-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
              <select
                value={selectedType}
                onChange={(e) => {
                  soundSynth?.playSelectSound?.();
                  setSelectedType(e.target.value);
                }}
                className="bg-black/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-cyan-200 focus:outline-none focus:border-cyan-400 w-full sm:w-auto cursor-pointer"
              >
                <option value="all">ALL ELEMENTS</option>
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

          {/* Species List */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-cyan-400 font-bold p-8 border border-slate-800 rounded-xl bg-black/40">
              SYNCHRONIZING ANIMIST CODEX...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 flex-1 overflow-y-auto custom-scrollbar pr-1">
              {filteredList.map((item) => {
                const isCaught = caughtSpecies.includes(item.slug) || caughtDaemons.includes(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (isCaught) {
                        soundSynth?.playSelectSound?.();
                        setSelectedSpecies(item);
                      }
                    }}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                      isCaught
                        ? 'border-cyan-500/40 bg-cyan-950/20 hover:border-cyan-400 hover:bg-cyan-900/30 cursor-pointer shadow-sm'
                        : 'border-slate-800/80 bg-black/40 opacity-40 select-none'
                    }`}
                    style={{
                      clipPath: 'polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px)',
                    }}
                  >
                    <div className="w-14 h-14 shrink-0 bg-black/80 rounded-lg flex items-center justify-center border border-cyan-500/30 overflow-hidden shadow-inner">
                      {isCaught ? (
                        item.spriteFront ? (
                          <img
                            src={item.spriteFront}
                            alt={item.species}
                            className="w-full h-full object-contain pixelated"
                          />
                        ) : (
                          <span className="text-cyan-400 font-bold text-xs">#{item.txmnId}</span>
                        )
                      ) : (
                        <span className="text-slate-600 text-xl font-black">?</span>
                      )}
                    </div>

                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h4 className="font-bold text-xs text-white truncate">
                          {isCaught ? item.species : '???'}
                        </h4>
                        <span className="text-[9px] text-slate-500 font-bold">#{item.txmnId}</span>
                      </div>

                      {isCaught ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.types.map((type, idx) => (
                            <span
                              key={idx}
                              className="text-[8px] px-1.5 py-0.2 bg-cyan-950 text-cyan-300 border border-cyan-700/50 rounded uppercase font-bold"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-500 italic mt-1">Undiscovered</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected Species Detail Modal */}
          {selectedSpecies && (
            <div className="pointer-events-auto fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div 
                className="bg-[#04090e] border border-cyan-400 p-5 rounded-2xl max-w-md w-full text-slate-100 font-mono relative shadow-[0_0_30px_rgba(6,182,212,0.3)] space-y-4"
                style={{
                  clipPath: 'polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px)',
                }}
              >
                <button
                  onClick={() => {
                    soundSynth?.playSelectSound?.();
                    setSelectedSpecies(null);
                  }}
                  className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-black/80 rounded-xl border border-cyan-500/40 flex items-center justify-center overflow-hidden shadow-inner">
                    {selectedSpecies.spriteFront ? (
                      <img src={selectedSpecies.spriteFront} alt={selectedSpecies.species} className="w-full h-full object-contain pixelated" />
                    ) : (
                      <span className="text-cyan-400 text-lg font-bold">#{selectedSpecies.txmnId}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{selectedSpecies.species}</h3>
                    <span className="text-xs text-cyan-400 font-bold">Species #{selectedSpecies.txmnId}</span>
                    <div className="flex gap-1 mt-1.5">
                      {selectedSpecies.types.map((t, idx) => (
                        <span key={idx} className="text-[9px] px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-500/40 rounded uppercase font-bold">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedSpecies.stats && (
                  <div className="space-y-1.5 bg-black/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
                    <div className="flex justify-between items-center">
                      <span className="text-rose-400 flex items-center gap-1"><Heart className="w-3 h-3" /> Max HP:</span>
                      <strong className="text-white">{selectedSpecies.stats.hp}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-amber-400 flex items-center gap-1"><Sword className="w-3 h-3" /> Attack Power:</span>
                      <strong className="text-white">{selectedSpecies.stats.meleeAtk}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sky-400 flex items-center gap-1"><Shield className="w-3 h-3" /> Defense:</span>
                      <strong className="text-white">{selectedSpecies.stats.meleeDef}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-400 flex items-center gap-1"><Zap className="w-3 h-3" /> Speed Rating:</span>
                      <strong className="text-white">{selectedSpecies.stats.speed}</strong>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-1 border-t border-cyan-500/20">
                  <button
                    onClick={async () => {
                      soundSynth?.playActionSound?.();
                      const party = useGameStore.getState().player.creatureParty || [];
                      const slug = selectedSpecies.slug || selectedSpecies.species;
                      const owned =
                        party.find((m) => m.speciesSlug === slug || m.speciesSlug === selectedSpecies.slug) ||
                        party.find(
                          (m) =>
                            m.nickname?.toLowerCase() === selectedSpecies.species.toLowerCase() ||
                            m.speciesSlug.toLowerCase() === selectedSpecies.species.toLowerCase().replace(/\s+/g, '_')
                        );
                      const { pinBeastToProfile } = await import('@/app/actions/game');
                      const res = await pinBeastToProfile(owned?.id || selectedSpecies.slug || selectedSpecies.species);
                      if (res.success) {
                        useGameStore.getState().showToast(
                          `Pinned ${selectedSpecies.species} to your profile!`
                        );
                        setSelectedSpecies(null);
                      } else {
                        useGameStore.getState().showToast(
                          res.error || 'Own this creature before pinning.'
                        );
                      }
                    }}
                    className="flex-1 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Pin className="w-3.5 h-3.5" /> PIN TO PROFILE
                  </button>

                  <button
                    onClick={async () => {
                      soundSynth?.playActionSound?.();
                      try {
                        const { createSocialPost } = await import('@/app/actions/social');
                        await createSocialPost(`Just registered ${selectedSpecies.species} in Saints Tamer! 🐾 #SaintsTamer #SaintsGaming`);
                        useGameStore.getState().showToast(`Shared ${selectedSpecies.species} to Community Feed!`);
                      } catch {
                        useGameStore.getState().showToast(`Shared ${selectedSpecies.species} to feed!`);
                      }
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Share2 className="w-3.5 h-3.5" /> SHARE
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </HudPanelShell>
    </div>
  );
}

