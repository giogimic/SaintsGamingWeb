'use client';

import React, { useMemo } from 'react';
import {
  Shield,
  Sword,
  Sparkles,
  Zap,
  Heart,
  Coins,
  Play,
  Crosshair,
  Pickaxe,
  Hammer,
  Dumbbell,
  Cpu,
  Sprout,
  Fish,
  Target,
  Axe,
  UtensilsCrossed,
  Flame,
  Wand2,
  Sun,
  Package,
  Shirt,
  User,
  Crown,
  Layers,
  Sparkle,
  Plus,
} from 'lucide-react';
import { CharacterSpritePreview } from './CharacterSpritePreview';
import { ITEM_DB } from './data/items';
import { soundSynth } from '@/engine/sound-synth';

const SKILL_ICONS: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  attack: Sword,
  strength: Dumbbell,
  defence: Shield,
  hitpoints: Heart,
  ranged: Crosshair,
  magic: Wand2,
  prayer: Sun,
  mining: Pickaxe,
  fishing: Fish,
  woodcutting: Axe,
  crafting: Hammer,
  cooking: UtensilsCrossed,
  farming: Sprout,
  agility: Zap,
};

const CLASS_COLORS: Record<string, { glow: string; accent: string; label: string; border: string }> = {
  WARRIOR:  { glow: 'rgba(239,68,68,0.45)',   accent: '#f87171', label: '#fca5a5', border: 'rgba(239,68,68,0.6)' },
  MAGE:     { glow: 'rgba(96,165,250,0.5)',   accent: '#60a5fa', label: '#93c5fd', border: 'rgba(96,165,250,0.6)' },
  THIEF:    { glow: 'rgba(16,185,129,0.45)',  accent: '#34d399', label: '#6ee7b7', border: 'rgba(16,185,129,0.6)' },
  RANGER:   { glow: 'rgba(251,191,36,0.45)',  accent: '#fbbf24', label: '#fde68a', border: 'rgba(251,191,36,0.6)' },
  PRIEST:   { glow: 'rgba(226,213,179,0.45)', accent: '#e2d5b3', label: '#f5f0e1', border: 'rgba(226,213,179,0.6)' },
  INVOKER:  { glow: 'rgba(139,92,246,0.5)',   accent: '#a78bfa', label: '#c4b5fd', border: 'rgba(139,92,246,0.6)' },
  ARTISAN:  { glow: 'rgba(251,146,60,0.45)',  accent: '#fb923c', label: '#fdba74', border: 'rgba(251,146,60,0.6)' },
  BRAWLER:  { glow: 'rgba(239,68,68,0.45)',   accent: '#f87171', label: '#fca5a5', border: 'rgba(239,68,68,0.6)' },
  SURVIVOR: { glow: 'rgba(20,184,166,0.45)',  accent: '#2dd4bf', label: '#99f6e4', border: 'rgba(20,184,166,0.6)' },
  CYBER:    { glow: 'rgba(0,245,212,0.45)',   accent: '#00f5d4', label: '#a5f3fc', border: 'rgba(0,245,212,0.6)' },
};

const DEFAULT_COLOR = { glow: 'rgba(203,178,106,0.35)', accent: '#cbb26a', label: '#e5d59f', border: 'rgba(203,178,106,0.5)' };

const DISPLAY_SKILLS = [
  { key: 'attack', label: 'Attack' },
  { key: 'strength', label: 'Strength' },
  { key: 'defence', label: 'Defence' },
  { key: 'hitpoints', label: 'Hitpoints' },
  { key: 'ranged', label: 'Ranged' },
  { key: 'magic', label: 'Magic' },
  { key: 'prayer', label: 'Prayer' },
  { key: 'mining', label: 'Mining' },
  { key: 'fishing', label: 'Fishing' },
  { key: 'woodcutting', label: 'Woodcut' },
  { key: 'crafting', label: 'Crafting' },
  { key: 'cooking', label: 'Cooking' },
  { key: 'farming', label: 'Farming' },
];

