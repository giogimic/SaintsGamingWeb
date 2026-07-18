'use client';

import { useGameStore } from './store';

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

  const renderSkillBar = (skillName: string) => {
    const data = skills[skillName];
    if (!data) return null;
    
    const nextLevelXp = getXpForNextLevel(data.level);
    const prevLevelXp = getXpForNextLevel(data.level - 1);
    const currentTierXp = data.xp - prevLevelXp;
    const tierTotalXp = nextLevelXp - prevLevelXp;
    const progress = Math.min(100, Math.max(0, (currentTierXp / tierTotalXp) * 100));

    return (
      <div key={skillName} className="bg-[#1a1a1a] p-2 border-2 border-[#333] rounded flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <span className="text-[#ca8a04] font-bold text-sm">{skillName}</span>
          <span className="text-white font-mono text-sm">Lv.{data.level}</span>
        </div>
        <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-[#333]">
          <div 
            className="h-full bg-[#ca8a04] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-right text-[10px] text-gray-500 font-mono">
          {Math.floor(data.xp)} / {nextLevelXp} XP
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 bg-[#0a0a0a]/95 flex flex-col p-4 border-4 border-[#333] rounded-lg backdrop-blur-sm z-30 animate-in fade-in duration-200">
      <div className="flex justify-between items-center mb-4 border-b-2 border-[#333] pb-2">
        <h2 className="text-xl md:text-2xl font-bold text-[#ca8a04] tracking-widest uppercase shadow-black drop-shadow-md">Saint Skills</h2>
        <button 
          onClick={() => setGameMode('EXPLORING')}
          className="px-4 py-1 bg-[#333] text-white font-bold rounded hover:bg-[#444] transition-colors"
        >
          X
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
        {Object.entries(SKILL_CATEGORIES).map(([category, skillList]) => (
          <div key={category}>
            <h3 className="text-white font-bold mb-2 border-b border-[#333] pb-1 uppercase tracking-wide text-sm">{category}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {skillList.map(skill => renderSkillBar(skill))}
            </div>
          </div>
        ))}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0a0a0a; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ca8a04; }
      `}} />
    </div>
  );
}
