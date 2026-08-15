'use client';

import React, { useMemo } from 'react';
import { useGameStore } from './store';
import { HudPanelShell } from './hud/HudPanelShell';
import { getSkillGuide, getAllSkillUnlocks } from '@/shared/game/skillGuideData';
import { normalizeSkillSlug, isCombatSkillTyping } from '@/shared/game/skillTypings';
import {
  Sword,
  Shield,
  Heart,
  Crosshair,
  Wind,
  Eye,
  BookOpen,
  Cpu,
  Sprout,
  Fish,
  Target,
  Pickaxe,
  Axe,
  Home,
  UtensilsCrossed,
  Hammer,
  Flame,
  Feather,
  FlaskConical,
  Sparkle,
  Anvil,
  Key,
  Sparkles,
  Wand2,
  Sun,
  Skull,
  Award,
  CheckCircle2,
  Lock,
  ChevronRight,
  Zap,
  Crown,
  Dumbbell,
  BookMarked,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Sword, Dumbbell, Shield, Heart, Crosshair, Wind, Eye, BookOpen, Cpu,
  Sprout, Fish, Target, Pickaxe, Axe, Home, UtensilsCrossed, Hammer,
  Flame, Feather, FlaskConical, Sparkle, Anvil, Key, Sparkles, Wand2,
  Sun, Skull, Award, Crown,
};

function renderSkillIcon(iconName: string, className?: string) {
  const IconComponent = ICON_MAP[iconName] || Zap;
  return <IconComponent className={className || 'w-5 h-5'} />;
}

interface SkillInspectPanelProps {
  skillSlug: string;
  onClose: () => void;
  onOpenGuide: (slug: string) => void;
}

/**
 * Level 2 — Inspect: Compact skill detail panel.
 *
 * Shows focused contextual information for a single skill:
 * icon, name, level, XP, summary, condensed perks, next unlock,
 * and a VIEW IN GUIDE button to escalate to the full guide (Level 3).
 *
 * This replaces the old full-screen SkillGuideModal for the initial
 * click interaction. No scrolling required — all content fits in view.
 */
