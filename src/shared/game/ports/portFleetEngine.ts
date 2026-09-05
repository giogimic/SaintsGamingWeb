/**
 * Player-Owned Ports Fleet, Crew Recruitment & Vessel Management Engine (Bible 18 & Bible 31).
 *
 * Implements:
 * - Ship fleet registry (Hull, Deck equipment, Figurehead custom configurations).
 * - Captain and Crew recruitment with Combat, Morale, and Seafaring stats.
 * - Crew trait modifiers (Tactician, Leader, Navigator, Daredevil, Sturdy).
 * - Stat aggregation combining ship components, captain bonuses, and crew roster.
 * - Crew experience advancement and tier progression (Arc -> Shield regions).
 */

export type PortRegionTier = 'ARC' | 'SKULL' | 'HOOK' | 'SCYTHE' | 'BOWL' | 'PINCERS' | 'SHIELD';

export type CrewTrait = 'TACTICIAN' | 'LEADER' | 'NAVIGATOR' | 'DAREDEVIL' | 'STURDY';

export interface PortStats {
  combat: number;
  morale: number;
  seafaring: number;
  speed: number;
}

export interface CrewMember {
  id: string;
  name: string;
  role: 'CAPTAIN' | 'DECKHAND' | 'GUNNER' | 'NAVIGATOR' | 'EXILE';
  tier: PortRegionTier;
  baseStats: PortStats;
  traits: CrewTrait[];
  level: number;
  experience: number;
  isInjured: boolean;
}

export interface ShipComponent {
  id: string;
  name: string;
  slot: 'HULL' | 'DECK' | 'FIGUREHEAD';
  stats: Partial<PortStats>;
}

export interface PortShip {
  id: string;
  name: string;
  hull: ShipComponent;
  deck: ShipComponent;
  figurehead: ShipComponent;
  assignedCaptainId: string | null;
  assignedCrewIds: string[]; // Up to 4 crew members
  isAwayOnVoyage: boolean;
}

export interface PlayerPortState {
  portLevel: number;
  ships: PortShip[];
  crewRoster: CrewMember[];
}

export const SHIP_COMPONENT_CATALOG: Record<string, ShipComponent> = {
  // Hulls
  basic_wooden_hull: { id: 'basic_wooden_hull', name: 'Basic Wooden Hull', slot: 'HULL', stats: { combat: 100, morale: 100, seafaring: 100, speed: 10 } },
  reinforced_iron_hull: { id: 'reinforced_iron_hull', name: 'Reinforced Iron Hull', slot: 'HULL', stats: { combat: 350, morale: 200, seafaring: 250, speed: 12 } },
  black_lotus_hull: { id: 'black_lotus_hull', name: 'Black Lotus Hull', slot: 'HULL', stats: { combat: 600, morale: 500, seafaring: 600, speed: 15 } },

  // Deck Items
  bronze_cannons: { id: 'bronze_cannons', name: 'Bronze Cannons', slot: 'DECK', stats: { combat: 150 } },
  star_telescope: { id: 'star_telescope', name: 'Star Telescope', slot: 'DECK', stats: { seafaring: 150 } },
  festival_bunting: { id: 'festival_bunting', name: 'Festival Bunting', slot: 'DECK', stats: { morale: 150 } },

  // Figureheads
  mermaid_figurehead: { id: 'mermaid_figurehead', name: 'Mermaid Figurehead', slot: 'FIGUREHEAD', stats: { seafaring: 100, morale: 100 } },
  dragon_figurehead: { id: 'dragon_figurehead', name: 'Dragon Figurehead', slot: 'FIGUREHEAD', stats: { combat: 180 } },
  phoenix_figurehead: { id: 'phoenix_figurehead', name: 'Phoenix Figurehead', slot: 'FIGUREHEAD', stats: { combat: 100, morale: 100, speed: 3 } },
};

/**
 * Calculates effective stats for a crew member including traits, levels, and injury penalties.
 */
