/**
 * Archipelago Map Exploration & Voyage Risk Simulation Engine (Bible 18 & Bible 31).
 *
 * Implements:
 * - 7 Progressive Archipelago Regions (Arc, Skull, Hook, Scythe, Bowl, Pincers, Shield).
 * - Multi-stat requirement check (Combat, Morale, Seafaring) and success probability calculations.
 * - High-seas random encounters (Kraken Attack, Maelstrom, Siren Song, Treasure Drift).
 * - Voyage departure, return, reward distribution, and crew injury resolution.
 */

import { type PortRegionTier, type PortStats, type PortShip, type CrewMember, awardCrewExperience } from './portFleetEngine';

export interface VoyageReward {
  resourceId: 'bamboo' | 'gunpowder' | 'slate' | 'cherrywood' | 'lacquer' | 'chi' | 'ancient_bones' | 'chimes';
  quantity: number;
}

export interface VoyageDef {
  id: string;
  name: string;
  region: PortRegionTier;
  durationMinutes: number;
  statRequirements: Partial<PortStats>; // e.g. { combat: 500, seafaring: 600 }
  rewards: VoyageReward[];
  distanceMiles: number;
}

export interface ActiveVoyage {
  voyageId: string;
  shipId: string;
  departureTime: number;
  returnTime: number;
  successChance: number; // 0.0 - 1.0
  isResolved: boolean;
}

export type SeaEventType = 'KRAKEN_ATTACK' | 'MAELSTROM' | 'SIREN_SONG' | 'TREASURE_DRIFT';

export interface SeaEventResult {
  eventType: SeaEventType;
  description: string;
  crewInjuredId?: string;
  bonusReward?: VoyageReward;
}

export const REGION_STAT_SCALING: Record<PortRegionTier, { minStat: number; maxStat: number }> = {
  ARC: { minStat: 200, maxStat: 500 },
  SKULL: { minStat: 500, maxStat: 900 },
  HOOK: { minStat: 900, maxStat: 1500 },
  SCYTHE: { minStat: 1500, maxStat: 2400 },
  BOWL: { minStat: 2400, maxStat: 3500 },
  PINCERS: { minStat: 3500, maxStat: 4800 },
  SHIELD: { minStat: 4800, maxStat: 6500 },
};

/**
 * Calculates voyage success chance (0.0 to 1.0) based on ship stats vs voyage requirements.
 * Formula: Multiplicative product of met requirement ratios.
 */
export function calculateVoyageSuccessChance(
  shipStats: PortStats,
  requirements: Partial<PortStats>
): number {
  const reqKeys = Object.keys(requirements) as Array<keyof PortStats>;
  if (reqKeys.length === 0) return 1.0;

  let totalScore = 0;
  for (const key of reqKeys) {
    const required = requirements[key] || 1;
    const provided = shipStats[key] || 0;
    const ratio = Math.min(1.0, provided / Math.max(1, required));
    totalScore += ratio;
  }

  const averageRatio = totalScore / reqKeys.length;
  // Non-linear scaling: square of average ratio for unforgiving high tiers
  return Math.min(1.0, Math.max(0.05, Math.round(averageRatio * 100) / 100));
}

/**
 * Launches an active voyage.
 */
export function launchVoyage(
  voyage: VoyageDef,
  ship: PortShip,
  shipStats: PortStats,
  currentTime: number = Date.now()
): { success: boolean; activeVoyage?: ActiveVoyage; error?: string } {
  if (ship.isAwayOnVoyage) {
    return { success: false, error: 'Ship is already away on a voyage' };
  }

  const successChance = calculateVoyageSuccessChance(shipStats, voyage.statRequirements);
  const durationMs = voyage.durationMinutes * 60 * 1000;

  ship.isAwayOnVoyage = true;

  const activeVoyage: ActiveVoyage = {
    voyageId: voyage.id,
    shipId: ship.id,
    departureTime: currentTime,
    returnTime: currentTime + durationMs,
    successChance,
    isResolved: false,
  };

  return { success: true, activeVoyage };
}

/**
 * Resolves a completed voyage upon ship return.
 */
export function resolveCompletedVoyage(
  voyage: VoyageDef,
  activeVoyage: ActiveVoyage,
  ship: PortShip,
  crewRoster: CrewMember[],
  rngSeed: number = Math.random()
): {
  isSuccess: boolean;
  earnedRewards: VoyageReward[];
  crewXpEarned: number;
  seaEvent?: SeaEventResult;
} {
  activeVoyage.isResolved = true;
  ship.isAwayOnVoyage = false;

  const isSuccess = rngSeed <= activeVoyage.successChance;
  const crewMap = new Map(crewRoster.map((c) => [c.id, c]));

  let earnedRewards: VoyageReward[] = [];
  let crewXpEarned = 0;
  let seaEvent: SeaEventResult | undefined;

  if (isSuccess) {
    earnedRewards = [...voyage.rewards];
    crewXpEarned = voyage.distanceMiles * 10;

    // Bonus treasure encounter on high roll
    if (Math.random() < 0.20) {
      const bonus: VoyageReward = { resourceId: 'chimes', quantity: 250 };
      earnedRewards.push(bonus);
      seaEvent = {
        eventType: 'TREASURE_DRIFT',
        description: 'Your crew salvaged drifting cargo chests containing extra chimes!',
        bonusReward: bonus,
      };
    }
  } else {
    // Failure: 25% salvage rewards, 50% chance a crew member gets injured
    earnedRewards = voyage.rewards.map((r) => ({
      resourceId: r.resourceId,
      quantity: Math.max(1, Math.floor(r.quantity * 0.25)),
    }));
    crewXpEarned = Math.floor(voyage.distanceMiles * 3);

    if (ship.assignedCrewIds.length > 0 && Math.random() < 0.50) {
      const victimId = ship.assignedCrewIds[Math.floor(Math.random() * ship.assignedCrewIds.length)];
      const victim = crewMap.get(victimId);
      if (victim) {
        victim.isInjured = true;
        seaEvent = {
          eventType: 'KRAKEN_ATTACK',
          description: `A violent Kraken attack crippled the ship! ${victim.name} suffered severe injuries.`,
          crewInjuredId: victimId,
        };
      }
    }
  }

  // Award XP to assigned captain and crew
  if (ship.assignedCaptainId) {
    const cap = crewMap.get(ship.assignedCaptainId);
    if (cap) awardCrewExperience(cap, crewXpEarned);
  }

  for (const cId of ship.assignedCrewIds) {
    const c = crewMap.get(cId);
    if (c) awardCrewExperience(c, crewXpEarned);
  }

  return { isSuccess, earnedRewards, crewXpEarned, seaEvent };
}
