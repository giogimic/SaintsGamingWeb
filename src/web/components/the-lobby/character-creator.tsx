"use client";

import { useState } from "react";
import { createGameCharacter } from "@/app/actions/game";
import { Input } from "@/shared/ui/input";
import { User, Sparkles, Shield, Zap, ArrowLeft, ArrowRight, Wand2, Swords, Feather, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { INITIAL_SKILLS, useGameStore } from "./store";

// ─── Constants ────────────────────────────────────────────────────────────────

const PERKS = [
  { id: "SWIFT_TRAVELER", name: "Swift Traveler", desc: "+25% Movement Speed across all maps.", icon: Zap, color: '#fbbf24' },
  { id: "ACROBAT", name: "Acrobat", desc: "Perform 2-tile Double Jumps over obstacles.", icon: Feather, color: '#34d399' },
  { id: "PACK_MULE", name: "Pack Mule", desc: "+50% Inventory Carry Weight Capacity.", icon: Shield, color: '#60a5fa' },
  { id: "MASTER_TAMER", name: "Master Tamer", desc: "+15% Catch Rate boost for wild Beasts.", icon: User, color: '#f472b6' },
  { id: "STAMINA_SURGE", name: "Stamina Surge", desc: "+30 Max Health & accelerated health regen.", icon: Sparkles, color: '#a78bfa' },
];

const CLASSES = [
  {
    id: "WARRIOR", name: "Warrior",
    desc: "A frontline fighter with high health and physical power.",
    bonuses: { Attack: 15, Strength: 10, Constitution: 5 },
    icon: Swords,
    accent: '#f87171', glow: 'rgba(239,68,68,0.3)', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.35)',
  },
  {
    id: "MAGE", name: "Mage",
    desc: "An arcane spellcaster specializing in elemental magic.",
    bonuses: { Magic: 15, Defence: 5 },
    icon: Wand2,
    accent: '#a78bfa', glow: 'rgba(139,92,246,0.35)', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.4)',
  },
  {
    id: "THIEF", name: "Ranger",
    desc: "A swift scout who excels at agility and ranged attacks.",
    bonuses: { Ranged: 15, Agility: 10 },
    icon: Feather,
    accent: '#34d399', glow: 'rgba(16,185,129,0.3)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.35)',
  },
];

// Curated starter hero templates
const STARTER_HEROES = [
  {
    id: 'warrior',
    name: 'Warrior',
    classId: 'WARRIOR',
    sprite: 'warrior',
    flavor: 'Frontline champion. High HP, unstoppable in melee.',
    tag: 'Beginner Friendly',
    tagColor: '#34d399',
  },
  {
    id: 'paladin',
    name: 'Paladin',
    classId: 'WARRIOR',
    sprite: 'knight',
    flavor: 'Holy guardian. Superior defense, supports allies.',
    tag: 'Defensive',
    tagColor: '#60a5fa',
  },
  {
    id: 'mystic',
    name: 'Mystic',
    classId: 'MAGE',
    sprite: 'magician',
    flavor: 'Master of arcane arts. High burst, low defense.',
    tag: 'Advanced',
    tagColor: '#a78bfa',
  },
  {
    id: 'shadow',
    name: 'Shadow',
    classId: 'THIEF',
    sprite: 'rogue',
    flavor: 'Swift and lethal. Strike before you\'re seen.',
    tag: 'Skill Cap',
    tagColor: '#f472b6',
  },
  {
    id: 'ranger',
    name: 'Ranger',
    classId: 'THIEF',
    sprite: 'ninja',
    flavor: 'Agile hunter. Precision strikes from distance.',
    tag: 'Mobile',
    tagColor: '#fbbf24',
  },
  {
    id: 'monk',
    name: 'Monk',
    classId: 'WARRIOR',
    sprite: 'monk',
    flavor: 'Inner strength fighter. Balanced offense and utility.',
    tag: 'Balanced',
    tagColor: '#fb923c',
  },
];

