/**
 * Saints Gaming In-Game UI Theme Engine
 * 6 Authoritative Premade Game Engine Interface Styles
 * 
 * Strict styling rules:
 * - Clean dark glass (bg-card/90, bg-[#050b14]/95, backdrop-blur-xl)
 * - Gold/amber primary accents, theme-responsive vitality gauges
 * - Zero cyberpunk/synthwave neon clutter or polygonal clip-paths
 * - Friendly, laid-back gaming atmosphere ("Saints Gaming: Time To Play")
 */

export interface HudTheme {
  id: string;
  name: string;
  tagline: string;
  description: string;
  badge: string;
  palette: {
    primary: string;
    primaryMuted: string;
    border: string;
    borderActive: string;
    glassBg: string;
    glassHeaderBg: string;
    hpFill: string;
    mpFill: string;
    xpFill: string;
    accentGlow: string;
    badgeBg: string;
    badgeText: string;
  };
  borderRadiusClass: string;
  isDefault?: boolean;
}

export const BUILTIN_HUD_THEMES: Record<string, HudTheme> = {
  'saints-gold': {
    id: 'saints-gold',
    name: 'Saints Gold (Default)',
    tagline: 'Canonical Saints Gaming Theme',
    description: 'Deep obsidian glass with warm gold & amber accents, gold vitals trim, and sleek modern edges.',
    badge: 'Canonical',
    isDefault: true,
    palette: {
      primary: '#f59e0b',
      primaryMuted: 'rgba(245, 158, 11, 0.2)',
      border: 'border-amber-500/35',
      borderActive: 'border-amber-400',
      glassBg: 'bg-[#050b14]/95',
      glassHeaderBg: 'bg-[#0a1424]/90',
      hpFill: 'bg-gradient-to-r from-rose-600 to-amber-500',
      mpFill: 'bg-gradient-to-r from-sky-600 to-cyan-400',
      xpFill: 'bg-gradient-to-r from-amber-600 to-yellow-400',
      accentGlow: '0 0 20px rgba(245, 158, 11, 0.25)',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300',
    },
    borderRadiusClass: 'rounded-2xl',
  },
  'obsidian-slate': {
    id: 'obsidian-slate',
    name: 'Classic Fantasy (Obsidian Slate)',
    tagline: 'Traditional MMO Dark Slate',
    description: 'Muted steel and dark slate frame with ruby life, sapphire mana, and traditional RPG contrast.',
    badge: 'Classic RPG',
    palette: {
      primary: '#94a3b8',
      primaryMuted: 'rgba(148, 163, 184, 0.2)',
      border: 'border-slate-500/40',
      borderActive: 'border-slate-300',
      glassBg: 'bg-[#090d16]/95',
      glassHeaderBg: 'bg-[#111827]/90',
      hpFill: 'bg-gradient-to-r from-red-700 to-rose-600',
      mpFill: 'bg-gradient-to-r from-blue-700 to-indigo-500',
      xpFill: 'bg-gradient-to-r from-emerald-600 to-teal-400',
      accentGlow: '0 0 20px rgba(148, 163, 184, 0.2)',
      badgeBg: 'bg-slate-500/20',
      badgeText: 'text-slate-200',
    },
    borderRadiusClass: 'rounded-xl',
  },
  'midnight-minimal': {
    id: 'midnight-minimal',
    name: 'Midnight Minimalist',
    tagline: 'Ultra-Clean Unobstructed View',
    description: 'Borderless charcoal glass with ultra-thin gauges and subtle micro-indicators for pure viewport immersion.',
    badge: 'Minimal',
    palette: {
      primary: '#e2e8f0',
      primaryMuted: 'rgba(255, 255, 255, 0.1)',
      border: 'border-white/15',
      borderActive: 'border-white/40',
      glassBg: 'bg-[#030712]/85',
      glassHeaderBg: 'bg-[#080d1a]/80',
      hpFill: 'bg-rose-500',
      mpFill: 'bg-sky-500',
      xpFill: 'bg-emerald-500',
      accentGlow: '0 0 15px rgba(255, 255, 255, 0.15)',
      badgeBg: 'bg-white/10',
      badgeText: 'text-white',
    },
    borderRadiusClass: 'rounded-lg',
  },
  'emerald-grove': {
    id: 'emerald-grove',
    name: 'Emerald Grove (Wildlands)',
    tagline: 'Nature & Ancient Relics',
    description: 'Deep forest jade glass with Celtic gold trim and vibrant living-root life bars.',
    badge: 'Nature',
    palette: {
      primary: '#10b981',
      primaryMuted: 'rgba(168, 185, 129, 0.2)',
      border: 'border-emerald-500/40',
      borderActive: 'border-emerald-400',
      glassBg: 'bg-[#04130d]/95',
      glassHeaderBg: 'bg-[#062419]/90',
      hpFill: 'bg-gradient-to-r from-emerald-600 to-lime-400',
      mpFill: 'bg-gradient-to-r from-teal-600 to-cyan-400',
      xpFill: 'bg-gradient-to-r from-amber-500 to-emerald-400',
      accentGlow: '0 0 20px rgba(16, 185, 129, 0.3)',
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-300',
    },
    borderRadiusClass: 'rounded-2xl',
  },
  'royal-arcane': {
    id: 'royal-arcane',
    name: 'Royal Arcane (Amethyst)',
    tagline: 'Mystical Celestial Power',
    description: 'Celestial violet and deep night glass with glowing mystical amethyst highlights.',
    badge: 'Arcane',
    palette: {
      primary: '#a855f7',
      primaryMuted: 'rgba(168, 85, 247, 0.2)',
      border: 'border-purple-500/40',
      borderActive: 'border-purple-400',
      glassBg: 'bg-[#0b071a]/95',
      glassHeaderBg: 'bg-[#150e2e]/90',
      hpFill: 'bg-gradient-to-r from-fuchsia-600 to-rose-500',
      mpFill: 'bg-gradient-to-r from-violet-600 to-indigo-400',
      xpFill: 'bg-gradient-to-r from-purple-500 to-pink-400',
      accentGlow: '0 0 20px rgba(168, 85, 247, 0.3)',
      badgeBg: 'bg-purple-500/20',
      badgeText: 'text-purple-300',
    },
    borderRadiusClass: 'rounded-2xl',
  },
  'crimson-vanguard': {
    id: 'crimson-vanguard',
    name: 'Crimson Vanguard (Gladiator)',
    tagline: 'High-Impact Battle Vitals',
    description: 'Molten dark iron with blood-red battle vitals, intense fury energy bars, and heavy action frames.',
    badge: 'Combat Focus',
    palette: {
      primary: '#ef4444',
      primaryMuted: 'rgba(239, 68, 68, 0.2)',
      border: 'border-rose-500/45',
      borderActive: 'border-rose-400',
      glassBg: 'bg-[#120507]/95',
      glassHeaderBg: 'bg-[#220a0e]/90',
      hpFill: 'bg-gradient-to-r from-rose-700 to-red-500',
      mpFill: 'bg-gradient-to-r from-amber-600 to-orange-500',
      xpFill: 'bg-gradient-to-r from-rose-600 to-amber-400',
      accentGlow: '0 0 20px rgba(239, 68, 68, 0.3)',
      badgeBg: 'bg-rose-500/20',
      badgeText: 'text-rose-300',
    },
    borderRadiusClass: 'rounded-xl',
  },
  'pocket-creature': {
    id: 'pocket-creature',
    name: 'Pocket Companion (Monster Hearts)',
    tagline: 'Creature Battler & Dynamic Heart Vitals',
    description: 'Pokéball ruby & obsidian glass styling with dynamic heart containers, tri-color Pokémon battle gauges, and electric PP energy bars.',
    badge: 'Creature / Hearts',
    palette: {
      primary: '#ef4444',
      primaryMuted: 'rgba(239, 68, 68, 0.2)',
      border: 'border-red-500/40',
      borderActive: 'border-red-400',
      glassBg: 'bg-[#0a0f1d]/95',
      glassHeaderBg: 'bg-[#151c2e]/90',
      hpFill: 'bg-gradient-to-r from-red-600 via-rose-500 to-pink-500',
      mpFill: 'bg-gradient-to-r from-amber-400 to-yellow-300',
      xpFill: 'bg-gradient-to-r from-cyan-500 to-blue-500',
      accentGlow: '0 0 20px rgba(239, 68, 68, 0.3)',
      badgeBg: 'bg-red-500/20',
      badgeText: 'text-red-300',
    },
    borderRadiusClass: 'rounded-2xl',
  },
  'retro-pixel-heart': {
    id: 'retro-pixel-heart',
    name: 'Retro Pixel Hearts (8-Bit)',
    tagline: 'Classic 8-Bit Heart Adventure',
    description: 'Charming retro pixel health frames with Zelda & Pokémon heart containers, emerald mana, and golden star XP.',
    badge: 'Retro 8-Bit',
    palette: {
      primary: '#f59e0b',
      primaryMuted: 'rgba(245, 158, 11, 0.2)',
      border: 'border-amber-400/40',
      borderActive: 'border-amber-300',
      glassBg: 'bg-[#0c1017]/95',
      glassHeaderBg: 'bg-[#161c26]/90',
      hpFill: 'bg-gradient-to-r from-rose-600 to-red-500',
      mpFill: 'bg-gradient-to-r from-emerald-500 to-teal-400',
      xpFill: 'bg-gradient-to-r from-amber-400 to-yellow-300',
      accentGlow: '0 0 20px rgba(245, 158, 11, 0.3)',
      badgeBg: 'bg-amber-400/20',
      badgeText: 'text-amber-300',
    },
    borderRadiusClass: 'rounded-xl',
  },
};

