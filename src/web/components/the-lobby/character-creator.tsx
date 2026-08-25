'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Sparkles,
  Shield,
  Zap,
  ArrowLeft,
  ArrowRight,
  Wand2,
  Swords,
  Feather,
  Heart,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Crosshair,
  Globe2,
  Dice5,
  CheckCircle2,
  Flame,
  Search,
  Package,
  Layers,
  Award,
  LucideIcon,
} from 'lucide-react';
import { createGameCharacter } from '@/app/actions/game';
import { getStarterHeroes } from '@/app/actions/starter-heroes';
import { getPlayableClasses } from '@/app/actions/character-classes';
import { ensureWorldProfiles } from '@/app/actions/world-profiles';
import { toast } from 'sonner';
import { INITIAL_SKILLS, useGameStore } from './store';
import { soundSynth } from '@/engine/sound-synth';
import {
  ClassDefData,
  emptyClassDef,
  resolveClassStats,
  resolveStartingSkills,
} from '@/shared/game/classCatalog';
import { CharacterSpritePreview } from './CharacterSpritePreview';
import { AssetManager } from '@/engine/assets/AssetManager';
import { MidnightTropicalBackground } from './MidnightTropicalBackground';
import { useTheme } from 'next-themes';

// ─── Constants ────────────────────────────────────────────────────────────────

const PERKS = [
  {
    id: 'SWIFT_TRAVELER',
    name: 'Swift Traveler',
    desc: '+25% Movement Speed across all maps and dungeons.',
    icon: Zap,
    color: '#fbbf24',
    badge: 'AGILITY',
  },
  {
    id: 'ACROBAT',
    name: 'Acrobat',
    desc: 'Perform 2-tile Double Jumps over obstacles and gaps.',
    icon: Feather,
    color: '#34d399',
    badge: 'MOBILITY',
  },
  {
    id: 'PACK_MULE',
    name: 'Pack Mule',
    desc: '+50% Inventory Carry Weight & pouch capacity.',
    icon: Shield,
    color: '#60a5fa',
    badge: 'UTILITY',
  },
  {
    id: 'MASTER_TAMER',
    name: 'Master Saint',
    desc: '+15% Capture Rate boost for wild Daemons & Beasts.',
    icon: User,
    color: '#cbb26a',
    badge: 'MASTERY',
  },
  {
    id: 'STAMINA_SURGE',
    name: 'Stamina Surge',
    desc: '+30 Base Health & accelerated health regeneration.',
    icon: Sparkles,
    color: '#f472b6',
    badge: 'SURVIVAL',
  },
];

const RANDOM_NAMES = [
  'Valkyrie', 'ShadowFox', 'NeonKnight', 'Cipher', 'Vortex', 'Zephyr', 'Aegis', 'Blitz',
  'Nova', 'Eclipse', 'RogueSaint', 'Frostbyte', 'Saber', 'Hyperion', 'Zero', 'Apex',
];

const CLASS_ICONS: Record<string, LucideIcon> = {
  WARRIOR: Swords,
  MAGE: Wand2,
  THIEF: Feather,
  RANGER: Crosshair,
  PRIEST: Heart,
  CLERIC: Heart,
  ROGUE: Zap,
  PALADIN: Shield,
};

// Dynamic discovery of assets instead of hard-coded assumptions

function classVisual(def: ClassDefData) {
  const accent = def.color || '#00f5d4';
  return {
    id: def.classId,
    name: def.name,
    desc: def.description,
    accent,
    glow: `${accent}55`,
    bg: `${accent}14`,
    border: `${accent}59`,
    icon: CLASS_ICONS[def.classId] || Swords,
    def,
  };
}



type DbHero = {
  slug: string;
  name: string;
  classId: string;
  spriteKey: string;
  spriteBundleId?: string | null;
  flavor: string;
  tag: string;
  tagColor: string;
  startingMap?: string;
  startingX?: number;
  startingY?: number;
  startingInventory?: string | null;
};

type CreatorStep = 'HERO_PICK' | 'NAME' | 'APPEARANCE' | 'GIFT' | 'REVIEW';

const isModularSprite = (id: string) => {
  return id === 'human_base' || 
         id.startsWith('good-') || 
         id.startsWith('evil-') || 
         ['scout_mira', 'capturer_kian', 'soulwarden_aldric', 'ironwright_kael', 'candrift_keeper', 'elder_voss'].includes(id);
};

