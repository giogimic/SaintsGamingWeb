'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useGameStore } from './store';
import { FloatingWindow } from './hud/FloatingWindow';
import {
  getSkillGuide,
  getAllSkillUnlocks,
  SkillUnlockMilestone,
  BattlepassTier,
} from '@/shared/game/skillGuideData';
import { normalizeSkillSlug, isCombatSkillTyping } from '@/shared/game/skillTypings';
import { getSkillCapeEmote, SkillCapeEmoteDef } from '@/shared/game/skillCapeEmotes';
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
  Trophy,
  Zap,
  Info,
  Crown,
  Layers,
  Dumbbell,
  Play,
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

const RARITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  COMMON: { bg: 'bg-slate-800/40', border: 'border-slate-700', text: 'text-slate-300' },
  UNCOMMON: { bg: 'bg-emerald-950/40', border: 'border-emerald-500/40', text: 'text-emerald-300' },
  RARE: { bg: 'bg-cyan-950/40', border: 'border-cyan-500/40', text: 'text-cyan-300' },
  EPIC: { bg: 'bg-purple-950/40', border: 'border-purple-500/40', text: 'text-purple-300' },
  LEGENDARY: { bg: 'bg-amber-950/40', border: 'border-amber-500/40', text: 'text-amber-300' },
  MYTHIC: { bg: 'bg-rose-950/40', border: 'border-rose-500/40', text: 'text-rose-300' },
};

interface SkillGuideFullProps {
  skillSlug: string;
  onClose: () => void;
}

