import { describe, it, expect } from 'vitest';
import {
  calculateVoyageSuccessChance,
  launchVoyage,
  resolveCompletedVoyage,
  type VoyageDef,
} from './portVoyageEngine';
import { type PortShip, type CrewMember } from './portFleetEngine';

describe('Archipelago Map Exploration & Voyage Risk Engine', () => {
  it('calculates voyage success chance based on stat ratios', () => {
    // Requirements: 500 Combat, 500 Seafaring
    const reqs = { combat: 500, seafaring: 500 };

    // Ship provides 500 Combat, 500 Seafaring -> 100%
    const chance100 = calculateVoyageSuccessChance({ combat: 500, morale: 200, seafaring: 500, speed: 10 }, reqs);
    expect(chance100).toBe(1.0);

    // Ship provides 250 Combat (50%), 500 Seafaring (100%) -> Average 75%
    const chance75 = calculateVoyageSuccessChance({ combat: 250, morale: 200, seafaring: 500, speed: 10 }, reqs);
    expect(chance75).toBe(0.75);

    // Ship provides 0 Combat -> 25% average
    const chance25 = calculateVoyageSuccessChance({ combat: 0, morale: 200, seafaring: 250, speed: 10 }, reqs);
    expect(chance25).toBe(0.25);
  });

  it('launches a voyage and tracks away state', () => {
    const ship: PortShip = {
      id: 'ship_01',
      name: 'Windstrider',
      hull: { id: 'h1', name: 'Hull', slot: 'HULL', stats: { combat: 200 } },
      deck: { id: 'd1', name: 'Deck', slot: 'DECK', stats: { combat: 100 } },
      figurehead: { id: 'f1', name: 'Fig', slot: 'FIGUREHEAD', stats: { seafaring: 100 } },
      assignedCaptainId: null,
      assignedCrewIds: [],
      isAwayOnVoyage: false,
    };

    const voyage: VoyageDef = {
      id: 'v_arc_01',
      name: 'Bamboo Forest Patrol',
      region: 'ARC',
      durationMinutes: 30,
      statRequirements: { combat: 300, seafaring: 100 },
      rewards: [{ resourceId: 'bamboo', quantity: 50 }],
      distanceMiles: 25,
    };

    const res = launchVoyage(voyage, ship, { combat: 300, morale: 100, seafaring: 100, speed: 10 }, 1000000);
    expect(res.success).toBe(true);
    expect(ship.isAwayOnVoyage).toBe(true);
    expect(res.activeVoyage?.successChance).toBe(1.0);
    expect(res.activeVoyage?.returnTime).toBe(1000000 + 30 * 60 * 1000);

    // Cannot launch duplicate voyage while ship is away
    const dup = launchVoyage(voyage, ship, { combat: 300, morale: 100, seafaring: 100, speed: 10 });
    expect(dup.success).toBe(false);
    expect(dup.error).toContain('already away');
  });

  it('resolves voyage success and distributes trade resources and crew XP', () => {
    const captain: CrewMember = {
      id: 'cap_01',
      name: 'Captain Ned',
      role: 'CAPTAIN',
      tier: 'ARC',
      baseStats: { combat: 100, morale: 100, seafaring: 100, speed: 5 },
      traits: [],
      level: 1,
      experience: 0,
      isInjured: false,
    };

    const ship: PortShip = {
      id: 'ship_01',
      name: 'Windstrider',
      hull: { id: 'h1', name: 'Hull', slot: 'HULL', stats: {} },
      deck: { id: 'd1', name: 'Deck', slot: 'DECK', stats: {} },
      figurehead: { id: 'f1', name: 'Fig', slot: 'FIGUREHEAD', stats: {} },
      assignedCaptainId: 'cap_01',
      assignedCrewIds: [],
      isAwayOnVoyage: true,
    };

    const voyage: VoyageDef = {
      id: 'v_arc_02',
      name: 'Turtle Island Expedition',
      region: 'ARC',
      durationMinutes: 45,
      statRequirements: { combat: 100 },
      rewards: [{ resourceId: 'bamboo', quantity: 100 }],
      distanceMiles: 40,
    };

    const activeVoyage = {
      voyageId: voyage.id,
      shipId: ship.id,
      departureTime: 1000000,
      returnTime: 1000000 + 45 * 60 * 1000,
      successChance: 0.90,
      isResolved: false,
    };

    // Force success (seed 0.10 <= 0.90)
    const result = resolveCompletedVoyage(voyage, activeVoyage, ship, [captain], 0.10);
    expect(result.isSuccess).toBe(true);
    expect(result.earnedRewards[0].resourceId).toBe('bamboo');
    expect(result.earnedRewards[0].quantity).toBe(100);
    expect(result.crewXpEarned).toBe(400); // 40 miles * 10
    expect(captain.experience).toBe(400);
    expect(ship.isAwayOnVoyage).toBe(false);
  });
});
