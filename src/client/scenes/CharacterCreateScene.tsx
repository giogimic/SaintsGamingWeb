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
import { getStarterHeroes } from '@/app/actions/game/starter-heroes';
import { getSpawnMapId } from '@/app/actions/settings';
import { getPlayableClasses } from '@/app/actions/game/character-classes';
import { ensureWorldProfiles } from '@/app/actions/studio/world-profiles';
import { toast } from 'sonner';
import { INITIAL_SKILLS } from '@/web/components/the-lobby/store';
import { useSessionStore } from '../state/useSessionStore';
import { soundSynth } from '@/engine/sound-synth';
import {
  ClassDefData,
  emptyClassDef,
  resolveClassStats,
  resolveStartingSkills,
} from '@/shared/game/classCatalog';
import { CharacterSpritePreview } from '@/client/ui/shared/CharacterSpritePreview';
import { AssetManager } from '@/engine/assets/AssetManager';
import { MidnightTropicalBackground } from '@/client/ui/shared/MidnightTropicalBackground';
import { useTheme } from 'next-themes';
import { ArchetypePicker } from './character-create/ArchetypePicker';
import { IdentityForm } from './character-create/IdentityForm';
import { AppearanceCustomizer } from './character-create/AppearanceCustomizer';

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
  assetProfileId: string;
  spriteBundleId?: string | null;
  flavor: string;
  tag: string;
  tagColor: string;
  startingMap?: string;
  startingX?: number;
  startingY?: number;
  startingInventory?: string | null;
};

export type CreatorStep = 'HERO_PICK' | 'NAME' | 'APPEARANCE' | 'GIFT' | 'REVIEW';

export type PresentationMode = 'complete' | 'modular' | 'portrait_only' | 'unavailable';

export function detectPresentationMode(
  id: string | null | undefined,
  _availableAssets?: string[]
): PresentationMode {
  if (!id) return 'unavailable';
  if (
    id === 'human_base' || 
    id.startsWith('good-') || 
    id.startsWith('evil-') || 
    id.startsWith('item-') ||
    ['scout_mira', 'capturer_kian', 'soulmarshal_aldric', 'ironwright_kael', 'candrift_keeper', 'elder_voss'].includes(id)
  ) {
    return 'modular';
  }
  return 'complete';
}

