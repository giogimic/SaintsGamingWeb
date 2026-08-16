import { describe, it, expect, beforeEach } from 'vitest';
import {
  ThreatTable,
  isPlayerInAggroRadius,
  isMonsterLeashed,
  calculateDistance,
} from './aggroEngine';

describe('Enemy Aggro Radius & Threat Table Engine (Bible 09)', () => {
  let threatTable: ThreatTable;

  beforeEach(() => {
    threatTable = new ThreatTable();
  });

  it('tracks threat and returns the highest threat player target', () => {
    threatTable.addThreat('player_tank', 150);
    threatTable.addThreat('player_dps', 250);
    threatTable.addThreat('player_healer', 80);

    const highest = threatTable.getHighestThreatTarget();
    expect(highest?.playerId).toBe('player_dps');
    expect(highest?.threat).toBe(250);

    // Tank generates more threat
    threatTable.addThreat('player_tank', 200); // Total 350
    const newHighest = threatTable.getHighestThreatTarget();
    expect(newHighest?.playerId).toBe('player_tank');
    expect(newHighest?.threat).toBe(350);
  });

  it('clears threat on leash reset or target removal', () => {
    threatTable.addThreat('player_1', 100);
    threatTable.addThreat('player_2', 200);

    threatTable.removePlayer('player_2');
    expect(threatTable.getHighestThreatTarget()?.playerId).toBe('player_1');

    threatTable.clear();
    expect(threatTable.getHighestThreatTarget()).toBeNull();
  });

  it('evaluates player proximity within aggro vision radius', () => {
    const monsterPos = { x: 10, y: 10 };

    // Player nearby (distance = 3, radius = 5)
    expect(isPlayerInAggroRadius(monsterPos, { x: 13, y: 10 }, 5)).toBe(true);

    // Player far away (distance = 10, radius = 5)
    expect(isPlayerInAggroRadius(monsterPos, { x: 20, y: 10 }, 5)).toBe(false);
  });

  it('detects when monster exceeds leash boundary from spawn origin', () => {
    const spawnOrigin = { x: 5, y: 5 };

    // Within leash zone (distance = 8, leash = 15)
    expect(isMonsterLeashed({ x: 13, y: 5 }, spawnOrigin, 15)).toBe(false);

    // Exceeded leash zone (distance = 20, leash = 15)
    expect(isMonsterLeashed({ x: 25, y: 5 }, spawnOrigin, 15)).toBe(true);
  });
});