const EQUIPMENT_SLOTS = [
  { key: 'head', label: 'Head', icon: Crown },
  { key: 'chest', label: 'Chest', icon: Shirt },
  { key: 'legs', label: 'Legs', icon: Layers },
  { key: 'weapon', label: 'Weapon', icon: Sword },
  { key: 'offhand', label: 'Shield', icon: Shield },
  { key: 'boots', label: 'Boots', icon: Sparkle },
];

interface CharacterDetailPreviewProps {
  character: any;
  onEnterWorld?: (characterId: string) => void;
  className?: string;
}

export function CharacterDetailPreview({
  character,
  onEnterWorld,
  className = '',
}: CharacterDetailPreviewProps) {
  // Parse state data
  const { state, classKey, palette, charLayers, equipment, inventory, skills, totalLevel, gearScore, totalAtk, totalDef } = useMemo(() => {
    let parsedState: any = {
      level: 1,
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      credits: 1000,
      perk: 'SWIFT_TRAVELER',
      equipment: {},
      inventory: {},
      skills: {},
    };

    if (character?.stateData) {
      try {
        parsedState = typeof character.stateData === 'string' ? JSON.parse(character.stateData) : character.stateData;
      } catch {}
    }

    const cKey = (character?.classId || 'WARRIOR').toUpperCase();
    const pal = CLASS_COLORS[cKey] || DEFAULT_COLOR;
    const layers = parsedState?.customization?.layers || parsedState?.appearance?.layers || (character?.spriteId || character?.assetProfileId ? [character.spriteId || character.assetProfileId] : ['adventurer']);

    const eq: Record<string, string | null> = parsedState?.equipment || {};
    const inv: Record<string, number> = parsedState?.inventory || {};
    const sk: Record<string, { level: number; xp: number }> = parsedState?.skills || {};

    let sumLevel = 0;
    DISPLAY_SKILLS.forEach((s) => {
      const skLevel = sk[s.key]?.level ?? (s.key === 'hitpoints' ? 10 : 1);
      sumLevel += skLevel;
    });

    let atkSum = 0;
    let defSum = 0;
    let gScore = 0;

    Object.values(eq).forEach((itemId) => {
      if (itemId && ITEM_DB[itemId]) {
        const it = ITEM_DB[itemId];
        const atk = it.stats?.atk || 0;
        const def = it.stats?.def || 0;
        atkSum += atk;
        defSum += def;
        gScore += atk * 2 + def * 2 + 10;
      }
    });

    return {
      state: parsedState,
      classKey: cKey,
      palette: pal,
      charLayers: layers,
      equipment: eq,
      inventory: inv,
      skills: sk,
      totalLevel: sumLevel,
      gearScore: gScore,
      totalAtk: atkSum,
      totalDef: defSum,
    };
  }, [character]);

  if (!character) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-white/15 bg-black/40 text-center ${className}`}>
        <User className="w-12 h-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-bold font-mono text-foreground uppercase tracking-widest">Select A Saint</p>
        <p className="text-xs font-mono text-muted-foreground mt-1">Pick a character from your vault to inspect stats and equipment.</p>
      </div>
    );
  }

  const spriteId = character.assetProfileId || character.spriteId || 'adventurer';
  const charLevel = state.level || character.level || 1;
  const currentHp = state.hp ?? 100;
  const maxHp = state.maxHp ?? 100;
  const currentMp = state.mp ?? 50;
  const maxMp = state.maxMp ?? 50;
  const credits = state.credits ?? 1000;
  const perk = state.perk ? String(state.perk).replace(/_/g, ' ') : 'SWIFT TRAVELER';

  return (
    <div
      className={`rounded-2xl border border-border/60 p-4 sm:p-5 bg-card/60 backdrop-blur-xl shadow-2xl relative overflow-hidden flex flex-col justify-between ${className}`}
      style={{
        borderColor: palette.border || 'rgba(255, 255, 255, 0.2)',
        boxShadow: `0 0 35px ${palette.glow}, inset 0 0 20px rgba(0,0,0,0.6)`,
      }}
    >
      {/* ── 3-COLUMN PREVIEW: LEFT (INVENTORY/EQUIPMENT) · CENTER (SPRITE) · RIGHT (SKILLS) ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
        
        {/* ═══ LEFT COLUMN: INVENTORY & EQUIPMENT (Cols 1-4) ═══ */}
        <div className="md:col-span-4 flex flex-col justify-between space-y-3 bg-black/50 p-3 rounded-xl border border-white/10">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                <Shirt className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-foreground">
                  Equipped Gear
                </span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                Score: <strong className="text-amber-300">{gearScore}</strong>
              </span>
            </div>

            {/* Equipment Grid */}
            <div className="grid grid-cols-2 gap-1.5">
              {EQUIPMENT_SLOTS.map((slot) => {
                const itemId = equipment[slot.key];
                const item = itemId ? ITEM_DB[itemId] : null;
                const SlotIcon = slot.icon;

                return (
                  <div
                    key={slot.key}
                    className={`p-1.5 rounded-lg border flex items-center gap-2 transition-all ${
                      item
                        ? 'bg-primary/10 border-primary/40 shadow-sm'
                        : 'bg-black/40 border-white/5 text-muted-foreground'
                    }`}
                  >
                    <div className="w-6 h-6 rounded bg-black/60 border border-white/10 flex items-center justify-center shrink-0">
                      <SlotIcon className={`w-3.5 h-3.5 ${item ? 'text-primary' : 'text-slate-500'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] font-mono uppercase text-muted-foreground truncate">
                        {slot.label}
                      </div>
                      <div className={`text-[10px] font-mono font-bold truncate ${item ? 'text-foreground' : 'text-slate-500'}`}>
                        {item ? item.name : 'Empty'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Backpack / Inventory Preview */}
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-foreground">
                  Backpack
                </span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                {Object.keys(inventory).length} Items
              </span>
            </div>

            {Object.keys(inventory).length === 0 ? (
              <div className="p-2 text-center bg-black/30 rounded-lg border border-dashed border-white/10">
                <span className="text-[10px] font-mono text-muted-foreground">Backpack is empty</span>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1 max-h-[88px] overflow-y-auto pr-0.5 scrollbar-thin">
                {Object.entries(inventory).map(([itemId, qty]) => {
                  const item = ITEM_DB[itemId];
                  const itemName = item?.name || itemId.replace(/_/g, ' ');

                  return (
                    <div
                      key={itemId}
                      className="p-1 rounded bg-black/60 border border-white/10 flex flex-col items-center justify-center text-center relative group"
                      title={`${itemName} (x${qty})`}
                    >
                      <Package className="w-3.5 h-3.5 text-amber-300 mb-0.5" />
                      <span className="text-[8px] font-mono font-bold text-foreground truncate max-w-full">
                        {itemName.slice(0, 5)}
                      </span>
                      <span className="text-[7px] font-mono text-primary font-extrabold absolute top-0.5 right-0.5 bg-black/80 px-0.5 rounded">
                        x{qty}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Combat Ratings Mini-Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] font-mono">
            <div className="flex items-center gap-1 text-rose-400">
              <Sword className="w-3 h-3" />
              <span>ATK: <strong>+{totalAtk}</strong></span>
            </div>
            <div className="flex items-center gap-1 text-sky-400">
              <Shield className="w-3 h-3" />
              <span>DEF: <strong>+{totalDef}</strong></span>
            </div>
            <div className="flex items-center gap-1 text-amber-400">
              <Coins className="w-3 h-3" />
              <span><strong>{credits.toLocaleString()} C</strong></span>
            </div>
          </div>
        </div>

        {/* ═══ CENTER COLUMN: CENTERED SPRITE SHOWCASE (Cols 5-8) ═══ */}
        <div className="md:col-span-4 flex flex-col justify-between items-center text-center p-3 sm:p-4 rounded-xl bg-[#070114]/90 border border-white/10 relative overflow-hidden">
          {/* Rune / Energy aura on ground */}
          <div
            className="absolute w-44 h-16 rounded-full bottom-20 blur-md opacity-70 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, ${palette.accent} 0%, transparent 70%)`,
            }}
          />

          {/* Top Saint Info */}
          <div className="w-full flex items-center justify-between border-b border-white/10 pb-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-primary/20 border border-primary/40 text-primary text-[10px] font-bold font-mono">
              LVL {charLevel}
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-widest font-mono text-foreground" style={{ color: palette.accent }}>
              {classKey}
            </span>
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground text-[10px] font-mono">
              Total {totalLevel}
            </span>
          </div>

          {/* Centered Pedestal & Sprite */}
          <div className="flex flex-col items-center justify-center my-auto relative py-3">
            {/* Pedestal Platform */}
            <div
              className="w-32 h-7 rounded-[50%] border border-primary/40 bg-black/80 flex items-center justify-center relative shadow-inner mb-[-14px]"
              style={{
                boxShadow: `0 0 16px ${palette.glow}`,
              }}
            >
              <div className="w-20 h-3 rounded-[50%] border border-primary/30 bg-primary/20 animate-pulse" />
            </div>

            {/* Character Sprite */}
            <div className="relative z-10 w-24 h-24 flex items-center justify-center">
              <CharacterSpritePreview
                layers={charLayers}
                assetProfileId={spriteId}
                size={32}
                scale={2.6}
              />
            </div>
          </div>

          {/* Character Identity & Vitals */}
          <div className="w-full space-y-2 mt-1">
            <h2 className="text-base sm:text-lg font-black font-mono tracking-wider text-foreground truncate sg-text-gradient">
              {character.name}
            </h2>

            {/* HP & MP bars */}
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[9px]">
              <div className="bg-black/60 border border-rose-500/30 rounded px-2 py-1 flex items-center justify-between">
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  <Heart className="w-2.5 h-2.5" /> HP
                </span>
                <span className="text-white font-bold">{currentHp}/{maxHp}</span>
              </div>
              <div className="bg-black/60 border border-sky-500/30 rounded px-2 py-1 flex items-center justify-between">
                <span className="text-sky-400 font-bold flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> MP
                </span>
                <span className="text-white font-bold">{currentMp}/{maxMp}</span>
              </div>
            </div>

            {/* Perk Badge */}
            <div className="px-2 py-1 rounded bg-black/50 border border-white/5 flex items-center justify-center gap-1 text-[10px] font-mono text-cyan-300">
              <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate">{perk}</span>
            </div>

            {/* Primary Action Button: ENTER WORLD */}
            {onEnterWorld && (
              <button
                type="button"
                onClick={() => {
                  soundSynth?.playActionSound?.();
                  onEnterWorld(character.id);
                }}
                className="w-full mt-1.5 py-3 rounded-xl font-mono font-black text-xs sm:text-sm uppercase tracking-widest transition-all bg-primary hover:brightness-110 text-primary-foreground shadow-[0_0_25px_rgba(203,178,106,0.45)] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Play size={14} fill="currentColor" />
                <span>ENTER WORLD</span>
              </button>
            )}
          </div>
        </div>

        {/* ═══ RIGHT COLUMN: SKILLS & MASTERY (Cols 9-12) ═══ */}
        <div className="md:col-span-4 flex flex-col justify-between space-y-2.5 bg-black/50 p-3 rounded-xl border border-white/10">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-foreground">
                  Skills & Mastery
                </span>
              </div>
              <span className="text-[10px] font-mono text-primary font-bold">
                Total: {totalLevel}
              </span>
            </div>

            {/* Skills Grid */}
            <div className="grid grid-cols-2 gap-1.5 max-h-[260px] overflow-y-auto pr-0.5 scrollbar-thin">
              {DISPLAY_SKILLS.map((s) => {
                const Icon = SKILL_ICONS[s.key] || Zap;
                const skData = skills[s.key] || { level: s.key === 'hitpoints' ? 10 : 1, xp: 0 };
                const skLevel = skData.level || (s.key === 'hitpoints' ? 10 : 1);

                return (
                  <div
                    key={s.key}
                    className="p-1.5 rounded-lg bg-black/60 border border-white/5 hover:border-primary/40 flex items-center justify-between gap-1.5 transition-all group"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground group-hover:text-foreground truncate">
                        {s.label}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-mono font-bold shrink-0">
                      {skLevel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-2 bg-black/40 rounded-lg border border-white/5 text-center">
            <span className="text-[9px] font-mono text-muted-foreground">
              Level up combat, gathering & crafting skills in-game.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
