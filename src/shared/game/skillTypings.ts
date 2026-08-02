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
  const next = { ...base };
  if (!deltas) return next;
  for (const [rawKey, delta] of Object.entries(deltas)) {
    const key = normalizeSkillSlug(rawKey);
    const cur = next[key] || { level: 1, xp: 0 };
    const level = Math.min(50, Math.max(1, cur.level + (Number(delta) || 0)));
    next[key] = { ...cur, level };
  }
  return next;
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
