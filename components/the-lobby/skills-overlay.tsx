'use client';

import { useGameStore } from './store';
import RpgPanel from './rpg-panel';

const SKILL_CATEGORIES = {
  Combat: ['Attack', 'Constitution', 'Defence', 'Magic', 'Necromancy', 'Prayer', 'Ranged', 'Strength', 'Summoning'],
  Gathering: ['Farming', 'Fishing', 'Hunter', 'Mining', 'Woodcutting'],
  Artisan: ['Construction', 'Cooking', 'Crafting', 'Firemaking', 'Fletching', 'Herblore', 'Runecrafting', 'Smithing'],
  Support: ['Agility', 'Thieving']
};

export default function SkillsOverlay() {
  const skills = useGameStore(state => state.player.skills);
  const setGameMode = useGameStore(state => state.setGameMode);

  // Helper to calculate XP needed for next level
  const getXpForNextLevel = (level: number) => {
    return Math.pow(level, 2) * 50; // Inverse of Lvl = floor(sqrt(XP / 50)) + 1
  };



  return (
    <RpgPanel title="SAINT SKILLS" onClose={() => setGameMode('EXPLORING')}>
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {Object.entries(SKILL_CATEGORIES).map(([category, skillList]) => (
          <div key={category} className="mb-4">
            <h3 className="text-[#e2d5b3] font-bold mb-1 border-b border-[#806f47]/50 pb-1 uppercase tracking-wide text-xs drop-shadow-[1px_1px_2px_rgba(0,0,0,0.8)]">{category}</h3>
            <div className="grid grid-cols-3 gap-[3px]">
              {skillList.map(skill => {
                const data = skills[skill] || { level: 1, xp: 0 };
                const nextLevelXp = getXpForNextLevel(data.level);
                
                return (
                  <div 
                    key={skill} 
                    className="group relative bg-[#0b1320]/60 border border-[#806f47]/40 p-1 flex items-center justify-between hover:border-[#cbb26a] hover:bg-[#162238]/80 transition-colors cursor-help h-[36px] rounded-sm"
                  >
                    {/* Fake Icon Placeholder (first letter) */}
                    <div className="w-5 h-5 bg-[#050b14]/80 rounded-full flex items-center justify-center border border-[#806f47]/50 shadow-inner">
                      <span className="text-[#e2d5b3] text-[10px] font-bold uppercase">{skill.substring(0,2)}</span>
                    </div>
                    <span className="text-[#eab308] font-bold text-[13px] font-mono drop-shadow-[1px_1px_2px_rgba(0,0,0,0.8)]">
                      {data.level}
                    </span>

                    {/* Tooltip on Hover */}
                    <div className="hidden group-hover:flex absolute top-[-40px] left-1/2 -translate-x-1/2 bg-[#050b14]/95 border border-[#cbb26a] p-1.5 flex-col whitespace-nowrap z-50 text-[10px] text-[#e2d5b3] shadow-lg rounded-sm">
                      <span className="text-white font-bold">{skill} XP:</span>
                      <span>{Math.floor(data.xp).toLocaleString()} / {nextLevelXp.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; border: 1px solid #806f47; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}} />
    </RpgPanel>
  );
}
