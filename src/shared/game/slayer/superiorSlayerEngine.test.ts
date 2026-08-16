import { describe, it, expect } from 'vitest';
import {
  SUPERIOR_MONSTER_REGISTRY,
  SUPERIOR_SPAWN_CHANCE,
  rollSuperiorSpawn,
  rollSuperiorUniqueLoot,
  calculateImbuedHeartBoost,
} from './superiorSlayerEngine';

describe('Superior Slayer Monster Spawns & Relic Drops Engine', () => {
  it('prevents superior spawns if Bigger and Badder is locked or off-task', () => {
    // Locked unlock
    expect(rollSuperiorSpawn('gargoyle', false, true, 0.001).shouldSpawn).toBe(false);
    // Off-task
    expect(rollSuperiorSpawn('gargoyle', true, false, 0.001).shouldSpawn).toBe(false);
    // Invalid monster
    expect(rollSuperiorSpawn('cow', true, true, 0.001).shouldSpawn).toBe(false);
  });

  it('spawns superior variant when unlocked, on-task, and roll < 1/200', () => {
    const res = rollSuperiorSpawn('gargoyle', true, true, 0.002); // 0.002 < 1/200 (0.005)
    expect(res.shouldSpawn).toBe(true);
    expect(res.superior).toBeDefined();
    expect(res.superior?.superiorId).toBe('marble_gargoyle');
    expect(res.superior?.name).toBe('Marble Gargoyle');
    expect(res.superior?.xpMultiplier).toBe(10);
  });

  it('rolls superior unique relic loot drops accurately', () => {
    // Roll Imbued Heart on ultra-low roll
    const heartDrop = rollSuperiorUniqueLoot('marble_gargoyle', 75, 0.001);
    expect(heartDrop).not.toBeNull();
    expect(heartDrop?.itemId).toBe('imbued_heart');
    expect(heartDrop?.rarity).toBe('MEGA_RARE');

    // Roll Dust Battlestaff on rare threshold
    const staffDrop = rollSuperiorUniqueLoot('marble_gargoyle', 75, 0.025);
    expect(staffDrop).not.toBeNull();
    expect(staffDrop?.itemId).toBe('dust_battlestaff');
  });

  it('calculates Imbued Heart magic level boost and cooldown', () => {
    // Level 99 Magic -> 1 + floor(99 * 0.10) = 1 + 9 = +10 boost -> Level 109
    const boost99 = calculateImbuedHeartBoost(99);
    expect(boost99.boostAmount).toBe(10);
    expect(boost99.boostedLevel).toBe(109);
    expect(boost99.cooldownSeconds).toBe(420);

    // Level 70 Magic -> 1 + floor(7) = +8 boost -> Level 78
    const boost70 = calculateImbuedHeartBoost(70);
    expect(boost70.boostAmount).toBe(8);
    expect(boost70.boostedLevel).toBe(78);
  });
});