export const DEFAULT_HUD_THEME_ID = 'saints-gold';

export type HudThemeId =
  | 'saints-gold'
  | 'obsidian-slate'
  | 'midnight-minimal'
  | 'emerald-grove'
  | 'royal-arcane'
  | 'crimson-vanguard'
  | 'pocket-creature'
  | 'retro-pixel-heart'
  | string;

export interface HudEngineConfig {
  themeId?: HudThemeId;
  scale?: number;
  opacity?: number;
  borderRadius?: 'rounded' | 'compact' | 'capsule';
  borderGlow?: boolean;
  minimapShape?: 'rounded' | 'circle' | 'square';
  vitalsFormat?: 'dual-bar' | 'compact-stacked' | 'heart-containers' | 'pokemon-gauge';
  heartContainerCount?: number;
  hotbarLayout?: '1x5' | '1x10' | '2x5';
  showCoords?: boolean;
  showHotbarKeybinds?: boolean;
  quickMenuButtons?: {
    inventory?: boolean;
    skills?: boolean;
    equipment?: boolean;
    quests?: boolean;
    gtc?: boolean;
    party?: boolean;
    dex?: boolean;
    achievements?: boolean;
    studio?: boolean;
    [key: string]: boolean | undefined;
  };
  [key: string]: any;
}

export function getHudTheme(themeId?: string | null): HudTheme {
  if (themeId && BUILTIN_HUD_THEMES[themeId]) {
    return BUILTIN_HUD_THEMES[themeId];
  }
  return BUILTIN_HUD_THEMES[DEFAULT_HUD_THEME_ID];
}

export const HUD_THEME_LIST = Object.values(BUILTIN_HUD_THEMES);

