import { describe, it, expect } from 'vitest';
import {
  SHIP_COMPONENT_CATALOG,
  calculateCrewEffectiveStats,
  calculateShipTotalStats,
  assignCrewToShip,
  awardCrewExperience,
  type CrewMember,
  type PortShip,
} from './portFleetEngine';

describe('Player-Owned Ports Fleet & Crew Engine', () => {
  it('calculates crew stats with level scaling, traits, and injuries', () => {
    const gunner: CrewMember = {
      id: 'c1',
      name: 'Blackbeard',
      role: 'GUNNER',
      tier: 'SKULL',
      baseStats: { combat: 100, morale: 50, seafaring: 40, speed: 5 },
      traits: ['TACTICIAN'], // +15% Combat
      level: 3, // +20% from levels (1 + 2*0.1) -> 120 combat * 1.15 = 138
      experience: 5000,
      isInjured: false,
    };

    const stats = calculateCrewEffectiveStats(gunner);
    expect(stats.combat).toBe(138);
    expect(stats.morale).toBe(60); // 50 * 1.2
    expect(stats.seafaring).toBe(48); // 40 * 1.2

    // Apply injury -> halves stats
    gunner.isInjured = true;
    const injuredStats = calculateCrewEffectiveStats(gunner);
    expect(injuredStats.combat).toBe(69);
    expect(injuredStats.morale).toBe(30);
  });

  it('aggregates total stats across ship hull, deck, figurehead, captain, and crew', () => {
    const captain: CrewMember = {
      id: 'cap_01',
      name: 'Captain Ned',
      role: 'CAPTAIN',
      tier: 'ARC',
      baseStats: { combat: 100, morale: 100, seafaring: 100, speed: 5 },
      traits: ['LEADER'], // +15% Morale
      level: 1,
      experience: 0,
      isInjured: false,
    };

    const crew1: CrewMember = {
      id: 'cr_01',
      name: 'First Mate Jack',
      role: 'NAVIGATOR',
      tier: 'ARC',
      baseStats: { combat: 50, morale: 50, seafaring: 150, speed: 5 },
      traits: ['NAVIGATOR'], // +15% Seafaring
      level: 1,
      experience: 0,
      isInjured: false,
    };

    const ship: PortShip = {
      id: 'ship_01',
      name: 'The Siren’s Wake',
      hull: SHIP_COMPONENT_CATALOG.basic_wooden_hull, // 100/100/100, spd 10
      deck: SHIP_COMPONENT_CATALOG.bronze_cannons, // +150 combat
      figurehead: SHIP_COMPONENT_CATALOG.mermaid_figurehead, // +100 seafaring, +100 morale
      assignedCaptainId: 'cap_01',
      assignedCrewIds: ['cr_01'],
      isAwayOnVoyage: false,
    };

    const total = calculateShipTotalStats(ship, [captain, crew1]);
    // Combat: 100(hull) + 150(cannons) + 0(fig) + 100(cap) + 50(crew) = 400
    expect(total.combat).toBe(400);
    // Morale: 100(hull) + 0 + 100(fig) + 115(cap leader) + 50(crew) = 365
    expect(total.morale).toBe(365);
    // Seafaring: 100(hull) + 0 + 100(fig) + 100(cap) + 173(crew nav) = 473
    expect(total.seafaring).toBe(473);
  });

  it('assigns crew members with capacity limits (max 4)', () => {
    const ship: PortShip = {
      id: 'ship_02',
      name: 'The Iron Galleon',
      hull: SHIP_COMPONENT_CATALOG.basic_wooden_hull,
      deck: SHIP_COMPONENT_CATALOG.bronze_cannons,
      figurehead: SHIP_COMPONENT_CATALOG.dragon_figurehead,
      assignedCaptainId: null,
      assignedCrewIds: ['c1', 'c2', 'c3', 'c4'],
      isAwayOnVoyage: false,
    };

    const extraCrew: CrewMember = {
      id: 'c5',
      name: 'Sailor Bill',
      role: 'DECKHAND',
      tier: 'ARC',
      baseStats: { combat: 50, morale: 50, seafaring: 50, speed: 5 },
      traits: [],
      level: 1,
      experience: 0,
      isInjured: false,
    };

    // 5th crew assignment fails
    const res = assignCrewToShip(ship, extraCrew);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Maximum 4');
  });

  it('awards crew experience and advances levels', () => {
    const crew: CrewMember = {
      id: 'c1',
      name: 'Old Salt',
      role: 'DECKHAND',
      tier: 'ARC',
      baseStats: { combat: 50, morale: 50, seafaring: 50, speed: 5 },
      traits: [],
      level: 1,
      experience: 0,
      isInjured: false,
    };

    const res = awardCrewExperience(crew, 3500);
    expect(res.leveledUp).toBe(true);
    expect(res.newLevel).toBeGreaterThan(1);
    expect(crew.experience).toBe(3500);
  });
});
