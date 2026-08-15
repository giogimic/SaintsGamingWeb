'use client';

import { useGameStore } from './store';
import { HudPanelShell } from './hud/HudPanelShell';
import { calculateCombatLevelFromXp, isCombatSkillTyping, normalizeSkillSlug } from '@/shared/game/skillTypings';
import { Zap, Sparkles, Trophy, Sword, Pickaxe, Hammer, Shield } from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

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
    <div className="pointer-events-auto z-40 flex w-[min(95vw,620px)] max-w-full flex-col font-mono text-xs select-none">
      <HudPanelShell 
        title="SAINT SKILLS & PROFICIENCY" 
        icon={<Zap className="w-4 h-4 text-amber-400" />}
        onClose={() => setGameMode('EXPLORING')}
        headerRight={
          <span className="text-[9px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40 uppercase">
            27 PROFICIENCIES
          </span>
        }
      >
        <div className="flex flex-col gap-3 h-[68vh] p-3">
          {/* Total Level & XP Summary Strip */}
          <div className="p-3 bg-black/60 border border-amber-500/30 rounded-xl flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">TOTAL LEVEL</span>
                <span className="text-amber-400 font-black text-base">{totalLevel}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">TOTAL EXPERIENCE</span>
              <span className="text-cyan-300 font-bold text-sm">{Math.floor(totalXp).toLocaleString()} XP</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3">
            {Object.entries(SKILL_CATEGORIES).map(([category, skillList]) => (
              <div key={category} className="space-y-1.5">
                <div className="flex items-center gap-2 border-b border-amber-500/20 pb-1">
                  {category === 'Combat' && <Sword className="w-3.5 h-3.5 text-rose-400" />}
                  {category === 'Gathering' && <Pickaxe className="w-3.5 h-3.5 text-emerald-400" />}
                  {category === 'Artisan' && <Hammer className="w-3.5 h-3.5 text-amber-400" />}
                  {category === 'Support' && <Shield className="w-3.5 h-3.5 text-sky-400" />}
                  <h3 className="text-white font-bold uppercase tracking-wider text-xs">
                    {category} Skills
                  </h3>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
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
                        className="group relative bg-black/50 border border-slate-800 p-2 flex flex-col justify-between hover:border-amber-500/60 hover:bg-amber-950/20 transition-all rounded-lg cursor-pointer"
                        style={{
                          clipPath: 'polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px)',
                        }}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] text-slate-300 font-bold uppercase truncate max-w-[50px]">
                            {skill}
                          </span>
                          <span className="text-amber-400 font-black text-xs">
                            {data.level}
                          </span>
                        </div>

                        {/* Progress Bar Under Skill */}
                        <div className="w-full h-1 bg-black/80 rounded-full overflow-hidden border border-slate-800 mt-1.5">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-300"
                            style={{ width: `${currentProgress}%` }}
                          />
                        </div>

                        {/* Hover Tooltip */}
                        <div className="hidden group-hover:flex absolute -top-10 left-1/2 -translate-x-1/2 bg-black/95 border border-amber-500/60 p-1.5 flex-col whitespace-nowrap z-50 text-[10px] text-amber-200 shadow-xl rounded-md pointer-events-none">
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

        </div>
      </HudPanelShell>
    </div>
  );
}