export function SkillInspectPanel({ skillSlug, onClose, onOpenGuide }: SkillInspectPanelProps) {
  const skills = useGameStore((state) => state.player.skills);
  const guide = useMemo(() => getSkillGuide(skillSlug), [skillSlug]);

  const skillData = useMemo(() => {
    const slug = normalizeSkillSlug(skillSlug);
    const capitalized = slug.charAt(0).toUpperCase() + slug.slice(1);
    return skills[capitalized] || skills[slug] || { level: 1, xp: 0 };
  }, [skills, skillSlug]);

  const allUnlocks = useMemo(() => getAllSkillUnlocks(skillSlug), [skillSlug]);

  if (!guide) return null;

  const currentLevel = skillData.level || 1;
  const currentXp = Math.floor(skillData.xp || 0);

  const isCombat = isCombatSkillTyping(guide.slug);
  const maxLevel = guide.maxLevel;
  const isMaxed = currentLevel >= maxLevel;

  const nextLevelXp = isCombat
    ? currentLevel >= 50
      ? currentXp
      : currentLevel * currentLevel * 50
    : currentLevel >= 99
    ? currentXp
    : Array.from({ length: currentLevel }).reduce(
        (acc: number, _, i) => acc + Math.floor(i + 1 + 300 * Math.pow(2, (i + 1) / 7)) / 4,
        0
      );

  const prevLevelXp = isCombat
    ? currentLevel > 1
      ? (currentLevel - 1) * (currentLevel - 1) * 50
      : 0
    : currentLevel > 1
    ? Array.from({ length: currentLevel - 1 }).reduce(
        (acc: number, _, i) => acc + Math.floor(i + 1 + 300 * Math.pow(2, (i + 1) / 7)) / 4,
        0
      )
    : 0;

  const xpSpan = Math.max(1, nextLevelXp - prevLevelXp);
  const progressPercent = Math.min(100, Math.max(0, ((currentXp - prevLevelXp) / xpSpan) * 100));

  // Find the next locked milestone
  const nextUnlock = allUnlocks.find((u) => u.level > currentLevel);
  // Find the most recently unlocked milestone
  const lastUnlocked = [...allUnlocks].reverse().find((u) => u.level <= currentLevel);

  return (
    <HudPanelShell
      title={`${guide.name.toUpperCase()} — INSPECT`}
      icon={renderSkillIcon(guide.iconName, 'w-4 h-4')}
      onClose={onClose}
      headerRight={
        <span
          className="px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase"
          style={{
            backgroundColor: `${guide.themeColor}15`,
            borderColor: `${guide.themeColor}40`,
            color: guide.themeColor,
          }}
        >
          {guide.category}
        </span>
      }
      className="w-full"
    >
      <div className="flex flex-col gap-2.5 p-2.5 font-mono text-xs">
        {/* Skill Identity Row */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center border-2 shadow-inner shrink-0"
            style={{
              backgroundColor: `${guide.themeColor}20`,
              borderColor: guide.themeColor,
              boxShadow: `0 0 12px ${guide.themeColor}30`,
            }}
          >
            {renderSkillIcon(guide.iconName, 'w-5 h-5 text-white')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-white font-black text-sm">{guide.name}</span>
              <span className="text-amber-400 font-black text-sm">
                {isMaxed ? (
                  <span className="flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-400 inline" />
                    {currentLevel}
                  </span>
                ) : (
                  `${currentLevel} / ${maxLevel}`
                )}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 line-clamp-2 leading-snug mt-0.5">{guide.summary}</p>
          </div>
        </div>

        {/* XP Progress */}
        <div className="bg-black/50 p-2 rounded-lg border border-slate-800">
          <div className="flex justify-between items-center text-[9px] mb-1">
            <span className="text-slate-400 font-bold">EXPERIENCE</span>
            <span className="text-amber-300 font-black">
              {isMaxed ? (
                'MASTERED'
              ) : (
                <>{currentXp.toLocaleString()} / {Math.floor(nextLevelXp).toLocaleString()} XP</>
              )}
            </span>
          </div>
          <div className="w-full h-1.5 bg-black/80 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full transition-all duration-500 rounded-full"
              style={{
                width: `${isMaxed ? 100 : progressPercent}%`,
                backgroundColor: guide.themeColor,
                boxShadow: `0 0 6px ${guide.themeColor}`,
              }}
            />
          </div>
        </div>

        {/* Condensed Per-Level Effects (max 3) */}
        <div className="space-y-1">
          {guide.perLevelPerks.slice(0, 3).map((perk, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px]">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-none mt-0.5" />
              <span className="text-slate-300 leading-snug">{perk}</span>
            </div>
          ))}
        </div>

        {/* Next Unlock / Last Unlocked */}
        {nextUnlock ? (
          <div className="bg-black/50 p-2 rounded-lg border border-amber-500/20 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-amber-400 font-bold uppercase">NEXT UNLOCK — LV {nextUnlock.level}</span>
                <span className="text-[8px] uppercase px-1 rounded bg-black/40 border border-white/10 text-slate-500">
                  {nextUnlock.type}
                </span>
              </div>
              <span className="text-[10px] text-slate-200 font-bold truncate block">{nextUnlock.title}</span>
            </div>
          </div>
        ) : lastUnlocked ? (
          <div className="bg-black/50 p-2 rounded-lg border border-emerald-500/20 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-emerald-400 font-bold uppercase">LATEST — LV {lastUnlocked.level}</span>
              </div>
              <span className="text-[10px] text-slate-200 font-bold truncate block">{lastUnlocked.title}</span>
            </div>
          </div>
        ) : null}

        {/* VIEW IN GUIDE Button */}
        <button
          onClick={() => {
            soundSynth?.playSelectSound?.();
            onOpenGuide(skillSlug);
          }}
          className="w-full py-2 bg-gradient-to-r from-amber-600/80 to-amber-500/80 hover:from-amber-500 hover:to-amber-400 text-white rounded-lg font-black text-[11px] uppercase tracking-wider transition-all active:scale-95 shadow-md border border-amber-400/50 cursor-pointer flex items-center justify-center gap-2"
        >
          <BookMarked className="w-3.5 h-3.5" />
          VIEW IN GUIDE
        </button>
      </div>
    </HudPanelShell>
  );
}

// Keep default export for backwards compatibility during migration
export default SkillInspectPanel;
