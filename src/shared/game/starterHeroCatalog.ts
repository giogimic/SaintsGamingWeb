export type StarterHeroData = {
  id?: string;
  slug: string;
  gameId?: string;
  name: string;
  classId: string;
  assetProfileId: string;
  /** Optional GameAsset bundle id for a full modular/composited character sprite (see modular pack importer). */
  assetBundleId?: string | null;
  visualData?: string;
  flavor: string;
  tag: string;
  tagColor: string;
  sortOrder: number;
  isActive: boolean;
  startingMap: string;
  startingX: number;
  startingY: number;
  startingInventory: string;
};

export const DEFAULT_STARTER_HERO_PRESETS: StarterHeroData[] = [
  {
    slug: 'warrior',
    name: 'Knight Commander',
    classId: 'WARRIOR',
    assetProfileId: 'evil-berserker-bloodaxe-male',
    flavor: 'Frontline champion. High HP, stalwart defense, and unstoppable melee combat prowess.',
    tag: 'Frontline Melee',
    tagColor: '#f87171',
    sortOrder: 1,
    isActive: true,
    startingMap: 'LOBBY',
    startingX: 32,
    startingY: 32,
    startingInventory: '{"patch_kit":5}',
  },
  {
    slug: 'mystic',
    name: 'Arcane Elementalist',
    classId: 'MAGE',
    assetProfileId: 'good-wizard-archmage-male',
    flavor: 'Master of elemental forces. High burst damage and area control from safe range.',
    tag: 'Spellcaster',
    tagColor: '#a78bfa',
    sortOrder: 2,
    isActive: true,
    startingMap: 'LOBBY',
    startingX: 32,
    startingY: 32,
    startingInventory: '{"patch_kit":5}',
  },
  {
    slug: 'ranger',
    name: 'Shadow Stalker',
    classId: 'RANGER',
    assetProfileId: 'good-ranger-grovekeeper-female',
    flavor: 'Agile wilderness hunter. Swift movement, sharp precision, and tactical traps.',
    tag: 'Agile Marksman',
    tagColor: '#fbbf24',
    sortOrder: 3,
    isActive: true,
    startingMap: 'LOBBY',
    startingX: 32,
    startingY: 32,
    startingInventory: '{"patch_kit":5}',
  },
  {
    slug: 'paladin',
    name: 'Sun Paladin',
    classId: 'PALADIN',
    assetProfileId: 'good-paladin-templar-female',
    flavor: 'Holy champion blending unyielding armor with restorative auras and radiant smites.',
    tag: 'Holy Defender',
    tagColor: '#60a5fa',
    sortOrder: 4,
    isActive: true,
    startingMap: 'LOBBY',
    startingX: 32,
    startingY: 32,
    startingInventory: '{"patch_kit":5}',
  },
  {
    slug: 'priest',
    name: 'High Cleric',
    classId: 'PRIEST',
    assetProfileId: 'good-cleric-highpriestess-female',
    flavor: 'Devout healer channeled with ancient blessings, cleansing magic, and party buffs.',
    tag: 'Support Healer',
    tagColor: '#34d399',
    sortOrder: 5,
    isActive: true,
    startingMap: 'LOBBY',
    startingX: 32,
    startingY: 32,
    startingInventory: '{"patch_kit":5}',
  },
];
