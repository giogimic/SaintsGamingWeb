import { describe, it, expect } from 'vitest';
import {
  calculateUniqueDropChance,
  applyRaidDeathPenalty,
  rollRaidChestLoot,
  TOTAL_UNIQUE_WEIGHT,
  type PlayerRaidSummary,
} from './raidLootEngine';

describe('Raid Unique Drop Point Scaling & Chest Loot Engine', () => {
  it('calculates unique drop chance scaling up to 65% cap', () => {
    // 0 points -> 0%
    expect(calculateUniqueDropChance(0)).toBe(0);
    // 86,750 points -> 10%
    expect(calculateUniqueDropChance(86750)).toBeCloseTo(0.10, 3);
    // 260,250 points -> 30%
    expect(calculateUniqueDropChance(260250)).toBeCloseTo(0.30, 3);
    // 1,000,000 points -> clamped to 65% cap
    expect(calculateUniqueDropChance(1000000)).toBe(0.65);
  });

  it('applies 40% personal death penalty and party point deduction', () => {
    const player: PlayerRaidSummary = {
      playerId: 'p1',
      name: 'GioGimic',
      points: 20000,
      deaths: 0,
    };
    const totalParty = 60000;

    const res = applyRaidDeathPenalty(player, totalParty);
    // Player loses 40% of 20,000 = 8,000 points -> 12,000
    expect(res.pointsLost).toBe(8000);
    expect(res.newPlayerPoints).toBe(12000);
    expect(player.points).toBe(12000);
    expect(player.deaths).toBe(1);

    // Party loses 1% (600) + player points lost (8000) -> 60000 - 8600 = 51,400
    expect(res.newPartyPoints).toBe(51400);
  });

  it('awards unique loot and scales standard resource drops by contribution points', () => {
    const player: PlayerRaidSummary = {
      playerId: 'p1',
      name: 'GioGimic',
      points: 30000,
      deaths: 0,
    };
    const totalParty = 30000;

    // Force unique hit (uniqueRollSeed 0.001 < 0.0345) and roll Twisted Bow (seed near 1.0 on last bracket)
    const loot = rollRaidChestLoot(player, totalParty, false, false, 0.001, 0.99);
    expect(loot.hasUnique).toBe(true);
    expect(loot.uniqueItem).not.toBeNull();
    expect(loot.uniqueItem?.itemId).toBe('twisted_bow');
    expect(loot.uniqueItem?.rarity).toBe('MEGA_RARE');

    // Standard rewards are scaled by 30,000 points (pointScale = 30)
    expect(loot.standardRewards.length).toBe(2);
    expect(loot.standardRewards[0].itemId).toBe('blood_rune');
    expect(loot.standardRewards[0].quantity).toBe(4500); // 30 * 150
    expect(loot.standardRewards[1].itemId).toBe('grimy_torstol');
    expect(loot.standardRewards[1].quantity).toBe(180); // 30 * 6
  });
});
