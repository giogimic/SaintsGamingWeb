'use client';

import { useGameStore } from './store';
import RpgPanel from './rpg-panel';
import { calculateCombatLevelFromXp, isCombatSkillTyping, normalizeSkillSlug } from '@/shared/game/skillTypings';

const SKILL_CATEGORIES = {
  Combat: [
    'Attack',
    'Strength',
    'Defence',
    'Hitpoints',
    'Ranged',
    'Agility',
    'Perception',
    'Wisdom',
    'Intelligence',
  ],
  Gathering: ['Farming', 'Fishing', 'Hunter', 'Mining', 'Woodcutting'],
  Artisan: [
    'Construction',
    'Cooking',
    'Crafting',
    'Firemaking',
    'Fletching',
    'Herblore',
    'Runecrafting',
    'Smithing',
  ],
  Support: ['Magic', 'Prayer', 'Necromancy', 'Summoning', 'Thieving'],
};

function skillLookup(
  skills: Record<string, { level: number; xp: number }>,
  label: string
): { level: number; xp: number } {
  if (skills[label]) return skills[label];
  const lower = label.toLowerCase();
  if (skills[lower]) return skills[lower];
  // Legacy Constitution → Hitpoints
  if (label === 'Hitpoints' && skills['Constitution']) return skills['Constitution'];
  return { level: 1, xp: 0 };
}

export default function SkillsOverlay() {
  const skills = useGameStore((state) => state.player.skills);
  const setGameMode = useGameStore((state) => state.setGameMode);

  const getXpForNextLevel = (skillLabel: string, level: number, xp: number) => {
    const slug = normalizeSkillSlug(skillLabel);
    if (isCombatSkillTyping(slug)) {
      if (level >= 50) return 0;
      // Inverse of floor(sqrt(xp/50))+1 → next level needs (level)^2 * 50
      return level * level * 50;
    }
    if (level >= 99) return 0;
    let requiredXp = 0;
    for (let i = 1; i <= level; i++) {
      requiredXp += Math.floor(i + 300 * Math.pow(2, i / 7)) / 4;
    }
    return requiredXp;
  };

  const allSkillNames = Object.values(SKILL_CATEGORIES).flat();
  const totalLevel = allSkillNames.reduce((acc, skill) => acc + skillLookup(skills, skill).level, 0);
  const totalXp = allSkillNames.reduce((acc, skill) => acc + skillLookup(skills, skill).xp, 0);

  return (
    <RpgPanel title="SAINT SKILLS" onClose={() => setGameMode('EXPLORING')}>
      {/* Total Level & XP Summary Strip */}
      <div className="mb-3 px-3 py-2 bg-[#050b14]/90 border border-[#806f47]/50 rounded-sm flex items-center justify-between text-xs shadow-inner">
        <div>
          <span className="text-[#806f47] font-bold uppercase tracking-wider text-[10px]">Total Level: </span>
          <span className="text-[#eab308] font-bold font-mono text-sm drop-shadow-[1px_1px_2px_rgba(0,0,0,0.8)]">{totalLevel}</span>
        </div>
        <div>
          <span className="text-[#806f47] font-bold uppercase tracking-wider text-[10px]">Total XP: </span>
          <span className="text-[#e2d5b3] font-mono font-medium">{Math.floor(totalXp).toLocaleString()}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {Object.entries(SKILL_CATEGORIES).map(([category, skillList]) => (
          <div key={category} className="mb-3">
            <h3 className="text-[#e2d5b3] font-bold mb-1 border-b border-[#806f47]/50 pb-1 uppercase tracking-wide text-xs drop-shadow-[1px_1px_2px_rgba(0,0,0,0.8)]">
              {category}
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-[3px]">
              {skillList.map((skill) => {
                const data = skillLookup(skills, skill);
                const nextLevelXp = getXpForNextLevel(skill, data.level, data.xp);
                const prevLevelXp = data.level > 1 ? getXpForNextLevel(skill, data.level - 1, 0) : 0;
                const xpSpan = Math.max(1, nextLevelXp - prevLevelXp);
                const currentProgress = Math.min(100, Math.max(0, ((data.xp - prevLevelXp) / xpSpan) * 100));
                const combatHint =
                  isCombatSkillTyping(normalizeSkillSlug(skill)) && data.xp === 0
                    ? calculateCombatLevelFromXp(0)
                    : null;

                return (
                  <div
                    key={skill}
                    className="group relative bg-[#0b1320]/60 border border-[#806f47]/40 p-1 flex flex-col justify-between hover:border-[#cbb26a] hover:bg-[#162238]/80 transition-colors cursor-help h-[40px] rounded-sm overflow-hidden"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="w-4 h-4 bg-[#050b14]/80 rounded-full flex items-center justify-center border border-[#806f47]/50 shadow-inner">
                        <span className="text-[#e2d5b3] text-[9px] font-bold uppercase">
                          {skill.substring(0, 2)}
                        </span>
                      </div>
                      <span className="text-[#eab308] font-bold text-[13px] font-mono drop-shadow-[1px_1px_2px_rgba(0,0,0,0.8)]">
                        {data.level}
                      </span>
                    </div>

                    {/* Progress Bar Under Skill */}
                    <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden border border-white/5 mt-0.5">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-300"
                        style={{ width: `${currentProgress}%` }}
                      />
                    </div>

                    <div className="hidden group-hover:flex absolute top-[-40px] left-1/2 -translate-x-1/2 bg-[#050b14]/95 border border-[#cbb26a] p-1.5 flex-col whitespace-nowrap z-50 text-[10px] text-[#e2d5b3] shadow-lg rounded-sm">
                      <span className="text-white font-bold">{skill} XP:</span>
                      <span>
                        {Math.floor(data.xp).toLocaleString()} / {nextLevelXp.toLocaleString()}
                        {combatHint !== null ? ' (combat curve)' : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; border: 1px solid #806f47; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `,
        }}
      />
    </RpgPanel>
  );
}
