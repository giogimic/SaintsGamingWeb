/**
 * Saints Gaming — Canonical Status Effects & Buff/Debuff Registry (Bible 25 §3.2)
 * Governs combat status effects across real-time MMO combat and turn-based creature battles.
 */

export type StatusCategory = 'BUFF' | 'DEBUFF' | 'CONTROL' | 'DAMAGE_OVER_TIME';

export interface StatusEffectEffect {
  type: 'damage' | 'heal' | 'modify_stat' | 'stun' | 'root';
  power?: number;
  stat?: string;
  delta?: number;
  style?: 'physical' | 'ability' | 'true';
}

export interface StatusDef {
  id: string;
  name: string;
  description: string;
  category: StatusCategory;
  maxStacks: number;
  durationTurnsDefault: number;
  durationMsDefault: number;
  tickEffects: StatusEffectEffect[];
  captureModifier?: number; // Multiplier on capture chance (e.g. Sleep/Freeze = 1.5x)
  colorHex: string;
  iconName: string;
  tags: string[];
  isActive: boolean;
}

export const CANONICAL_STATUS_EFFECTS: Record<string, StatusDef> = {
  burn: {
    id: 'burn',
    name: 'Burn',
    description: 'Deals Solar fire damage over time and reduces enemy physical attack by 10%.',
    category: 'DAMAGE_OVER_TIME',
    maxStacks: 3,
    durationTurnsDefault: 4,
    durationMsDefault: 8000,
    tickEffects: [{ type: 'damage', power: 15, style: 'ability' }],
    captureModifier: 1.2,
    colorHex: '#f97316',
    iconName: 'Flame',
    tags: ['fire', 'dot', 'debuff'],
    isActive: true,
  },
  poison: {
    id: 'poison',
    name: 'Poison',
    description: 'Deals Bio toxin damage every second, bypassing shields.',
    category: 'DAMAGE_OVER_TIME',
    maxStacks: 5,
    durationTurnsDefault: 5,
    durationMsDefault: 10000,
    tickEffects: [{ type: 'damage', power: 12, style: 'true' }],
    captureModifier: 1.2,
    colorHex: '#22c55e',
    iconName: 'Biohazard',
    tags: ['poison', 'dot', 'debuff'],
    isActive: true,
  },
  frostbite: {
    id: 'frostbite',
    name: 'Frostbite',
    description: 'Slows movement and attack cadence by 25% while taking Cryo damage.',
    category: 'DEBUFF',
    maxStacks: 1,
    durationTurnsDefault: 3,
    durationMsDefault: 6000,
    tickEffects: [{ type: 'damage', power: 10, style: 'ability' }],
    captureModifier: 1.3,
    colorHex: '#38bdf8',
    iconName: 'Snowflake',
    tags: ['ice', 'slow', 'debuff'],
    isActive: true,
  },
  stun: {
    id: 'stun',
    name: 'Stunned',
    description: 'Completely incapacitates the target, preventing actions and movement.',
    category: 'CONTROL',
    maxStacks: 1,
    durationTurnsDefault: 1,
    durationMsDefault: 2500,
    tickEffects: [{ type: 'stun' }],
    captureModifier: 1.5,
    colorHex: '#eab308',
    iconName: 'Zap',
    tags: ['control', 'incapacitate'],
    isActive: true,
  },
  regen: {
    id: 'regen',
    name: 'Saintly Regeneration',
    description: 'Restores health steadily over time.',
    category: 'BUFF',
    maxStacks: 1,
    durationTurnsDefault: 4,
    durationMsDefault: 8000,
    tickEffects: [{ type: 'heal', power: 20 }],
    colorHex: '#10b981',
    iconName: 'Heart',
    tags: ['heal', 'buff', 'holy'],
    isActive: true,
  },
  might: {
    id: 'might',
    name: 'War Cry Might',
    description: 'Boosts physical damage output by +20%.',
    category: 'BUFF',
    maxStacks: 1,
    durationTurnsDefault: 3,
    durationMsDefault: 12000,
    tickEffects: [{ type: 'modify_stat', stat: 'atk', delta: 20 }],
    colorHex: '#ef4444',
    iconName: 'Sword',
    tags: ['buff', 'damage', 'physical'],
    isActive: true,
  },
};

export function getStatusDef(id: string): StatusDef | undefined {
  return CANONICAL_STATUS_EFFECTS[id.toLowerCase()];
}

export function getAllStatusDefs(): StatusDef[] {
  return Object.values(CANONICAL_STATUS_EFFECTS);
}
