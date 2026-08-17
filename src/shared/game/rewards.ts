/**
 * Saints Gaming — Canonical RewardBundle Engine (Bible 31 §1 & §2)
 * Unified reward definition and granting schema across Quests, Dialogue, Chests, Achievements, and Events.
 */

export interface ItemReward {
  itemId: string;
  count: number;
}

export interface SkillXpReward {
  skillId: string;
  xp: number;
}

export interface FactionRepReward {
  factionId: string;
  amount: number;
}

export interface RewardBundle {
  credits?: number;
  items?: ItemReward[];
  skillsXp?: SkillXpReward[];
  factionRep?: FactionRepReward[];
  lootPoolId?: string;
  titleRewardId?: string;
}

/**
 * Validates that a reward bundle conforms to canonical constraints (e.g. no negative values, valid counts).
 */
export function validateRewardBundle(bundle: RewardBundle): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (bundle.credits !== undefined && bundle.credits < 0) {
    errors.push('Credits reward cannot be negative.');
  }

  if (bundle.items) {
    for (const item of bundle.items) {
      if (!item.itemId || item.itemId.trim().length === 0) {
        errors.push('Item reward must specify a valid itemId.');
      }
      if (item.count <= 0) {
        errors.push(`Item count for '${item.itemId}' must be greater than 0.`);
      }
    }
  }

  if (bundle.skillsXp) {
    for (const sx of bundle.skillsXp) {
      if (sx.xp <= 0) {
        errors.push(`Skill XP grant for '${sx.skillId}' must be positive.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Combines multiple reward bundles into a single aggregated bundle.
 */
export function combineRewardBundles(...bundles: (RewardBundle | undefined | null)[]): RewardBundle {
  const result: RewardBundle = {
    credits: 0,
    items: [],
    skillsXp: [],
    factionRep: [],
  };

  for (const b of bundles) {
    if (!b) continue;

    if (b.credits) {
      result.credits = (result.credits || 0) + b.credits;
    }

    if (b.items) {
      for (const it of b.items) {
        const existing = result.items!.find((i) => i.itemId === it.itemId);
        if (existing) {
          existing.count += it.count;
        } else {
          result.items!.push({ ...it });
        }
      }
    }

    if (b.skillsXp) {
      for (const sx of b.skillsXp) {
        const existing = result.skillsXp!.find((s) => s.skillId === sx.skillId);
        if (existing) {
          existing.xp += sx.xp;
        } else {
          result.skillsXp!.push({ ...sx });
        }
      }
    }

    if (b.factionRep) {
      for (const fr of b.factionRep) {
        const existing = result.factionRep!.find((f) => f.factionId === fr.factionId);
        if (existing) {
          existing.amount += fr.amount;
        } else {
          result.factionRep!.push({ ...fr });
        }
      }
    }

    if (b.lootPoolId) {
      result.lootPoolId = b.lootPoolId;
    }

    if (b.titleRewardId) {
      result.titleRewardId = b.titleRewardId;
    }
  }

  return result;
}