export default function SkillGuideFull({ skillSlug, onClose }: SkillGuideFullProps) {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'UNLOCKS' | 'BATTLEPASS'>('OVERVIEW');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [activeEmotePreview, setActiveEmotePreview] = useState<SkillCapeEmoteDef | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [skillSlug, activeTab]);

  const capeEmoteDef = useMemo(() => getSkillCapeEmote(skillSlug), [skillSlug]);

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

  const filteredUnlocks = allUnlocks.filter((u) => {
    if (filterType === 'ALL') return true;
    return u.type === filterType;
  });

  return (
    <FloatingWindow
      id={`skill-guide-full-${guide.slug}`}
      title={`${guide.name.toUpperCase()} — PROFICIENCY GUIDE`}
      icon={renderSkillIcon(guide.iconName, 'w-4 h-4 text-amber-400')}
      isOpen={true}
      onClose={onClose}
      defaultWidth={720}
      defaultHeight={620}
      minWidth={480}
      minHeight={380}
      headerRight={
        <span
          className="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider"
          style={{
            backgroundColor: `${guide.themeColor}15`,
            borderColor: `${guide.themeColor}40`,
            color: guide.themeColor,
          }}
        >
          {guide.category} • LEVEL {currentLevel}/{guide.maxLevel}
        </span>
      }
      className="border border-amber-500/40 shadow-2xl"
      bodyClassName="h-[calc(100%-44px)] flex flex-col"
    >
      <div ref={contentRef} className="flex flex-col gap-3 h-full overflow-y-auto p-3 font-mono text-xs custom-scrollbar select-none">
        {/* Compact Hero Strip */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between gap-3 bg-gradient-to-r ${guide.bgGradient} border-amber-500/30 shadow-lg shrink-0`}
        >
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
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white">{guide.name}</h2>
                <span className="text-[9px] text-slate-400">({guide.tagline})</span>
              </div>
              <p className="text-[10px] text-slate-300 line-clamp-1 max-w-sm">{guide.summary}</p>
            </div>
          </div>

          {/* XP Gauge */}
          <div className="flex-none w-48 bg-black/60 p-2 rounded-lg border border-white/10 flex flex-col gap-0.5 shrink-0">
            <div className="flex justify-between items-center text-[9px]">
              <span className="text-slate-400 font-bold">XP PROGRESS</span>
              <span className="text-amber-300 font-black">
                {currentXp.toLocaleString()} / {Math.floor(nextLevelXp).toLocaleString()}
              </span>
            </div>
            <div className="w-full h-1.5 bg-black/80 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: guide.themeColor,
                  boxShadow: `0 0 8px ${guide.themeColor}`,
                }}
              />
            </div>
            <div className="flex justify-between items-center text-[8px] text-slate-500 font-bold">
              <span>Lv {currentLevel}</span>
              <span>{Math.round(progressPercent)}%</span>
              <span>Lv {Math.min(guide.maxLevel, currentLevel + 1)}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-amber-500/20 pb-2 shrink-0">
          <button
            onClick={() => { soundSynth?.playSelectSound?.(); setActiveTab('OVERVIEW'); }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'bg-amber-400 text-black shadow-md'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Info className="w-3.5 h-3.5" /> Overview
          </button>
          <button
            onClick={() => { soundSynth?.playSelectSound?.(); setActiveTab('UNLOCKS'); }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs cursor-pointer ${
              activeTab === 'UNLOCKS'
                ? 'bg-amber-400 text-black shadow-md'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Milestones ({allUnlocks.length})
          </button>
          <button
            onClick={() => { soundSynth?.playSelectSound?.(); setActiveTab('BATTLEPASS'); }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs cursor-pointer ${
              activeTab === 'BATTLEPASS'
                ? 'bg-amber-400 text-black shadow-md'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Crown className="w-3.5 h-3.5" /> Battlepass ({guide.battlepassTiers.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
          {/* TAB: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-4 py-1">
              {/* Per-Level Perks */}
              <div className="p-3 bg-black/40 border border-amber-500/20 rounded-xl space-y-2">
                <h3 className="text-amber-400 font-bold uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  What Every Level Grants
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {guide.perLevelPerks.map((perk, i) => (
                    <div key={i} className="flex items-start gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-none mt-0.5" />
                      <span className="text-slate-200 text-[11px] leading-relaxed">{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Training Methods */}
              <div className="p-3 bg-black/40 border border-amber-500/20 rounded-xl space-y-2">
                <h3 className="text-cyan-400 font-bold uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-cyan-400" />
                  Recommended Training Methods
                </h3>
                <div className="space-y-1.5">
                  {guide.trainingMethods.map((method, i) => (
                    <div key={i} className="flex items-start gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <ChevronRight className="w-3.5 h-3.5 text-cyan-400 flex-none mt-0.5" />
                      <span className="text-slate-300 text-[11px] leading-relaxed">{method}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: MILESTONE UNLOCKS */}
          {activeTab === 'UNLOCKS' && (
            <div className="space-y-3 py-1">
              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pb-1">
                {['ALL', 'EQUIPMENT', 'ABILITY', 'RECIPE', 'GATHER', 'PASSIVE', 'ZONE'].map((type) => (
                  <button
                    key={type}
                    onClick={() => { soundSynth?.playUiClick?.(); setFilterType(type); }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      filterType === type
                        ? 'bg-amber-400 text-black'
                        : 'bg-black/40 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Unlocks List */}
              <div className="space-y-2">
                {filteredUnlocks.map((milestone, idx) => {
                  const isUnlocked = currentLevel >= milestone.level;
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        isUnlocked
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-200'
                          : 'bg-black/40 border-slate-800/80 text-slate-500 opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs border ${
                            isUnlocked
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : 'bg-slate-900 text-slate-600 border-slate-800'
                          }`}
                        >
                          {milestone.level}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-xs ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                              {milestone.title}
                            </span>
                            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-black/40 border border-white/10 text-slate-400">
                              {milestone.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{milestone.description}</p>
                        </div>
                      </div>
                      <div className="flex-none">
                        {isUnlocked ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> UNLOCKED
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-black/40 px-2 py-0.5 rounded border border-slate-800">
                            <Lock className="w-3 h-3" /> LV {milestone.level}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: BATTLEPASS */}
          {activeTab === 'BATTLEPASS' && (
            <div className="space-y-4 py-1">
              <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl text-[11px] text-amber-200 flex items-center justify-between">
                <span>
                  Level up <strong className="text-white">{guide.name}</strong> to unlock exclusive nameplate
                  titles, particle auras, emotes, and master capes at tiered milestones!
                </span>
                {capeEmoteDef && (
                  <button
                    onClick={() => { soundSynth?.playLevelUpSound?.(); setActiveEmotePreview(capeEmoteDef); }}
                    className="flex-none px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                    title="Preview Cape Emote Visual FX"
                  >
                    <Play className="w-3 h-3 fill-current" /> Preview Cape FX
                  </button>
                )}
              </div>

              {/* Active Emote FX Player Banner */}
              {activeEmotePreview && (
                <div className="p-3 bg-gradient-to-r from-amber-950/80 via-black to-amber-950/80 border-2 border-amber-400 rounded-xl flex items-center justify-between gap-3 animate-pulse shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-400 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] uppercase font-black text-amber-400 bg-amber-950 px-1.5 py-0.2 rounded border border-amber-500/50">
                          EMOTE FX ACTIVE
                        </span>
                        <span className="text-white font-bold text-xs">{activeEmotePreview.emoteName}</span>
                      </div>
                      <p className="text-[10px] text-amber-200/90 mt-0.5 max-w-md leading-tight">
                        {activeEmotePreview.description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveEmotePreview(null)}
                    className="flex-none px-2 py-0.5 rounded bg-black/60 hover:bg-red-950 border border-slate-700 hover:border-red-500 text-slate-300 hover:text-red-300 text-[10px] font-bold cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div className="space-y-2.5">
                {guide.battlepassTiers.map((tier) => {
                  const isUnlocked = currentLevel >= tier.level;
                  const rarity = RARITY_COLORS[tier.rarity] || RARITY_COLORS.COMMON;
                  const isEmoteOrCape = tier.rewardType === 'CAPE' || tier.rewardType === 'EMOTE';

                  return (
                    <div
                      key={tier.tier}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        isUnlocked
                          ? `${rarity.bg} ${rarity.border} shadow-md`
                          : 'bg-black/40 border-slate-800/80 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 ${
                            isUnlocked ? `${rarity.border} bg-black/60` : 'border-slate-800 bg-slate-950'
                          }`}
                        >
                          {renderSkillIcon(tier.iconName, `w-5 h-5 ${isUnlocked ? rarity.text : 'text-slate-600'}`)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-black text-xs ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                              {tier.rewardName}
                            </span>
                            <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold border ${rarity.border} ${rarity.text} bg-black/40`}>
                              {tier.rarity}
                            </span>
                            <span className="text-[9px] uppercase text-slate-500">[{tier.rewardType}]</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{tier.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-none">
                        {isEmoteOrCape && capeEmoteDef && (
                          <button
                            onClick={() => { soundSynth?.playLevelUpSound?.(); setActiveEmotePreview(capeEmoteDef); }}
                            className="px-2 py-1 rounded bg-black/60 hover:bg-amber-950/60 border border-slate-700 hover:border-amber-400 text-slate-300 hover:text-amber-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                            title="Preview Emote"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" /> FX
                          </button>
                        )}
                        {isUnlocked ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/40">
                            <Award className="w-3.5 h-3.5 text-amber-400" /> CLAIMED
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-black/60 px-2.5 py-1 rounded-lg border border-slate-800">
                            <Lock className="w-3.5 h-3.5 text-slate-600" /> LV {tier.level}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </FloatingWindow>
  );
}