type CreatorStep = 'HERO_PICK' | 'NAME' | 'APPEARANCE' | 'GIFT' | 'REVIEW';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StepHeader({
  label, onBack
}: { label: string; onBack?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {onBack ? (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all"
          style={{
            background: 'rgba(139,92,246,0.08)',
            border: '1px solid rgba(139,92,246,0.2)',
            color: 'rgba(196,181,253,0.6)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = 'rgba(221,214,254,0.9)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.4)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = 'rgba(196,181,253,0.6)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.2)';
          }}
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
          Back
        </button>
      ) : <div />}
      <h2
        className="text-3xl font-black tracking-wider"
        style={{
          fontFamily: 'serif',
          background: 'linear-gradient(180deg, #e8d5ff 0%, #a855f7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {label}
      </h2>
      <div className="w-20" />
    </div>
  );
}

function NextButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <div className="flex justify-end mt-8">
      <button
        disabled={disabled}
        onClick={onClick}
        className="flex items-center gap-3 px-8 py-3.5 rounded-xl font-black text-base tracking-wider uppercase transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #9333ea 100%)',
          boxShadow: '0 0 25px rgba(139,92,246,0.4), 0 4px 15px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)',
          color: 'white',
        }}
      >
        {label}
        <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CharacterCreator({ onComplete, onCancel }: { onComplete: (characterId: string) => void; onCancel?: () => void }) {
  const [step, setStep] = useState<CreatorStep>('HERO_PICK');
  const [name, setName] = useState('');
  const [spriteId, setSpriteId] = useState('warrior');
  const [classId, setClassId] = useState('WARRIOR');
  const [perkId, setPerkId] = useState(PERKS[0].id);
  const [loading, setLoading] = useState(false);
  const [spritePage, setSpritePage] = useState(0);

  // Build the big sprite list dynamically from GAME_SPRITES but lazy-import friendly
  const [allSprites, setAllSprites] = useState<string[]>([]);
  const spritesPerPage = 24;
  const totalPages = Math.ceil(allSprites.length / spritesPerPage);
  const currentSprites = allSprites.slice(spritePage * spritesPerPage, (spritePage + 1) * spritesPerPage);

  // Load sprite list lazily when user reaches that step
  const loadSprites = async () => {
    if (allSprites.length > 0) return;
    const { GAME_SPRITES } = await import('./data/sprites');
    setAllSprites(GAME_SPRITES);
  };

  const stepToNum: Record<CreatorStep, number> = {
    HERO_PICK: 1, NAME: 2, APPEARANCE: 3, GIFT: 4, REVIEW: 5,
  };
  const currentNum = stepToNum[step];
  const progressPct = ((currentNum - 1) / 4) * 100;

  const handleHeroPick = (hero: typeof STARTER_HEROES[0]) => {
    setSpriteId(hero.sprite);
    setClassId(hero.classId);
    setStep('NAME');
  };

  const handleCreate = async () => {
    if (!name || name.length < 3) {
      toast.error('Name must be at least 3 characters.');
      return;
    }
    setLoading(true);

    const selectedClass = CLASSES.find(c => c.id === classId);
    const initialSkills = JSON.parse(JSON.stringify(INITIAL_SKILLS));
    if (selectedClass) {
      Object.entries(selectedClass.bonuses).forEach(([skill, level]) => {
        if (initialSkills[skill]) initialSkills[skill].level = level;
      });
    }

    const initialState = {
      currentMapId: 'DEMO_SANDBOX',
      position: { x: 14, y: 15 },
      level: 1, xp: 0,
      hp: (perkId === 'STAMINA_SURGE' ? 130 : 100) + (initialSkills['Constitution']?.level || 1) * 10,
      maxHp: (perkId === 'STAMINA_SURGE' ? 130 : 100) + (initialSkills['Constitution']?.level || 1) * 10,
      credits: 1000,
      inventory: { 'capture_script': 10, 'patch_kit': 5 },
      skills: initialSkills,
      equipment: { head: null, chest: 'bronze_chestplate', legs: 'bronze_leggings', weapon: 'bronze_sword' },
      customization: { skinTone: '#fcd34d', hairColor: '#3b82f6', shirtColor: '#10b981', pantsColor: '#18181b' },
      combatStyle: classId,
      activeDaemonId: 'd-001',
      saintRank: 'Rookie',
      caughtDaemons: ['d-001'],
      assignedBeasts: { furnace: null, farm: null, fishing_hut: null },
      perk: perkId,
      maxWeight: perkId === 'PACK_MULE' ? 150 : 100,
      maxPartySize: 4,
    };

    const result = await createGameCharacter({ name, spriteId, classId, initialState: JSON.stringify(initialState) });

    if (result.success && result.character) {
      toast.success('Character Created! Entering The World...');
      setTimeout(() => onComplete(result.character.id), 300);
    } else {
      toast.error(result.error || 'Failed to create character.');
      setLoading(false);
      if (result.error === 'Unauthorized') {
        useGameStore.getState().setGameMode('LOGIN');
        window.dispatchEvent(new CustomEvent('close_creator'));
      }
    }
  };

  // Input style helper
  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(139,92,246,0.25)',
    color: '#e9d5ff',
    caretColor: '#a855f7',
  };
  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = '1px solid rgba(139,92,246,0.6)';
    e.currentTarget.style.background = 'rgba(139,92,246,0.08)';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.1)';
  };
  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = '1px solid rgba(139,92,246,0.25)';
    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
    e.currentTarget.style.boxShadow = 'none';
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 w-full h-full overflow-y-auto z-[100]"
      style={{ background: 'rgba(5,0,15,0.96)', backdropFilter: 'blur(14px)' }}
    >
      {/* Ambient glow */}
      <div
        className="fixed w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        }}
      />

      <div className="min-h-full flex flex-col items-center justify-center p-4 md:p-8 relative z-10">

        {/* Step breadcrumb */}
        <div className="w-full max-w-4xl mb-5 flex items-center justify-center gap-1 text-[11px] font-mono uppercase tracking-widest">
          {(['HERO_PICK', 'NAME', 'APPEARANCE', 'GIFT', 'REVIEW'] as CreatorStep[]).map((s, i) => {
            const labels: Record<CreatorStep, string> = {
              HERO_PICK: 'Hero', NAME: 'Name', APPEARANCE: 'Look', GIFT: 'Gift', REVIEW: 'Enter',
            };
            const done = stepToNum[s] < currentNum;
            const active = s === step;
            return (
              <div key={s} className="flex items-center gap-1">
                <span
                  style={{
                    color: active ? '#a855f7' : done ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.2)',
                    fontWeight: active ? 900 : 700,
                  }}
                >
                  {i + 1}. {labels[s]}
                </span>
                {i < 4 && <ChevronRight size={10} style={{ color: 'rgba(139,92,246,0.2)' }} />}
              </div>
            );
          })}
        </div>

        {/* Main panel */}
        <div
          className="w-full max-w-4xl rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, rgba(18,6,45,0.99) 0%, rgba(10,3,28,0.99) 100%)',
            border: '1px solid rgba(139,92,246,0.25)',
            boxShadow: '0 0 60px rgba(139,92,246,0.12), 0 25px 50px rgba(0,0,0,0.6)',
          }}
        >
          {/* Progress bar */}
          <div className="h-[3px] w-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
                boxShadow: '0 0 10px rgba(139,92,246,0.6)',
              }}
            />
          </div>

          <div className="p-6 md:p-10">

            {/* ─── STEP 1: Hero Pick ─── */}
            {step === 'HERO_PICK' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <StepHeader label="Choose Your Hero" onBack={onCancel ? () => onCancel() : undefined} />

                <p className="text-violet-400/40 text-sm font-mono mb-8 text-center tracking-widest">
                  Pick a starting archetype — you can customise appearance in the next step
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {STARTER_HEROES.map(hero => {
                    const cls = CLASSES.find(c => c.id === hero.classId)!;
                    return (
                      <div
                        key={hero.id}
                        onClick={() => handleHeroPick(hero)}
                        className="relative rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden group"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(139,92,246,0.15)',
                        }}
                        onMouseEnter={e => {
                          const el = e.currentTarget as HTMLElement;
                          el.style.background = cls.bg;
                          el.style.border = `1px solid ${cls.border}`;
                          el.style.boxShadow = `0 0 25px ${cls.glow}, 0 8px 25px rgba(0,0,0,0.4)`;
                          el.style.transform = 'translateY(-3px) scale(1.02)';
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget as HTMLElement;
                          el.style.background = 'rgba(255,255,255,0.03)';
                          el.style.border = '1px solid rgba(139,92,246,0.15)';
                          el.style.boxShadow = 'none';
                          el.style.transform = 'none';
                        }}
                      >
                        {/* Tag */}
                        <div
                          className="absolute top-3 right-3 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest"
                          style={{
                            background: `${hero.tagColor}18`,
                            border: `1px solid ${hero.tagColor}40`,
                            color: hero.tagColor,
                          }}
                        >
                          {hero.tag}
                        </div>

                        <div className="p-5">
                          {/* Sprite preview */}
                          <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all group-hover:scale-110"
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              border: `1px solid ${cls.accent}30`,
                            }}
                          >
                            <div
                              className="pixelated bg-no-repeat"
                              style={{
                                backgroundImage: `url('/game-assets/characters/${hero.sprite}.png')`,
                                backgroundPosition: '0px -64px',
                                backgroundSize: '96px 128px',
                                width: '32px',
                                height: '32px',
                                transform: 'scale(1.5)',
                              }}
                            />
                          </div>

                          <h3
                            className="text-lg font-black mb-1 transition-colors"
                            style={{ color: 'rgba(237,233,254,0.85)' }}
                          >
                            {hero.name}
                          </h3>
                          <p
                            className="text-[10px] font-black uppercase tracking-widest mb-3 font-mono"
                            style={{ color: `${cls.accent}70` }}
                          >
                            {cls.name}
                          </p>
                          <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(196,181,253,0.45)' }}>
                            {hero.flavor}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-center text-violet-600/25 text-xs font-mono mt-6">
                  Click any hero to begin
                </p>
              </div>
            )}

            {/* ─── STEP 2: Name ─── */}
            {step === 'NAME' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-md mx-auto">
                <StepHeader label="Name Your Hero" onBack={() => setStep('HERO_PICK')} />

                {/* Chosen hero preview */}
                <div
                  className="flex items-center gap-4 rounded-2xl p-4 mb-8"
                  style={{
                    background: 'rgba(139,92,246,0.08)',
                    border: '1px solid rgba(139,92,246,0.2)',
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.2)' }}
                  >
                    <div
                      className="pixelated bg-no-repeat"
                      style={{
                        backgroundImage: `url('/game-assets/characters/${spriteId}.png')`,
                        backgroundPosition: '0px -64px',
                        backgroundSize: '96px 128px',
                        width: '32px', height: '32px',
                        transform: 'scale(1.4)',
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-violet-200 font-black text-base">{spriteId.charAt(0).toUpperCase() + spriteId.slice(1)}</p>
                    <p className="text-violet-500/50 text-xs font-mono uppercase tracking-widest">{classId}</p>
                  </div>
                </div>

                {/* Name field */}
                <div className="mb-3">
                  <label className="block text-[10px] font-black text-violet-400/50 uppercase tracking-[0.2em] mb-2 px-1">
                    Character Name
                  </label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-4 rounded-xl font-black text-xl outline-none transition-all"
                    style={inputStyle}
                    onFocus={inputFocus as any}
                    onBlur={inputBlur as any}
                    placeholder="Enter hero name..."
                    maxLength={16}
                    autoFocus
                  />
                  <p className="text-violet-600/30 text-[11px] font-mono mt-2 px-1">
                    {name.length}/16 characters · min 3
                  </p>
                </div>

                {/* Also let them switch class here */}
                <div className="mt-6">
                  <label className="block text-[10px] font-black text-violet-400/50 uppercase tracking-[0.2em] mb-3 px-1">
                    Class
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {CLASSES.map(c => {
                      const Icon = c.icon;
                      const isActive = classId === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setClassId(c.id)}
                          className="flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer transition-all"
                          style={{
                            background: isActive ? c.bg : 'rgba(255,255,255,0.03)',
                            border: isActive ? `1px solid ${c.border}` : '1px solid rgba(139,92,246,0.12)',
                            boxShadow: isActive ? `0 0 15px ${c.glow}` : 'none',
                          }}
                        >
                          <Icon className="w-5 h-5" style={{ color: isActive ? c.accent : 'rgba(139,92,246,0.4)' }} />
                          <span
                            className="text-[11px] font-black uppercase tracking-widest font-mono"
                            style={{ color: isActive ? c.accent : 'rgba(139,92,246,0.35)' }}
                          >
                            {c.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <NextButton label="Appearance" onClick={() => { loadSprites(); setStep('APPEARANCE'); }} disabled={name.length < 3} />
              </div>
            )}

            {/* ─── STEP 3: Appearance ─── */}
            {step === 'APPEARANCE' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <StepHeader label="Appearance" onBack={() => setStep('NAME')} />

                {currentSprites.length === 0 ? (
                  <div className="text-center py-20 text-violet-500/40 font-mono">Loading sprites...</div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 mb-6">
                      {currentSprites.map(sprite => {
                        const isActive = spriteId === sprite;
                        return (
                          <div
                            key={sprite}
                            onClick={() => setSpriteId(sprite)}
                            className="aspect-square rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-center relative overflow-hidden"
                            style={{
                              background: isActive ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                              border: isActive ? '1px solid rgba(139,92,246,0.6)' : '1px solid rgba(139,92,246,0.1)',
                              boxShadow: isActive ? '0 0 15px rgba(139,92,246,0.3)' : 'none',
                              transform: isActive ? 'scale(1.08)' : 'scale(1)',
                            }}
                            onMouseEnter={e => {
                              if (!isActive) {
                                (e.currentTarget as HTMLElement).style.border = '1px solid rgba(139,92,246,0.3)';
                                (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.07)';
                              }
                            }}
                            onMouseLeave={e => {
                              if (!isActive) {
                                (e.currentTarget as HTMLElement).style.border = '1px solid rgba(139,92,246,0.1)';
                                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                              }
                            }}
                          >
                            <div
                              className="pixelated bg-no-repeat"
                              style={{
                                backgroundImage: `url('/game-assets/characters/${sprite}.png')`,
                                backgroundPosition: '0px -64px',
                                backgroundSize: '96px 128px',
                                width: '32px', height: '32px',
                                transform: isActive ? 'scale(1.5)' : 'scale(1.2)',
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination */}
                    <div
                      className="flex items-center justify-between rounded-xl p-3 mb-6"
                      style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.12)' }}
                    >
                      <button
                        disabled={spritePage === 0}
                        onClick={() => setSpritePage(p => p - 1)}
                        className="px-5 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-30"
                        style={{
                          background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)',
                          color: 'rgba(196,181,253,0.7)',
                        }}
                      >
                        ← Prev
                      </button>
                      <span className="text-violet-400/50 font-mono text-xs uppercase tracking-widest">
                        Page {spritePage + 1} of {totalPages}
                      </span>
                      <button
                        disabled={spritePage === totalPages - 1}
                        onClick={() => setSpritePage(p => p + 1)}
                        className="px-5 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-30"
                        style={{
                          background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)',
                          color: 'rgba(196,181,253,0.7)',
                        }}
                      >
                        Next →
                      </button>
                    </div>
                  </>
                )}

                <NextButton label="Choose Gift" onClick={() => setStep('GIFT')} />
              </div>
            )}

            {/* ─── STEP 4: Gift / Perk ─── */}
            {step === 'GIFT' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <StepHeader label="Starting Gift" onBack={() => setStep('APPEARANCE')} />

                <p className="text-violet-400/40 text-sm font-mono mb-8 text-center tracking-wider">
                  Choose one innate perk that defines your playstyle
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
                  {PERKS.map(p => {
                    const Icon = p.icon;
                    const isActive = perkId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setPerkId(p.id)}
                        className="flex items-start gap-4 p-5 rounded-2xl cursor-pointer transition-all duration-200"
                        style={{
                          background: isActive ? `${p.color}12` : 'rgba(255,255,255,0.03)',
                          border: isActive ? `1px solid ${p.color}50` : '1px solid rgba(139,92,246,0.12)',
                          boxShadow: isActive ? `0 0 20px ${p.color}25` : 'none',
                          transform: isActive ? 'scale(1.02)' : 'scale(1)',
                        }}
                        onMouseEnter={e => {
                          if (!isActive) {
                            (e.currentTarget as HTMLElement).style.background = `${p.color}08`;
                            (e.currentTarget as HTMLElement).style.borderColor = `${p.color}30`;
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isActive) {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.12)';
                          }
                        }}
                      >
                        <div
                          className="p-3 rounded-xl shrink-0 transition-all"
                          style={{
                            background: isActive ? `${p.color}22` : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${isActive ? p.color + '40' : 'rgba(255,255,255,0.07)'}`,
                          }}
                        >
                          <Icon
                            className="w-5 h-5"
                            style={{ color: isActive ? p.color : 'rgba(139,92,246,0.4)' }}
                            strokeWidth={2.5}
                          />
                        </div>
                        <div>
                          <h3
                            className="font-black text-base mb-1"
                            style={{ color: isActive ? p.color : 'rgba(237,233,254,0.7)' }}
                          >
                            {p.name}
                          </h3>
                          <p className="text-sm leading-snug" style={{ color: 'rgba(196,181,253,0.4)' }}>
                            {p.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <NextButton label="Review" onClick={() => setStep('REVIEW')} />
              </div>
            )}

            {/* ─── STEP 5: Review / Finalize ─── */}
            {step === 'REVIEW' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <StepHeader label="Enter the World" onBack={() => setStep('GIFT')} />

                {/* Summary card */}
                <div
                  className="rounded-2xl p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center gap-8"
                  style={{
                    background: 'rgba(139,92,246,0.06)',
                    border: '1px solid rgba(139,92,246,0.2)',
                    boxShadow: '0 0 30px rgba(139,92,246,0.08)',
                  }}
                >
                  {/* Sprite */}
                  <div
                    className="w-28 h-28 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      background: 'rgba(139,92,246,0.1)',
                      border: '1px solid rgba(139,92,246,0.3)',
                      boxShadow: '0 0 30px rgba(139,92,246,0.2)',
                    }}
                  >
                    <div
                      className="pixelated bg-no-repeat"
                      style={{
                        backgroundImage: `url('/game-assets/characters/${spriteId}.png')`,
                        backgroundPosition: '0px -64px',
                        backgroundSize: '96px 128px',
                        width: '32px', height: '32px',
                        transform: 'scale(3)',
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-grow text-center md:text-left">
                    <h3
                      className="text-4xl font-black mb-3 tracking-wide"
                      style={{
                        background: 'linear-gradient(180deg, #e8d5ff 0%, #a855f7 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        fontFamily: 'serif',
                      }}
                    >
                      {name}
                    </h3>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                      {(() => {
                        const cls = CLASSES.find(c => c.id === classId);
                        return cls ? (
                          <span
                            className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest"
                            style={{
                              background: `${cls.accent}18`,
                              border: `1px solid ${cls.accent}40`,
                              color: cls.accent,
                            }}
                          >
                            {cls.name}
                          </span>
                        ) : null;
                      })()}
                      {(() => {
                        const perk = PERKS.find(p => p.id === perkId);
                        return perk ? (
                          <span
                            className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest"
                            style={{
                              background: `${perk.color}18`,
                              border: `1px solid ${perk.color}40`,
                              color: perk.color,
                            }}
                          >
                            {perk.name}
                          </span>
                        ) : null;
                      })()}
                      <span
                        className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: 'rgba(196,181,253,0.5)',
                        }}
                      >
                        {spriteId}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {[
                        { label: 'Level', value: '1' },
                        { label: 'HP', value: perkId === 'STAMINA_SURGE' ? '165' : '110' },
                        { label: 'Credits', value: '1,000' },
                      ].map(stat => (
                        <div key={stat.label} className="text-center">
                          <div className="text-violet-300 font-black text-lg">{stat.value}</div>
                          <div className="text-violet-500/40 text-[10px] font-mono uppercase tracking-widest">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Create button */}
                <button
                  disabled={loading}
                  onClick={handleCreate}
                  className="w-full py-4 rounded-xl font-black text-lg tracking-widest uppercase transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-3"
                  style={{
                    background: loading
                      ? 'rgba(16,185,129,0.3)'
                      : 'linear-gradient(135deg, #059669 0%, #10b981 50%, #06b86c 100%)',
                    boxShadow: loading ? 'none' : '0 0 30px rgba(16,185,129,0.35), 0 4px 15px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                    color: 'white',
                  }}
                >
                  {loading ? (
                    <span className="animate-pulse font-mono">Creating...</span>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Start Adventure
                    </>
                  )}
                </button>
              </div>
            )}

          </div>
        </div>

        <p className="mt-8 text-violet-700/25 text-[10px] font-mono tracking-widest">
          ᚠ &nbsp; Saints Online &nbsp; ᚠ
        </p>
      </div>
    </div>
  );
}
