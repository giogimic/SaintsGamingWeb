'use client';

import React, { useState } from 'react';
import { useGameStore } from './store';
import { HudPanelShell } from './hud/HudPanelShell';
import { calculateCombatLevelFromXp, isCombatSkillTyping, normalizeSkillSlug, getMaxProgress, isMaxCapeEligible } from '@/shared/game/skillTypings';
import { getSkillGuide } from '@/shared/game/skillGuideData';
import { SkillInspectPanel } from './SkillGuideModal';
import SkillGuideFull from './SkillGuideFull';
import {
  Zap,
  Sparkles,
  Trophy,
  Crown,
  Sword,
  Pickaxe,
  Hammer,
  Shield,
  Dumbbell,
  Heart,
  Crosshair,
  Wind,
  Eye,
  BookOpen,
  Cpu,
  Sprout,
  Fish,
  Target,
  Axe,
  Home,
  UtensilsCrossed,
  Flame,
  Feather,
  FlaskConical,
  Sparkle,
  Anvil,
  Key,
  Wand2,
  Sun,
  Skull,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

const SKILL_ICONS: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  attack: Sword,
  strength: Dumbbell,
  defence: Shield,
  hitpoints: Heart,
  ranged: Crosshair,
  agility: Wind,
  perception: Eye,
  wisdom: BookOpen,
  intelligence: Cpu,
  farming: Sprout,
  fishing: Fish,
  hunter: Target,
  mining: Pickaxe,
  woodcutting: Axe,
  construction: Home,
  cooking: UtensilsCrossed,
  crafting: Hammer,
  firemaking: Flame,
  fletching: Feather,
  herblore: FlaskConical,
  runecrafting: Sparkle,
  smithing: Anvil,
  thieving: Key,
  summoning: Sparkles,
  magic: Wand2,
  prayer: Sun,
  necromancy: Skull,
};

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
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [guideSkill, setGuideSkill] = useState<string | null>(null);

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
  const maxProgress = getMaxProgress(skills);
  const isMaxed = maxProgress.isMaxed || isMaxCapeEligible(skills);

  // Whether a skill is selected for inspect
  const hasInspect = !!selectedSkill;

  return (
    <>
      <div className="pointer-events-auto z-40 flex w-[min(96vw,860px)] max-w-full flex-col font-mono text-xs select-none relative">
        <HudPanelShell 
          title="SAINT SKILLS & PROFICIENCY" 
          icon={<Zap className="w-4 h-4 text-amber-400" />}
          onClose={() => setGameMode('EXPLORING')}
          headerRight={
            <div className="flex items-center gap-1.5">
              {isMaxed ? (
                <span className="text-[9px] font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400/60 uppercase flex items-center gap-1 shadow-sm">
                  <Crown className="w-3 h-3 text-amber-400 inline" /> MAXED GRANDMASTER
                </span>
              ) : (
                <span className="text-[9px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40 uppercase">
                  {maxProgress.maxedSkillsCount} / 27 MAXED
                </span>
              )}
            </div>
          }
        >
          <div className="flex flex-col gap-3 h-[72vh] p-3">
            {/* Total Level & XP Summary Strip with Max Cape Progress */}
            <div className="p-3 bg-black/60 border border-amber-500/30 rounded-xl flex flex-col gap-2 shadow-inner shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">TOTAL LEVEL</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-amber-400 font-black text-base">{maxProgress.totalLevel}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">/ {maxProgress.maxTotalLevel}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">TOTAL EXPERIENCE</span>
                  <span className="text-cyan-300 font-bold text-sm">{Math.floor(maxProgress.totalXp).toLocaleString()} XP</span>
                </div>
              </div>

              {/* Max Cape / Master Totem Milestone Bar */}
              <div className="space-y-1 pt-1 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-amber-300/80 flex items-center gap-1 font-semibold uppercase">
                    <Crown className="w-2.5 h-2.5 text-amber-400 inline" /> Max Cape Progress
                  </span>
                  <span className="text-slate-400 font-bold">
                    {maxProgress.percentComplete}% ({maxProgress.maxedSkillsCount}/27 Skills)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-black/80 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(2, maxProgress.percentComplete)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Main Content: Full-Width Responsive Grid */}
            <div className="flex-1 min-h-0 w-full overflow-y-auto pr-1 custom-scrollbar space-y-4">
              {Object.entries(SKILL_CATEGORIES).map(([category, skillList]) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center gap-2 border-b border-amber-500/20 pb-1.5">
                    {category === 'Combat' && <Sword className="w-4 h-4 text-rose-400" />}
                    {category === 'Gathering' && <Pickaxe className="w-4 h-4 text-emerald-400" />}
                    {category === 'Artisan' && <Hammer className="w-4 h-4 text-amber-400" />}
                    {category === 'Support' && <Shield className="w-4 h-4 text-sky-400" />}
                    <h3 className="text-white font-bold uppercase tracking-wider text-xs">
                      {category} Skills
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
                    {skillList.map((skill) => {
                      const slug = normalizeSkillSlug(skill);
                      const guide = getSkillGuide(slug);
                      const data = skillLookup(skills, skill);
                      const nextLevelXp = getXpForNextLevel(skill, data.level, data.xp);
                      const prevLevelXp = data.level > 1 ? getXpForNextLevel(skill, data.level - 1, 0) : 0;
                      const xpSpan = Math.max(1, nextLevelXp - prevLevelXp);
                      const currentProgress = Math.min(100, Math.max(0, ((data.xp - prevLevelXp) / xpSpan) * 100));
                      const combatHint =
                        isCombatSkillTyping(slug) && data.xp === 0
                          ? calculateCombatLevelFromXp(0)
                          : null;

                      const IconComp = SKILL_ICONS[slug] || Zap;
                      const isSelected = selectedSkill === slug;

                      return (
                        <div
                          key={skill}
                          onClick={() => {
                            soundSynth?.playSelectSound?.();
                            setSelectedSkill(isSelected ? null : slug);
                          }}
                          className={`group relative bg-black/60 border p-2.5 sm:p-3 flex flex-col justify-between hover:border-amber-400 hover:bg-amber-950/30 transition-all rounded-xl cursor-pointer active:scale-95 shadow-md min-h-[64px] ${
                            isSelected
                              ? 'border-amber-400 bg-amber-950/30 ring-1 ring-amber-400/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                              : 'border-slate-800'
                          }`}
                          title={`Click to inspect ${skill}`}
                        >
                          <div className="flex items-center justify-between w-full gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105"
                                style={{
                                  backgroundColor: `${guide?.themeColor || '#fbbf24'}15`,
                                  borderColor: `${guide?.themeColor || '#fbbf24'}40`,
                                }}
                              >
                                <IconComp
                                  className="w-4 h-4 sm:w-4.5 sm:h-4.5 flex-none"
                                  style={{ color: guide?.themeColor || '#fbbf24' }}
                                />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[11px] sm:text-xs text-slate-200 font-bold uppercase truncate">
                                  {skill}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  LV {data.level}
                                </span>
                              </div>
                            </div>
                            <span className="text-amber-400 font-black text-sm shrink-0 font-mono">
                              {data.level}
                            </span>
                          </div>

                          {/* Progress Bar Under Skill */}
                          <div className="w-full h-1.5 bg-black/80 rounded-full overflow-hidden border border-slate-800 mt-2">
                            <div 
                              className="h-full transition-all duration-300 rounded-full"
                              style={{
                                width: `${currentProgress}%`,
                                backgroundColor: guide?.themeColor || '#eab308',
                              }}
                            />
                          </div>

                          {/* Hover Tooltip */}
                          <div className="hidden group-hover:flex absolute -top-10 left-1/2 -translate-x-1/2 bg-black/95 border border-amber-500/60 p-1.5 flex-col whitespace-nowrap z-50 text-[10px] text-amber-200 shadow-xl rounded-md pointer-events-none">
                            <span className="text-white font-bold">{skill} — Click to Inspect</span>
                            <span>
                              {Math.floor(data.xp).toLocaleString()} / {nextLevelXp.toLocaleString()} XP
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

      {/* Floating Inspect Window */}
      {hasInspect && selectedSkill && (
        <SkillInspectPanel
          skillSlug={selectedSkill}
          onClose={() => setSelectedSkill(null)}
          onOpenGuide={(slug) => {
            setSelectedSkill(null);
            setGuideSkill(slug);
          }}
        />
      )}

      {/* Floating Full Skill Guide Window */}
      {guideSkill && (
        <SkillGuideFull
          skillSlug={guideSkill}
          onClose={() => setGuideSkill(null)}
        />
      )}
    </>
  );
}