export function calculateCrewEffectiveStats(crew: CrewMember): PortStats {
  const levelMulti = 1 + (crew.level - 1) * 0.10; // +10% per level above 1
  let combat = crew.baseStats.combat * levelMulti;
  let morale = crew.baseStats.morale * levelMulti;
  let seafaring = crew.baseStats.seafaring * levelMulti;
  let speed = crew.baseStats.speed;

  for (const trait of crew.traits) {
    if (trait === 'TACTICIAN') combat *= 1.15;
    if (trait === 'LEADER') morale *= 1.15;
    if (trait === 'NAVIGATOR') seafaring *= 1.15;
    if (trait === 'DAREDEVIL') {
      speed += 3;
      morale *= 0.95;
    }
  }

  // Injury penalty: -50% stats
  if (crew.isInjured) {
    combat *= 0.5;
    morale *= 0.5;
    seafaring *= 0.5;
  }

  return {
    combat: Math.round(combat),
    morale: Math.round(morale),
    seafaring: Math.round(seafaring),
    speed: Math.round(speed),
  };
}

/**
 * Calculates total ship stats aggregated from Hull, Deck, Figurehead, Captain, and assigned Crew.
 */
export function calculateShipTotalStats(ship: PortShip, crewRoster: CrewMember[]): PortStats {
  const crewMap = new Map(crewRoster.map((c) => [c.id, c]));

  let totalCombat = (ship.hull.stats.combat || 0) + (ship.deck.stats.combat || 0) + (ship.figurehead.stats.combat || 0);
  let totalMorale = (ship.hull.stats.morale || 0) + (ship.deck.stats.morale || 0) + (ship.figurehead.stats.morale || 0);
  let totalSeafaring = (ship.hull.stats.seafaring || 0) + (ship.deck.stats.seafaring || 0) + (ship.figurehead.stats.seafaring || 0);
  let totalSpeed = (ship.hull.stats.speed || 0) + (ship.deck.stats.speed || 0) + (ship.figurehead.stats.speed || 0);

  // Captain stats
  if (ship.assignedCaptainId) {
    const captain = crewMap.get(ship.assignedCaptainId);
    if (captain) {
      const capStats = calculateCrewEffectiveStats(captain);
      totalCombat += capStats.combat;
      totalMorale += capStats.morale;
      totalSeafaring += capStats.seafaring;
      totalSpeed += capStats.speed;
    }
  }

  // Crew stats
  for (const crewId of ship.assignedCrewIds) {
    const crew = crewMap.get(crewId);
    if (crew) {
      const stats = calculateCrewEffectiveStats(crew);
      totalCombat += stats.combat;
      totalMorale += stats.morale;
      totalSeafaring += stats.seafaring;
      totalSpeed += stats.speed;
    }
  }

  return {
    combat: totalCombat,
    morale: totalMorale,
    seafaring: totalSeafaring,
    speed: totalSpeed,
  };
}

/**
 * Assigns a captain or crew member to a ship.
 */
export function assignCrewToShip(
  ship: PortShip,
  crew: CrewMember
): { success: boolean; error?: string } {
  if (ship.isAwayOnVoyage) {
    return { success: false, error: 'Cannot modify crew while ship is away on a voyage' };
  }

  if (crew.role === 'CAPTAIN') {
    ship.assignedCaptainId = crew.id;
    return { success: true };
  }

  if (ship.assignedCrewIds.length >= 4) {
    return { success: false, error: 'Ship crew capacity is full (Maximum 4 crew members)' };
  }

  if (ship.assignedCrewIds.includes(crew.id)) {
    return { success: false, error: 'Crew member is already assigned to this ship' };
  }

  ship.assignedCrewIds.push(crew.id);
  return { success: true };
}

/**
 * Awards experience to a crew member and handles level-ups.
 */
export function awardCrewExperience(
  crew: CrewMember,
  xpGained: number
): { newLevel: number; leveledUp: boolean } {
  crew.experience += xpGained;
  const currentLevel = crew.level;
  // XP formula: 1000 * level^1.5
  let seraphtLevelXp = Math.round(1000 * Math.pow(crew.level, 1.5));

  let leveledUp = false;
  while (crew.experience >= seraphtLevelXp && crew.level < 10) {
    crew.level += 1;
    leveledUp = true;
    seraphtLevelXp = Math.round(1000 * Math.pow(crew.level, 1.5));
  }

  return { newLevel: crew.level, leveledUp };
}