export function CharacterCreator({
  onComplete,
  onCancel,
}: {
  onComplete: (characterId: string) => void;
  onCancel?: () => void;
}) {
  const [step, setStep] = useState<CreatorStep>('HERO_PICK');
  const [name, setName] = useState('');
  const [spriteId, setSpriteId] = useState('evil-berserker-bloodaxe-male');
  const [selectedCape, setSelectedCape] = useState<string | null>(null);
  const [selectedHat, setSelectedHat] = useState<string | null>(null);
  const [selectedArmor, setSelectedArmor] = useState<string | null>(null);
  const [appearanceTab, setAppearanceTab] = useState<'BASE' | 'CAPE' | 'HEAD' | 'ARMOR' | 'CATALOG'>('BASE');

  const [dbHeroes, setDbHeroes] = useState<DbHero[]>([]);
  const [classDefs, setClassDefs] = useState<ClassDefData[]>([]);
  const [heroesLoading, setHeroesLoading] = useState(true);

  // Appearance picker state
  const [allSprites, setAllSprites] = useState<string[]>([]);
  const [spriteSearch, setSpriteSearch] = useState('');
  const [spritePage, setSpritePage] = useState(0);
  const spritesPerPage = 18;

  // Selected config
  const [classId, setClassId] = useState('WARRIOR');
  const [selectedHeroSlug, setSelectedHeroSlug] = useState<string | null>(null);
  const [perkId, setPerkId] = useState(PERKS[0].id);
  const [loading, setLoading] = useState(false);

  // Dynamic Asset Discovery
  const { dynamicBases, dynamicCapes, dynamicArmor, dynamicHats } = useMemo(() => {
    if (allSprites.length === 0) return { dynamicBases: [], dynamicCapes: [], dynamicArmor: [], dynamicHats: [] };

    const formatLabel = (id: string, prefix: string = '') => {
      let lbl = id.replace(prefix, '').replace(/-/g, ' ');
      return lbl.charAt(0).toUpperCase() + lbl.slice(1);
    };

    const bases = allSprites
      .filter((s) => !s.startsWith('item-'))
      .map((b: string) => ({ id: b, label: formatLabel(b), tag: 'Base' }));

    const capes = [
      { id: null, label: 'None' },
      ...allSprites.filter((s) => s.startsWith('item-cape-')).map((c: string) => ({ id: c, label: formatLabel(c, 'item-cape-') })),
    ];

    const armor = [
      { id: null, label: 'None' },
      ...allSprites.filter((s) => s.startsWith('item-armor-') || s.startsWith('item-backpack-') || s.startsWith('item-boots-') || s.startsWith('item-bracers-')).map((a: string) => ({ id: a, label: formatLabel(a, 'item-') })),
    ];

    const hats = [
      { id: null, label: 'None' },
      ...allSprites.filter((s) => s.startsWith('item-hat-')).map((h: string) => ({ id: h, label: formatLabel(h, 'item-hat-') })),
    ];

    return { dynamicBases: bases, dynamicCapes: capes, dynamicArmor: armor, dynamicHats: hats };
  }, [allSprites]);

  // Computed multi-layer stack
  const activeLayers = [
    spriteId,
    selectedCape,
    selectedArmor,
    selectedHat,
  ].filter(Boolean) as string[];

  // Load database starter heroes & class defs
  useEffect(() => {
    async function loadData() {
      setHeroesLoading(true);
      try {
        const [heroesRes, classesRes] = await Promise.all([
          getStarterHeroes(),
          getPlayableClasses(),
        ]);
        if (heroesRes.success) setDbHeroes(heroesRes.data as DbHero[]);
        if (classesRes.success && classesRes.data.length > 0) setClassDefs(classesRes.data);
      } catch {
        /* ignore */
      } finally {
        setHeroesLoading(false);
      }
    }
    void loadData();
  }, []);

  // Load sprite catalog lazily
  const loadSprites = async () => {
    if (allSprites.length > 0) return;
    try {
      const { CHARACTER_SPRITES } = await import('./data/sprites');
      let customList: string[] = [];
      try {
        const res = await fetch('/api/assets?type=CHARACTER&showInCharacterCreation=true&limit=100');
        if (res.ok) {
          const data = await res.json();
          customList = (data.items || [])
            .filter((a: any) => {
              const tags = Array.isArray(a.tags) ? a.tags : [];
              const isChar = a.type === 'CHARACTER' || a.type === 'SPRITE' || tags.includes('character') || tags.includes('hero');
              const isPlayable = a.isPlayable || a.showInCharacterCreation || tags.includes('playable') || tags.includes('player');
              return isChar && isPlayable;
            })
            .map((a: any) => a.source || a.slug)
            .filter(Boolean);
        }
      } catch {
        /* ignore */
      }
      const combined = Array.from(new Set([...customList, ...CHARACTER_SPRITES]));
      setAllSprites(combined);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (step === 'APPEARANCE') {
      void loadSprites();
    }
  }, [step]);

  const starterHeroes: DbHero[] = dbHeroes;
  const CLASSES = classDefs.map(classVisual);

  const stepToNum: Record<CreatorStep, number> = {
    HERO_PICK: 1,
    NAME: 2,
    APPEARANCE: 3,
    GIFT: 4,
    REVIEW: 5,
  };
  const currentNum = stepToNum[step];

  const handleHeroPick = (hero: DbHero) => {
    soundSynth?.playSelectSound?.();
    setSpriteId(hero.spriteKey);
    setClassId(hero.classId);
    setSelectedHeroSlug(hero.slug);
    setStep('NAME');
  };

  const handleRandomizeName = () => {
    soundSynth?.playSelectSound?.();
    const pick = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const num = Math.floor(Math.random() * 90 + 10);
    setName(`${pick}${num}`);
  };

  const handleCreate = async () => {
    if (!name || name.trim().length < 3) {
      toast.error('Saint name must be at least 3 characters.');
      return;
    }
    setLoading(true);
    soundSynth?.playActionSound?.();

    const selectedDef = classDefs.find((c) => c.classId === classId);
    const initialSkills = selectedDef
      ? resolveStartingSkills(selectedDef)
      : JSON.parse(JSON.stringify(INITIAL_SKILLS));
    const sheet = selectedDef ? resolveClassStats(selectedDef) : { hp: 100 };
    const hpBase = sheet.hp + (perkId === 'STAMINA_SURGE' ? 30 : 0);
    const hpFromSkills = (initialSkills['Hitpoints']?.level || 1) * 5;

    const hero =
      starterHeroes.find((h) => h.slug === selectedHeroSlug) ||
      starterHeroes.find((h) => h.classId === classId && h.spriteKey === spriteId);

    let startMap = hero?.startingMap && hero.startingMap !== 'DEMO_SANDBOX' ? hero.startingMap : '';
    let startX = hero?.startingX;
    let startY = hero?.startingY;

    try {
      const mapListRes = await fetch('/api/maps');
      if (mapListRes.ok) {
        const mapData = await mapListRes.json();
        const maps = mapData.maps || [];
        if (maps.length > 0) {
          if (!startMap) {
            const hubMap =
              maps.find(
                (m: any) =>
                  m.id === 'SAINTS_HAVEN' ||
                  m.id === 'LOBBY' ||
                  m.id?.toLowerCase().includes('haven') ||
                  m.id?.toLowerCase().includes('lobby') ||
                  m.id?.toLowerCase().includes('hub')
              ) || maps[0];
            startMap = hubMap.id;
          }
        }
      }
    } catch {
      /* fallback */
    }

    if (!startMap) {
      startMap = 'SAINTS_HAVEN';
    }

    if (startX === undefined || startY === undefined) {
      try {
        const mapRes = await fetch(`/api/maps/${startMap}`);
        if (mapRes.ok) {
          const mapInfo = await mapRes.json();
          if (mapInfo?.spawnPoint && typeof mapInfo.spawnPoint.x === 'number') {
            startX = mapInfo.spawnPoint.x;
            startY = mapInfo.spawnPoint.y;
          } else if (mapInfo?.width && mapInfo?.height) {
            startX = Math.floor(mapInfo.width / 2);
            startY = Math.floor(mapInfo.height / 2);
          }
        }
      } catch {
        /* fallback */
      }
    }

    if (startX === undefined) startX = startMap === 'SAINTS_HAVEN' ? 20 : startMap === 'LOBBY' ? 32 : 15;
    if (startY === undefined) startY = startMap === 'SAINTS_HAVEN' ? 20 : startMap === 'LOBBY' ? 32 : 15;

    const isSpyder = selectedHeroSlug === 'spyder_tamer' || startMap === 'AZURE_TOWN';
    const initialState = {
      currentMapId: startMap,
      position: { x: startX, y: startY },
      level: 1,
      xp: 0,
      hp: hpBase + hpFromSkills,
      maxHp: hpBase + hpFromSkills,
      credits: 1000,
      inventory: isSpyder
        ? { patch_kit: 5, film_standard: 5, soul_camera: 1 }
        : { patch_kit: 5 },
      skills: initialSkills,
      classStats: sheet,
      equipment: { head: selectedHat, chest: selectedArmor || 'bronze_chestplate', legs: 'bronze_leggings', weapon: 'bronze_sword' },
      customization: {
        skinTone: '#fcd34d',
        hairColor: '#3b82f6',
        shirtColor: '#10b981',
        pantsColor: '#18181b',
        layers: activeLayers,
        base: spriteId,
        cape: selectedCape,
        hat: selectedHat,
        armor: selectedArmor,
      },
      appearance: {
        layers: activeLayers,
        base: spriteId,
        cape: selectedCape,
        hat: selectedHat,
        armor: selectedArmor,
      },
      combatStyle: classId,
      activeDaemonId: 'd-001',
      saintRank: 'Rookie',
      caughtDaemons: ['d-001'],
      assignedBeasts: { furnace: null, farm: null, fishing_hut: null },
      perk: perkId,
      maxWeight: perkId === 'PACK_MULE' ? 150 : 100,
      maxPartySize: 4,
    };

    const result = await createGameCharacter({
      name: name.trim(),
      spriteId,
      classId,
      initialState: JSON.stringify(initialState),
    });

    if (result.success && result.character) {
      toast.success('Saint forged! Entering the live realm...');
      setTimeout(() => onComplete(result.character.id), 300);
    } else {
      toast.error(result.error || 'Failed to forge character.');
      setLoading(false);
      if (result.error === 'Unauthorized') {
        useGameStore.getState().setGameMode('LOGIN');
      }
    }
  };

  // Filtered sprites for catalog tab
  const filteredSprites = allSprites.filter((s) =>
    s.toLowerCase().includes(spriteSearch.toLowerCase())
  );
  const totalSpritePages = Math.ceil(filteredSprites.length / spritesPerPage) || 1;
  const currentSprites = filteredSprites.slice(
    spritePage * spritesPerPage,
    (spritePage + 1) * spritesPerPage
  );

  const selectedDef = classDefs.find((c) => c.classId === classId);
  const selectedPerk = PERKS.find((p) => p.id === perkId) || PERKS[0];

  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isVice = theme === 'vice' || theme === 'hacker';

  return (
    <div
      className="pointer-events-auto fixed inset-0 w-full h-full overflow-y-auto z-[100] flex flex-col justify-between p-3 sm:p-6 select-none font-sans"
      style={{ backgroundColor: isLight ? '#240046' : isVice ? '#1b121c' : '#050014' }}
    >
      {/* Dynamic Horizon Background */}
      <MidnightTropicalBackground />

      {/* ── TOP BREADCRUMB & HEADER ── */}
      <header className="relative z-30 w-full max-w-5xl mx-auto flex items-center justify-between border-b border-pink-500/20 pb-3 mb-4">
        <button
          onClick={() => {
            soundSynth?.playSelectSound?.();
            if (step === 'HERO_PICK') {
              if (onCancel) onCancel();
              else useGameStore.getState().setGameMode('CHARACTER_SELECT');
            } else if (step === 'NAME') setStep('HERO_PICK');
            else if (step === 'APPEARANCE') setStep('NAME');
            else if (step === 'GIFT') {
              if (isModularSprite(spriteId)) setStep('APPEARANCE');
              else setStep('NAME');
            }
            else if (step === 'REVIEW') setStep('GIFT');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 font-mono text-xs transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>{step === 'HERO_PICK' ? 'Abort' : 'Back'}</span>
        </button>

        {/* Steps Breadcrumb */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {(['HERO_PICK', 'NAME', 'APPEARANCE', 'GIFT', 'REVIEW'] as CreatorStep[])
            .filter(s => s !== 'APPEARANCE' || isModularSprite(spriteId))
            .map((s, i, arr) => {
            const isDone = stepToNum[step] > stepToNum[s];
            const isCur = step === s;
            const label =
              s === 'HERO_PICK'
                ? 'Archetype'
                : s === 'NAME'
                ? 'Identity'
                : s === 'APPEARANCE'
                ? 'Avatar'
                : s === 'GIFT'
                ? 'Blessing'
                : 'Dossier';

            return (
              <React.Fragment key={s}>
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                    isCur
                      ? 'bg-gradient-to-r from-pink-600/40 to-cyan-500/40 border border-cyan-400 text-white font-bold shadow-[0_0_10px_rgba(0,245,212,0.4)]'
                      : isDone
                      ? 'text-[#00f5d4] opacity-80'
                      : 'text-slate-500 opacity-50'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                      isCur
                        ? 'bg-[#00f5d4] text-slate-950'
                        : isDone
                        ? 'bg-pink-500/40 text-pink-200'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {isDone ? '✓' : i + 1}
                  </span>
                  <span className="hidden sm:inline uppercase tracking-wider text-[11px]">{label}</span>
                </div>
                {i < arr.length - 1 && <span className="text-pink-500/30 text-xs">›</span>}
              </React.Fragment>
            );
          })}
        </div>

        <div className="w-16 flex justify-end" />
      </header>

      {/* ── STEP CONTENT ── */}
      <main className="relative z-20 w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center my-auto py-2">
        {/* ── STEP 1: ARCHETYPE PICK ── */}
        {step === 'HERO_PICK' && (
          <div className="w-full flex flex-col items-center">
            <div className="text-center mb-6">
              <h2
                className="text-3xl md:text-4xl font-black uppercase font-mono tracking-widest mb-1 text-white"
                style={{
                  background: 'linear-gradient(180deg, #ffffff 0%, #00f5d4 50%, #f20089 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 20px rgba(242,0,137,0.5))',
                }}
              >
                SELECT ARCHETYPE
              </h2>
              <p className="text-cyan-300/70 text-xs font-mono tracking-widest uppercase">
                Choose a foundation archetype for combat bonuses and abilities
              </p>
            </div>

            {heroesLoading ? (
              <div className="flex flex-col items-center py-16">
                <Loader2 className="w-10 h-10 text-[#00f5d4] animate-spin mb-3" />
                <p className="text-xs font-mono text-cyan-200">Initializing Operative Matrix...</p>
              </div>
            ) : starterHeroes.length === 0 ? (
              <div className="flex flex-col items-center py-16">
                <p className="text-sm font-mono text-pink-400">No archetypes available. An administrator must create archetypes in the Hero Studio.</p>
              </div>
            ) : (
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-1">
                {starterHeroes.map((hero) => {
                  const isSelected = selectedHeroSlug === hero.slug;
                  const classDef = classDefs.find((c) => c.classId === hero.classId) || emptyClassDef();

                  return (
                    <div
                      key={hero.slug}
                      onClick={() => handleHeroPick(hero)}
                      className={`cursor-pointer rounded-2xl p-[1px] transition-all group overflow-hidden ${
                        isSelected
                          ? 'ring-2 ring-[#00f5d4] shadow-[0_0_25px_rgba(0,245,212,0.5)] scale-[1.02]'
                          : 'hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(242,0,137,0.4)]'
                      }`}
                      style={{
                        background: 'linear-gradient(135deg, rgba(242,0,137,0.5) 0%, rgba(0,245,212,0.3) 100%)',
                        clipPath: 'polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px)',
                      }}
                    >
                      <div
                        className="w-full h-full bg-[#0a0318]/95 p-4 flex flex-col justify-between"
                        style={{
                          clipPath: 'polygon(11px 0%, 100% 0%, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0% 100%, 0% 11px)',
                        }}
                      >
                        {/* Tag */}
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase"
                            style={{ backgroundColor: `${hero.tagColor}22`, color: hero.tagColor, border: `1px solid ${hero.tagColor}44` }}
                          >
                            {hero.tag}
                          </span>
                          <span className="text-[10px] font-mono text-cyan-300 font-extrabold uppercase">
                            {hero.classId}
                          </span>
                        </div>

                        {/* Avatar / Icon */}
                        <div className="w-16 h-16 rounded-xl bg-black/60 border border-pink-500/30 mx-auto my-2 flex items-center justify-center shadow-inner group-hover:border-[#00f5d4] transition-all">
                          {(() => {
                            const Icon = CLASS_ICONS[hero.classId] || Swords;
                            return (
                              <Icon 
                                size={32} 
                                className="text-white group-hover:text-[#00f5d4] drop-shadow-[0_0_10px_rgba(242,0,137,0.6)] transition-all" 
                              />
                            );
                          })()}
                        </div>

                        {/* Name & Lore */}
                        <div className="text-center mt-2">
                          <h3 className="text-sm font-black font-mono text-white group-hover:text-[#00f5d4] transition-colors">
                            {hero.name}
                          </h3>
                          <p className="text-[10px] font-mono text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {hero.flavor}
                          </p>
                        </div>

                        {/* Pick Button */}
                        <div className="mt-3 pt-2 border-t border-pink-500/20 text-center">
                          <span className="text-[11px] font-mono font-bold text-[#ffbe0b] group-hover:text-white uppercase tracking-wider flex items-center justify-center gap-1">
                            Select Archetype <ChevronRight size={12} />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: NAME / CALLSIGN ── */}
        {step === 'NAME' && (
          <div className="w-full max-w-lg mx-auto flex flex-col items-center">
            <div className="text-center mb-6">
              <h2
                className="text-3xl font-black uppercase font-mono tracking-widest mb-1 text-white"
                style={{
                  background: 'linear-gradient(180deg, #ffffff 0%, #00f5d4 70%, #3b82f6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                SAINT IDENTITY
              </h2>
              <p className="text-cyan-300/70 text-xs font-mono tracking-widest uppercase">
                Assign a unique identity to your champion Saint
              </p>
            </div>

            {/* Avatar Preview */}
            <div className="w-24 h-24 rounded-2xl bg-black/80 border-2 border-[#00f5d4] flex items-center justify-center mb-6 shadow-[0_0_25px_rgba(0,245,212,0.4)]">
              <CharacterSpritePreview layers={activeLayers} size={32} scale={2.2} />
            </div>

            {/* Input Form */}
            <div
              className="w-full bg-[#0a0318]/90 border border-pink-500/40 rounded-2xl p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-4"
              style={{
                clipPath: 'polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px)',
              }}
            >
              <label className="text-xs font-mono font-bold text-cyan-200 uppercase tracking-wider flex items-center justify-between">
                <span>Saint Codename</span>
                <span className="text-[10px] text-slate-400">Min 3 characters</span>
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter Saint Name..."
                  maxLength={18}
                  autoFocus
                  className="flex-1 px-4 py-3 rounded-xl bg-black/70 border-2 border-pink-500/40 text-white placeholder:text-slate-500 font-mono text-base focus:outline-none focus:border-[#00f5d4] shadow-inner"
                />
                <button
                  type="button"
                  onClick={handleRandomizeName}
                  className="px-4 py-3 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/50 text-purple-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 font-mono text-xs font-bold"
                  title="Generate Random Name"
                >
                  <Dice5 size={16} />
                  Random
                </button>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  disabled={!name || name.trim().length < 3}
                  onClick={() => {
                    soundSynth?.playActionSound?.();
                    if (isModularSprite(spriteId)) setStep('APPEARANCE');
                    else setStep('GIFT');
                  }}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-widest bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 text-white shadow-[0_0_20px_rgba(0,245,212,0.4)] disabled:opacity-40 cursor-pointer"
                >
                  {isModularSprite(spriteId) ? 'Proceed to Avatar' : 'Proceed to Blessing'} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: APPEARANCE / MODULAR SPRITE CUSTOMIZER ── */}
        {step === 'APPEARANCE' && (
          <div className="w-full flex flex-col items-center">
            <div className="text-center mb-4">
              <h2
                className="text-3xl font-black uppercase font-mono tracking-widest mb-1 text-white"
                style={{
                  background: 'linear-gradient(180deg, #ffffff 0%, #ffbe0b 50%, #f20089 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                SAINT CUSTOMIZATION
              </h2>
              <p className="text-cyan-300/70 text-xs font-mono tracking-widest uppercase">
                Modular Sprite System: Assemble base Saint body, capes, headgear & armor
              </p>
            </div>

            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Selected Preview Stage */}
              <div
                className="lg:col-span-4 bg-[#0a0318]/90 border border-pink-500/40 rounded-2xl p-5 flex flex-col items-center justify-between text-center"
                style={{
                  clipPath: 'polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px)',
                }}
              >
                <div>
                  <span className="px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-[#00f5d4] text-[10px] font-mono font-extrabold uppercase tracking-wider">
                    Saint Preview
                  </span>
                  <h3 className="text-lg font-black font-mono text-white mt-2">{name || 'Saint'}</h3>
                  <span className="text-xs font-mono text-pink-300">{classId}</span>
                </div>

                <div className="w-32 h-32 rounded-2xl bg-black/80 border-2 border-cyan-400/80 flex items-center justify-center my-3 shadow-[0_0_30px_rgba(0,245,212,0.4)]">
                  <CharacterSpritePreview layers={activeLayers} size={32} scale={2.8} />
                </div>

                {/* Layer Badges */}
                <div className="flex flex-wrap gap-1.5 justify-center mb-3">
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-cyan-950/60 border border-cyan-500/30 text-cyan-200">
                    Base: {dynamicBases.find((b: any) => b.id === spriteId)?.label || spriteId}
                  </span>
                  {selectedCape && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-purple-950/60 border border-purple-500/30 text-purple-200">
                      Cape: {dynamicCapes.find((c: any) => c.id === selectedCape)?.label}
                    </span>
                  )}
                  {selectedHat && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-pink-950/60 border border-pink-500/30 text-pink-200">
                      Hat: {dynamicHats.find((h: any) => h.id === selectedHat)?.label}
                    </span>
                  )}
                  {selectedArmor && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-amber-950/60 border border-amber-500/30 text-amber-200">
                      Armor: {dynamicArmor.find((a: any) => a.id === selectedArmor)?.label}
                    </span>
                  )}
                </div>

                <div className="w-full pt-3 border-t border-pink-500/20">
                  <button
                    onClick={() => {
                      soundSynth?.playActionSound?.();
                      setStep('GIFT');
                    }}
                    className="w-full py-2.5 rounded-xl font-mono font-bold text-xs uppercase bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 text-white shadow-[0_0_15px_rgba(0,245,212,0.3)] cursor-pointer flex items-center justify-center gap-2"
                  >
                    Confirm Avatar <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Modular Deck & Tabs */}
              <div
                className="lg:col-span-8 bg-[#0a0318]/90 border border-pink-500/40 rounded-2xl p-4 flex flex-col justify-between"
                style={{
                  clipPath: 'polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px)',
                }}
              >
                {/* Category Tabs */}
                <div className="flex items-center gap-1.5 border-b border-pink-500/20 pb-3 mb-3 overflow-x-auto">
                  {(
                    [
                      { id: 'BASE', label: '1. Body Base' },
                      { id: 'CAPE', label: '2. Cape' },
                      { id: 'HEAD', label: '3. Headgear' },
                      { id: 'ARMOR', label: '4. Armor & Gear' },
                      { id: 'CATALOG', label: '5. All Sprites' },
                    ] as const
                  ).map((tab) => {
                    const isTabCur = appearanceTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          soundSynth?.playSelectSound?.();
                          setAppearanceTab(tab.id);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                          isTabCur
                            ? 'bg-gradient-to-r from-pink-600 to-cyan-600 text-white font-black shadow-[0_0_15px_rgba(0,245,212,0.4)]'
                            : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-transparent'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* TAB CONTENT */}
                <div className="flex-1 min-h-[260px] max-h-[300px] overflow-y-auto p-1">
                  {/* TAB: BASE */}
                  {appearanceTab === 'BASE' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {dynamicBases.map((b: any) => {
                        const isCur = spriteId === b.id;
                        return (
                          <div
                            key={b.id}
                            onClick={() => {
                              soundSynth?.playSelectSound?.();
                              setSpriteId(b.id);
                            }}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-between cursor-pointer transition-all ${
                              isCur
                                ? 'bg-cyan-500/30 border-cyan-400 shadow-[0_0_15px_rgba(0,245,212,0.5)] scale-[1.02]'
                                : 'bg-black/50 border-pink-500/20 hover:border-pink-400 hover:scale-[1.02]'
                            }`}
                          >
                            <div className="w-14 h-14 flex items-center justify-center">
                              <CharacterSpritePreview spriteKey={b.id} size={32} scale={1.4} />
                            </div>
                            <span className="text-[11px] font-mono font-bold text-white mt-1 text-center line-clamp-1">
                              {b.label}
                            </span>
                            <span className="text-[9px] font-mono text-cyan-300/80 uppercase">
                              {b.tag}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* TAB: CAPE */}
                  {appearanceTab === 'CAPE' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {dynamicCapes.map((cape: any) => {
                        const isCur = selectedCape === cape.id;
                        return (
                          <div
                            key={cape.label}
                            onClick={() => {
                              soundSynth?.playSelectSound?.();
                              setSelectedCape(cape.id);
                            }}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-between cursor-pointer transition-all ${
                              isCur
                                ? 'bg-purple-500/30 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)] scale-[1.02]'
                                : 'bg-black/50 border-pink-500/20 hover:border-pink-400 hover:scale-[1.02]'
                            }`}
                          >
                            <div className="w-14 h-14 flex items-center justify-center">
                              {cape.id ? (
                                <CharacterSpritePreview spriteKey={cape.id} size={32} scale={1.4} />
                              ) : (
                                <span className="text-xs font-mono text-slate-500">None</span>
                              )}
                            </div>
                            <span className="text-xs font-mono font-bold text-white mt-1 text-center">
                              {cape.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* TAB: HEAD */}
                  {appearanceTab === 'HEAD' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {dynamicHats.map((hat: any) => {
                        const isCur = selectedHat === hat.id;
                        return (
                          <div
                            key={hat.label}
                            onClick={() => {
                              soundSynth?.playSelectSound?.();
                              setSelectedHat(hat.id);
                            }}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-between cursor-pointer transition-all ${
                              isCur
                                ? 'bg-pink-500/30 border-pink-400 shadow-[0_0_15px_rgba(242,0,137,0.5)] scale-[1.02]'
                                : 'bg-black/50 border-pink-500/20 hover:border-pink-400 hover:scale-[1.02]'
                            }`}
                          >
                            <div className="w-14 h-14 flex items-center justify-center">
                              {hat.id ? (
                                <CharacterSpritePreview spriteKey={hat.id} size={32} scale={1.4} />
                              ) : (
                                <span className="text-xs font-mono text-slate-500">None</span>
                              )}
                            </div>
                            <span className="text-xs font-mono font-bold text-white mt-1 text-center">
                              {hat.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* TAB: ARMOR */}
                  {appearanceTab === 'ARMOR' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {dynamicArmor.map((armor: any) => {
                        const isCur = selectedArmor === armor.id;
                        return (
                          <div
                            key={armor.label}
                            onClick={() => {
                              soundSynth?.playSelectSound?.();
                              setSelectedArmor(armor.id);
                            }}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-between cursor-pointer transition-all ${
                              isCur
                                ? 'bg-amber-500/30 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-[1.02]'
                                : 'bg-black/50 border-pink-500/20 hover:border-pink-400 hover:scale-[1.02]'
                            }`}
                          >
                            <div className="w-14 h-14 flex items-center justify-center">
                              {armor.id ? (
                                <CharacterSpritePreview spriteKey={armor.id} size={32} scale={1.4} />
                              ) : (
                                <span className="text-xs font-mono text-slate-500">None</span>
                              )}
                            </div>
                            <span className="text-xs font-mono font-bold text-white mt-1 text-center">
                              {armor.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* TAB: CATALOG (Full Sprites) */}
                  {appearanceTab === 'CATALOG' && (
                    <div>
                      {/* Search & Filter Header */}
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="relative flex-1">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={spriteSearch}
                            onChange={(e) => {
                              setSpriteSearch(e.target.value);
                              setSpritePage(0);
                            }}
                            placeholder="Filter sprite catalog..."
                            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black/60 border border-pink-500/30 text-white placeholder:text-slate-500 text-xs font-mono focus:outline-none focus:border-[#00f5d4]"
                          />
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center gap-1 font-mono text-xs text-slate-400">
                          <button
                            onClick={() => setSpritePage((p: number) => Math.max(0, p - 1))}
                            disabled={spritePage === 0}
                            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <span>{spritePage + 1}/{totalSpritePages}</span>
                          <button
                            onClick={() => setSpritePage((p: number) => Math.min(totalSpritePages - 1, p + 1))}
                            disabled={spritePage >= totalSpritePages - 1}
                            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Sprite Grid */}
                      <div className="grid grid-cols-6 gap-2 max-h-[200px] overflow-y-auto p-1">
                        {currentSprites.map((sprite: string) => {
                          const isCur = spriteId === sprite;
                          return (
                            <div
                              key={sprite}
                              onClick={() => {
                                soundSynth?.playSelectSound?.();
                                setSpriteId(sprite);
                              }}
                              className={`p-2 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all ${
                                isCur
                                  ? 'bg-cyan-500/30 border-cyan-400 shadow-[0_0_15px_rgba(0,245,212,0.5)] scale-105'
                                  : 'bg-black/50 border-pink-500/20 hover:border-pink-400 hover:scale-105'
                              }`}
                            >
                              <CharacterSpritePreview spriteKey={sprite} size={32} scale={1.5} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-[10px] font-mono text-slate-400 text-center pt-2 border-t border-pink-500/20 mt-2">
                  ✦ Layered Modular Character Ingestion // Bible 35 Standard ✦
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: PERK / SAINT GIFT ── */}
        {step === 'GIFT' && (
          <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
            <div className="text-center mb-6">
              <h2
                className="text-3xl font-black uppercase font-mono tracking-widest mb-1 text-white"
                style={{
                  background: 'linear-gradient(180deg, #ffffff 0%, #ffbe0b 50%, #f20089 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                SAINT BLESSING
              </h2>
              <p className="text-cyan-300/70 text-xs font-mono tracking-widest uppercase">
                Select a permanent passive bonus trait for this operative
              </p>
            </div>

            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
              {PERKS.map((perk) => {
                const isSelected = perkId === perk.id;
                const Icon = perk.icon;

                return (
                  <div
                    key={perk.id}
                    onClick={() => {
                      soundSynth?.playSelectSound?.();
                      setPerkId(perk.id);
                    }}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)] scale-[1.02]'
                        : 'bg-[#0a0318]/90 border-pink-500/30 hover:border-pink-400 hover:scale-[1.01]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${perk.color}22`, color: perk.color }}
                        >
                          <Icon size={16} />
                        </div>
                        <span className="font-bold font-mono text-sm text-white">{perk.name}</span>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase"
                        style={{ backgroundColor: `${perk.color}22`, color: perk.color }}
                      >
                        {perk.badge}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-300 leading-relaxed">{perk.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end w-full">
              <button
                onClick={() => {
                  soundSynth?.playActionSound?.();
                  setStep('REVIEW');
                }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-widest bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 text-white shadow-[0_0_20px_rgba(0,245,212,0.4)] cursor-pointer"
              >
                Review Dossier <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: REVIEW & FINAL FORGE ── */}
        {step === 'REVIEW' && (
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
            <div className="text-center mb-6">
              <h2
                className="text-3xl font-black uppercase font-mono tracking-widest mb-1 text-white"
                style={{
                  background: 'linear-gradient(180deg, #ffffff 0%, #00f5d4 50%, #f20089 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 20px rgba(0,245,212,0.5))',
                }}
              >
                SAINT DOSSIER
              </h2>
              <p className="text-cyan-300/70 text-xs font-mono tracking-widest uppercase">
                Review Saint attributes and confirm realm deployment
              </p>
            </div>

            <div
              className="w-full bg-[#0a0318]/95 border-2 border-[#00f5d4]/60 rounded-2xl p-6 shadow-[0_0_35px_rgba(0,245,212,0.25)] flex flex-col gap-5"
              style={{
                clipPath: 'polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px)',
              }}
            >
              {/* Profile Card */}
              <div className="flex items-center gap-5 border-b border-pink-500/20 pb-4">
                <div className="w-20 h-20 rounded-2xl bg-black/80 border border-[#00f5d4] flex items-center justify-center shrink-0 shadow-inner">
                  <CharacterSpritePreview layers={activeLayers} size={32} scale={2} />
                </div>
                <div>
                  <h3 className="text-2xl font-black font-mono text-white">{name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/40 text-[#00f5d4] text-xs font-mono font-bold">
                      {classId}
                    </span>
                    <span className="text-xs font-mono text-purple-300">Level 1 Saint</span>
                  </div>
                </div>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-black/50 border border-pink-500/20">
                  <span className="text-slate-400 text-[10px] block">HEALTH</span>
                  <strong className="text-rose-400 text-sm">
                    {100 + (perkId === 'STAMINA_SURGE' ? 30 : 0)} HP
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-black/50 border border-pink-500/20">
                  <span className="text-slate-400 text-[10px] block">POUCH</span>
                  <strong className="text-amber-300 text-sm">1,000 C</strong>
                </div>
                <div className="p-3 rounded-xl bg-black/50 border border-pink-500/20">
                  <span className="text-slate-400 text-[10px] block">BLESSING</span>
                  <strong className="text-[#00f5d4] text-sm">{selectedPerk.name}</strong>
                </div>
                <div className="p-3 rounded-xl bg-black/50 border border-pink-500/20">
                  <span className="text-slate-400 text-[10px] block">BAG CAPACITY</span>
                  <strong className="text-purple-300 text-sm">
                    {perkId === 'PACK_MULE' ? '150 KG' : '100 KG'}
                  </strong>
                </div>
              </div>

              {/* Launch Button */}
              <div className="pt-2">
                <button
                  disabled={loading}
                  onClick={handleCreate}
                  className="w-full py-4 rounded-xl font-mono font-black text-sm uppercase tracking-widest bg-gradient-to-r from-amber-400 via-pink-500 to-cyan-400 hover:from-amber-300 hover:via-pink-400 hover:to-cyan-300 text-slate-950 shadow-[0_0_30px_rgba(242,0,137,0.5)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                      Forging Saint...
                    </>
                  ) : (
                    <>
                      <Flame className="w-5 h-5 text-slate-950" />
                      FORGE SAINT // ENTER REALM
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── FOOTER BAR ── */}
      <footer className="relative z-30 w-full max-w-5xl mx-auto flex items-center justify-between text-[10px] font-mono text-pink-500/60 pt-3 border-t border-pink-500/20">
        <span>⚔ Saints Gaming MMO Core Engine // Saint Forge ⚔</span>
        <span className="text-cyan-400/80">Step {currentNum} of 5</span>
      </footer>
    </div>
  );
}
