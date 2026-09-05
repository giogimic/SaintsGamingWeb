/**
 * Combat skill typings vs gathering/artisan matrix.
 * Skills are NOT class-gated — classes only apply starting level deltas.
 */

export const COMBAT_SKILL_TYPINGS = [
  "attack",
  "strength",
  "defence",
  "hitpoints",
  "ranged",
  "agility",
  "perception",
  "wisdom",
  "intelligence",
] as const;

export type CombatSkillTyping = (typeof COMBAT_SKILL_TYPINGS)[number];

/** Gathering / artisan / support — unchanged Phase 1 matrix (server slugs). */
export const GATHERING_SKILL_SLUGS = [
  "farming",
  "fishing",
  "hunter",
  "mining",
  "woodcutting",
] as const;

export const ARTISAN_SKILL_SLUGS = [
  "construction",
  "cooking",
  "crafting",
  "firemaking",
  "fletching",
  "herblore",
  "runecrafting",
  "smithing",
] as const;

export const SUPPORT_SKILL_SLUGS = ["thieving", "summoning", "magic", "prayer", "necromancy"] as const;

export type SkillData = { level: number; xp: number };

/** Display label for overlays (Title Case). */
export function skillSlugToLabel(slug: string): string {
  if (slug === "hitpoints") return "Hitpoints";
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

/** Normalize UI / legacy keys → lowercase server slugs. */
export function normalizeSkillSlug(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return s;
  const lower = s.toLowerCase();
  const aliases: Record<string, string> = {
    constitution: "hitpoints",
    hp: "hitpoints",
    hitpoint: "hitpoints",
    defense: "defence",
    def: "defence",
    str: "strength",
    atk: "attack",
    agi: "agility",
    int: "intelligence",
    wis: "wisdom",
    per: "perception",
    rng: "ranged",
  };
  return aliases[lower] || lower;
}

/** Label → slug for INITIAL_SKILLS migration. */
export function labelToSkillSlug(label: string): string {
  return normalizeSkillSlug(label);
}

/** Bible combat curve: Level = floor(sqrt(XP / 50)) + 1, max 50. */
export function calculateCombatLevelFromXp(xp: number): number {
  const level = Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
  return Math.min(Math.max(level, 1), 50);
}

export function isCombatSkillTyping(slug: string): boolean {
  return (COMBAT_SKILL_TYPINGS as readonly string[]).includes(normalizeSkillSlug(slug));
}

/** All combat typings at level 1. */
export function baseCombatSkills(): Record<CombatSkillTyping, SkillData> {
  const out = {} as Record<CombatSkillTyping, SkillData>;
  for (const k of COMBAT_SKILL_TYPINGS) {
    out[k] = { level: 1, xp: 0 };
  }
  return out;
}

/** Apply class skill deltas (added to base level 1). Clamp 1–50. */
export function applySkillDeltas(
  base: Record<string, SkillData>,
  deltas: Record<string, number> | null | undefined
): Record<string, SkillData> {
  const serapht = { ...base };
  if (!deltas) return serapht;
  for (const [rawKey, delta] of Object.entries(deltas)) {
    const key = normalizeSkillSlug(rawKey);
    const cur = serapht[key] || { level: 1, xp: 0 };
    const level = Math.min(50, Math.max(1, cur.level + (Number(delta) || 0)));
    serapht[key] = { ...cur, level };
  }
  return serapht;
}

/** Build full client skill map: combat typings + gathering/artisan (Title Case keys for UI compat). */
export function buildInitialSkills(
  skillDeltas?: Record<string, number> | null
): Record<string, SkillData> {
  const combat = applySkillDeltas(baseCombatSkills(), skillDeltas);
  const skills: Record<string, SkillData> = {};

  for (const slug of COMBAT_SKILL_TYPINGS) {
    skills[skillSlugToLabel(slug)] = combat[slug];
  }

  const extras = [
    ...GATHERING_SKILL_SLUGS,
    ...ARTISAN_SKILL_SLUGS,
    ...SUPPORT_SKILL_SLUGS,
  ];
  for (const slug of extras) {
    const label = skillSlugToLabel(slug);
    if (!skills[label]) skills[label] = { level: 1, xp: 0 };
  }

  return skills;
}

/** All 27 skill slugs across Combat, Gathering, Artisan, and Support categories. */
export const ALL_SKILL_SLUGS = [
  ...COMBAT_SKILL_TYPINGS,
  ...GATHERING_SKILL_SLUGS,
  ...ARTISAN_SKILL_SLUGS,
  ...SUPPORT_SKILL_SLUGS,
] as const;

export type SkillSlug = (typeof ALL_SKILL_SLUGS)[number];

/** Total number of skills in the game. */
export const TOTAL_SKILLS_COUNT = ALL_SKILL_SLUGS.length; // 27

/** Maximum level across all 27 skills (Combat max 50 / 99 depending on curve, standard max 99 = 2673). */
export const MAX_TOTAL_LEVEL = 2673;

/** Compute the total skill level from a character's skill state. */
export function calculateTotalLevel(skills?: Record<string, SkillData> | null): number {
  if (!skills) return TOTAL_SKILLS_COUNT;
  let total = 0;
  for (const slug of ALL_SKILL_SLUGS) {
    const label = skillSlugToLabel(slug);
    const data = skills[slug] || skills[label] || skills[slug.toLowerCase()];
    total += data?.level ? Math.max(1, data.level) : 1;
  }
  return total;
}

/** Compute the total accumulated XP across all skills. */
export function calculateTotalXp(skills?: Record<string, SkillData> | null): number {
  if (!skills) return 0;
  let total = 0;
  for (const slug of ALL_SKILL_SLUGS) {
    const label = skillSlugToLabel(slug);
    const data = skills[slug] || skills[label] || skills[slug.toLowerCase()];
    total += data?.xp ? Math.max(0, data.xp) : 0;
  }
  return total;
}

/** Check if the player has achieved Level 99 in all 27 skill proficiencies. */
export function isMaxCapeEligible(skills?: Record<string, SkillData> | null): boolean {
  if (!skills) return false;
  for (const slug of ALL_SKILL_SLUGS) {
    const label = skillSlugToLabel(slug);
    const data = skills[slug] || skills[label] || skills[slug.toLowerCase()];
    const level = data?.level || 1;
    // Combat skills can cap at 50 or 99; standard check requires max cap
    const requiredLevel = isCombatSkillTyping(slug) ? 50 : 99;
    if (level < requiredLevel) return false;
  }
  return true;
}

/** Comprehensive Max Cape and Master Totem progress overview. */
export function getMaxProgress(skills?: Record<string, SkillData> | null): {
  totalLevel: number;
  totalXp: number;
  maxTotalLevel: number;
  maxedSkillsCount: number;
  totalSkillsCount: number;
  isMaxed: boolean;
  percentComplete: number;
} {
  const totalLevel = calculateTotalLevel(skills);
  const totalXp = calculateTotalXp(skills);
  let maxedSkillsCount = 0;

  if (skills) {
    for (const slug of ALL_SKILL_SLUGS) {
      const label = skillSlugToLabel(slug);
      const data = skills[slug] || skills[label] || skills[slug.toLowerCase()];
      const level = data?.level || 1;
      const target = isCombatSkillTyping(slug) ? 50 : 99;
      if (level >= target) maxedSkillsCount++;
    }
  }

  const isMaxed = maxedSkillsCount === TOTAL_SKILLS_COUNT;
  // Calculate percentage against achievable total level (9 * 50 + 18 * 99 = 450 + 1782 = 2232)
  const achievableMax = 9 * 50 + 18 * 99;
  const percentComplete = Math.min(100, Math.round((totalLevel / achievableMax) * 100));

  return {
    totalLevel,
    totalXp,
    maxTotalLevel: achievableMax,
    maxedSkillsCount,
    totalSkillsCount: TOTAL_SKILLS_COUNT,
    isMaxed,
    percentComplete,
  };
}
