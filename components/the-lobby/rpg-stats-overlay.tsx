'use client';

import React from 'react';
import RpgPanel from './rpg-panel';
import { useGameStore } from './store';
import { Shield, Award, User, Sparkles } from 'lucide-react';
import { ITEM_DB } from './data/items';

export default function RpgStatsOverlay() {
  const player = useGameStore(state => state.player);
  const setGameMode = useGameStore(state => state.setGameMode);

  const skills = player.skills || {};
  const inventory = player.inventory || {};
  const equipment = player.equipment || { head: null, chest: null, legs: null, weapon: null };
  const perk = player.perk || 'SWIFT_TRAVELER';
  const maxWeight = player.maxWeight || (perk === 'PACK_MULE' ? 150 : 100);
  const currentWeight = Object.values(inventory).reduce((sum, qty) => sum + qty, 0);

  const skillCategories = {
    Combat: ['Attack', 'Constitution', 'Defence', 'Magic', 'Necromancy', 'Prayer', 'Ranged', 'Strength', 'Summoning'],
    Gathering: ['Farming', 'Fishing', 'Hunter', 'Mining', 'Woodcutting'],
    Artisan: ['Construction', 'Cooking', 'Crafting', 'Firemaking', 'Fletching', 'Herblore', 'Runecrafting', 'Smithing'],
    Support: ['Agility', 'Thieving']
  };

  return (
    <RpgPanel title="CHARACTER RPG SHEET & STATS" onClose={() => setGameMode('EXPLORING')}>
      <div className="flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar font-mono text-xs pr-1">
        
        {/* Top Header Summary Card */}
        <div className="p-4 bg-slate-900/80 border border-emerald-500/40 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-black/60 rounded-xl flex items-center justify-center border border-white/10 shrink-0 shadow-inner">
              <User className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <span>{player.name || 'Operative'}</span>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700 rounded-full font-mono uppercase">
                  LVL {player.level}
                </span>
              </h2>
              <div className="text-slate-400 text-xs flex gap-3 mt-1">
                <span>Style: <strong className="text-cyan-300">{player.combatStyle}</strong></span>
                <span>Rank: <strong className="text-amber-300">{player.saintRank}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4 w-full md:w-auto justify-between md:justify-start">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">HEALTH POINTS</div>
              <div className="text-base font-bold text-red-400">{player.hp} / {player.maxHp} HP</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">CARRY WEIGHT</div>
              <div className={`text-base font-bold ${currentWeight > maxWeight ? 'text-red-400' : 'text-emerald-400'}`}>
                {currentWeight} / {maxWeight} kg
              </div>
            </div>
          </div>
        </div>

        {/* Active Perk Card */}
        <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <div>
              <span className="font-bold text-purple-300 text-xs uppercase">ACTIVE PERK: {perk.replace('_', ' ')}</span>
              <p className="text-[10px] text-slate-400">
                {perk === 'ACROBAT' && 'Enables 2-tile Double Jump over obstacles (Spacebar).'}
                {perk === 'PACK_MULE' && '+50% Inventory Carry Weight Capacity (150 kg limit).'}
                {perk === 'SWIFT_TRAVELER' && '+25% Overworld Movement Speed.'}
                {perk === 'MASTER_TAMER' && '+15% Catch Rate boost for wild Beasts.'}
                {perk === 'STAMINA_SURGE' && '+30 Max HP & accelerated passive health regen.'}
              </p>
            </div>
          </div>
          <span className="text-[9px] px-2 py-0.5 bg-purple-900/60 text-purple-200 border border-purple-700 rounded font-bold uppercase">
            ACTIVE
          </span>
        </div>

        {/* Equipped Gear Slots */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
          <h3 className="font-bold text-amber-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-4 h-4" /> EQUIPPED GEAR
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {['head', 'chest', 'legs', 'weapon'].map(slot => {
              const itemKey = (equipment as any)[slot];
              const itemInfo = itemKey ? ITEM_DB[itemKey] : null;

              return (
                <div key={slot} className="p-2.5 bg-black/40 border border-slate-800 rounded-lg flex flex-col justify-between">
                  <span className="text-[9px] text-slate-500 uppercase font-bold">{slot}</span>
                  <span className="font-bold text-xs text-slate-200 truncate mt-1">
                    {itemInfo?.name || 'Empty Slot'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 27 Skills Progress Grid */}
        <div className="space-y-4">
          <h3 className="font-bold text-emerald-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-4 h-4" /> 27 SKILL PROGRESSION
          </h3>

          {Object.entries(skillCategories).map(([catName, catSkills]) => (
            <div key={catName} className="space-y-2">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-1">
                {catName} Skills
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {catSkills.map(sName => {
                  const sData = skills[sName] || { level: 1, xp: 0 };
                  const nextXp = sData.level * 100;
                  const progressPct = Math.min(100, Math.floor((sData.xp / nextXp) * 100));

                  return (
                    <div key={sName} className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-200">{sName}</span>
                        <span className="font-bold text-emerald-400">LVL {sData.level}</span>
                      </div>
                      <div className="w-full bg-black/80 h-1.5 rounded-full overflow-hidden border border-slate-800">
                        <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500">
                        <span>XP: {sData.xp}</span>
                        <span>{progressPct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

      </div>
    </RpgPanel>
  );
}