export function CharacterCreateScene() {
  const [step, setStep] = useState<CreatorStep>('HERO_PICK');
  const [name, setName] = useState('');
  const [assetProfileId, setassetProfileId] = useState('evil-berserker-bloodaxe-male');
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
    assetProfileId,
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
      const { CHARACTER_SPRITES } = await import('@/web/components/the-lobby/data/sprites');
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
    setassetProfileId(hero.assetProfileId);
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

  const handleRollHero = () => {
    if (starterHeroes.length === 0) return;
    soundSynth?.playSelectSound?.();
    const hero = starterHeroes[Math.floor(Math.random() * starterHeroes.length)];
    const pick = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const num = Math.floor(Math.random() * 90 + 10);
    const randomPerk = PERKS[Math.floor(Math.random() * PERKS.length)];

    setassetProfileId(hero.assetProfileId);
    setClassId(hero.classId);
    setSelectedHeroSlug(hero.slug);
    setName(`${pick}${num}`);
    setPerkId(randomPerk.id);

    if (dynamicCapes.length > 1 && Math.random() > 0.5) {
      const cape = dynamicCapes[Math.floor(Math.random() * dynamicCapes.length)];
      setSelectedCape(cape.id);
    }
    if (dynamicHats.length > 1 && Math.random() > 0.5) {
      const hat = dynamicHats[Math.floor(Math.random() * dynamicHats.length)];
      setSelectedHat(hat.id);
    }
    if (dynamicArmor.length > 1 && Math.random() > 0.5) {
      const armor = dynamicArmor[Math.floor(Math.random() * dynamicArmor.length)];
      setSelectedArmor(armor.id);
    }

    setStep('REVIEW');
    toast.success(`Rolled: ${hero.name} (${hero.classId})`);
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
      starterHeroes.find((h) => h.classId === classId && h.assetProfileId === assetProfileId);

    let startMap = hero?.startingMap && hero.startingMap !== 'DEMO_SANDBOX' ? hero.startingMap : '';
    let startX = hero?.startingX;
    let startY = hero?.startingY;

    if (!startMap) {
      try {
        startMap = await getSpawnMapId();
      } catch {
        startMap = 'STARTING_MEADOW';
      }
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
        base: assetProfileId,
        cape: selectedCape,
        hat: selectedHat,
        armor: selectedArmor,
      },
      appearance: {
        layers: activeLayers,
        base: assetProfileId,
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
      unlockedAbilities: selectedDef?.abilities || [],
      equippedAbilities: (selectedDef?.abilities || []).slice(0, 5),
    };

    const result = await createGameCharacter({
      name: name.trim(),
      assetProfileId,
      classId,
      initialState: JSON.stringify(initialState),
    });

    if (result.success && result.character) {
      toast.success('Saint forged! Entering the live realm...');
      setTimeout(() => useSessionStore.getState().setScene('character_select'), 300);
    } else {
      toast.error(result.error || 'Failed to forge character.');
      setLoading(false);
      if (result.error === 'Unauthorized') {
        useSessionStore.getState().setScene('login');
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
  const isVice = theme === 'vice';

  return (
    <div
      className="pointer-events-auto absolute inset-0 w-full h-full overflow-y-auto z-20 flex flex-col justify-between p-3 sm:p-6 pt-16 pb-14 sm:pt-14 sm:pb-10 select-none font-sans"
      style={{ backgroundColor: isLight ? '#240046' : isVice ? '#1b121c' : '#050014' }}
    >
      {/* Dynamic Horizon Background */}
      <MidnightTropicalBackground />

      {/* ── TOP BREADCRUMB & HEADER ── */}
      <header className="relative z-30 w-full max-w-5xl mx-auto flex items-center justify-between border-b border-border/40 pb-3 mb-4">
        <button
          onClick={() => {
            soundSynth?.playSelectSound?.();
            if (step === 'HERO_PICK') {
              useSessionStore.getState().setScene('character_select');
            } else if (step === 'NAME') setStep('HERO_PICK');
            else if (step === 'APPEARANCE') setStep('NAME');
            else if (step === 'GIFT') {
              if (detectPresentationMode(assetProfileId, allSprites) === 'modular') setStep('APPEARANCE');
              else setStep('NAME');
            }
            else if (step === 'REVIEW') setStep('GIFT');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card/60 hover:bg-card border border-border/40 text-foreground font-mono text-xs transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>{step === 'HERO_PICK' ? 'Back to Select' : 'Back'}</span>
        </button>

        {/* Steps Breadcrumb */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {(['HERO_PICK', 'NAME', 'APPEARANCE', 'GIFT', 'REVIEW'] as CreatorStep[])
            .filter(s => s !== 'APPEARANCE' || detectPresentationMode(assetProfileId, allSprites) === 'modular')
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
                ? 'Perk'
                : 'Summary';

            return (
              <React.Fragment key={s}>
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                    isCur
                      ? 'bg-primary/20 border border-primary/50 text-primary font-bold shadow-[0_0_10px_rgba(234,179,8,0.2)]'
                      : isDone
                      ? 'text-primary/80 opacity-90'
                      : 'text-muted-foreground opacity-50'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                      isCur
                        ? 'bg-primary text-primary-foreground'
                        : isDone
                        ? 'bg-primary/30 text-primary'
                        : 'bg-white/10 text-muted-foreground'
                    }`}
                  >
                    {isDone ? '✓' : i + 1}
                  </span>
                  <span className="hidden sm:inline uppercase tracking-wider text-[11px]">{label}</span>
                </div>
                {i < arr.length - 1 && <span className="text-border/60 text-xs">›</span>}
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
          <ArchetypePicker
            starterHeroes={starterHeroes}
            heroesLoading={heroesLoading}
            classDefs={classDefs}
            selectedHeroSlug={selectedHeroSlug}
            onSelect={handleHeroPick}
            onRandomize={handleRollHero}
          />
        )}

        {/* ── STEP 2: NAME / IDENTITY ── */}
        {step === 'NAME' && (
          <IdentityForm
            name={name}
            onNameChange={setName}
            activeLayers={activeLayers}
            onRandomize={handleRandomizeName}
            onProceed={() => {
              soundSynth?.playActionSound?.();
              const mode = detectPresentationMode(assetProfileId, allSprites);
              if (mode === 'modular') setStep('APPEARANCE');
              else setStep('GIFT');
            }}
            presentationMode={detectPresentationMode(assetProfileId, allSprites)}
          />
        )}

        {/* ── STEP 3: APPEARANCE / MODULAR SPRITE CUSTOMIZER ── */}
        {step === 'APPEARANCE' && (
          <AppearanceCustomizer
            name={name}
            classId={classId}
            activeLayers={activeLayers}
            assetProfileId={assetProfileId}
            selectedCape={selectedCape}
            selectedHat={selectedHat}
            selectedArmor={selectedArmor}
            dynamicBases={dynamicBases}
            dynamicCapes={dynamicCapes}
            dynamicHats={dynamicHats}
            dynamicArmor={dynamicArmor}
            appearanceTab={appearanceTab}
            setAppearanceTab={setAppearanceTab}
            setAssetProfileId={setassetProfileId}
            setSelectedCape={setSelectedCape}
            setSelectedHat={setSelectedHat}
            setSelectedArmor={setSelectedArmor}
            onProceed={() => {
              soundSynth?.playActionSound?.();
              setStep('GIFT');
            }}
            spriteSearch={spriteSearch}
            setSpriteSearch={setSpriteSearch}
            spritePage={spritePage}
            setSpritePage={setSpritePage}
            totalSpritePages={totalSpritePages}
            currentSprites={currentSprites}
          />
        )}

        {/* ── STEP 4: PERK / STARTING TRAIT ── */}
        {step === 'GIFT' && (
          <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-black uppercase font-mono tracking-wider mb-1 text-foreground">
                <span className="sg-text-gradient">Starting Perk</span>
              </h2>
              <p className="text-muted-foreground text-xs font-mono tracking-wide">
                Select a permanent passive bonus perk for this character
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
                    className={`cursor-pointer rounded-xl p-4 border transition-all ${
                      isSelected
                        ? 'bg-primary/15 border-primary shadow-[0_0_20px_rgba(234,179,8,0.25)] scale-[1.02]'
                        : 'bg-[#050b14]/90 border-border/50 hover:border-primary/40 hover:bg-[#0a1628]/80 hover:scale-[1.01]'
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
                        <span className="font-bold font-mono text-sm text-foreground">{perk.name}</span>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase"
                        style={{ backgroundColor: `${perk.color}22`, color: perk.color }}
                      >
                        {perk.badge}
                      </span>
                    </div>
                    <p className="text-xs font-sans text-muted-foreground leading-relaxed">{perk.desc}</p>
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
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(234,179,8,0.25)] cursor-pointer transition-all"
              >
                Review Character <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: REVIEW & ENTER WORLD ── */}
        {step === 'REVIEW' && (
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-black uppercase font-mono tracking-wider mb-1 text-foreground">
                <span className="sg-text-gradient">Hero Summary</span>
              </h2>
              <p className="text-muted-foreground text-xs font-mono tracking-wide">
                Review your character attributes and confirm realm entry
              </p>
            </div>

            <div className="w-full bg-[#050b14]/95 border-2 border-primary/50 rounded-2xl p-6 shadow-[0_0_35px_rgba(234,179,8,0.15)] flex flex-col gap-5">
              {/* Profile Card */}
              <div className="flex items-center gap-5 border-b border-border/40 pb-4">
                <div className="w-20 h-20 rounded-2xl bg-black/80 border border-primary/50 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
                  <CharacterSpritePreview layers={activeLayers} size={32} scale={2} />
                </div>
                <div>
                  <h3 className="text-2xl font-black font-mono text-foreground">{name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2.5 py-0.5 rounded bg-primary/20 border border-primary/40 text-primary text-xs font-mono font-bold">
                      {classId}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">Level 1 Saint</span>
                  </div>
                </div>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-card/60 border border-border/40">
                  <span className="text-muted-foreground text-[10px] block font-bold">HEALTH</span>
                  <strong className="text-rose-400 text-sm">
                    {100 + (perkId === 'STAMINA_SURGE' ? 30 : 0)} HP
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-card/60 border border-border/40">
                  <span className="text-muted-foreground text-[10px] block font-bold">POUCH</span>
                  <strong className="text-primary text-sm">1,000 C</strong>
                </div>
                <div className="p-3 rounded-xl bg-card/60 border border-border/40">
                  <span className="text-muted-foreground text-[10px] block font-bold">STARTING PERK</span>
                  <strong className="text-foreground text-sm">{selectedPerk.name}</strong>
                </div>
                <div className="p-3 rounded-xl bg-card/60 border border-border/40">
                  <span className="text-muted-foreground text-[10px] block font-bold">CARRY CAPACITY</span>
                  <strong className="text-foreground text-sm">
                    {perkId === 'PACK_MULE' ? '150 KG' : '100 KG'}
                  </strong>
                </div>
              </div>

              {/* Launch Button */}
              <div className="pt-2">
                <button
                  disabled={loading}
                  onClick={handleCreate}
                  className="w-full py-4 rounded-xl font-mono font-black text-sm uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_30px_rgba(234,179,8,0.3)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-primary-foreground" />
                      Creating Hero...
                    </>
                  ) : (
                    <>
                      <Flame className="w-5 h-5 text-primary-foreground" />
                      CREATE HERO &amp; ENTER REALM
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── FOOTER BAR ── */}
      <footer className="relative z-30 w-full max-w-5xl mx-auto flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-3 border-t border-border/30">
        <span>Saints Gaming: Time To Play</span>
        <span className="text-primary">Step {currentNum} of 5</span>
      </footer>
    </div>
  );
}
