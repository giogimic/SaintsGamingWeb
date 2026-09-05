import { describe, it, expect } from 'vitest';
import {
  calculateRaidMonsterScaling,
  generateRaidDungeon,
  clearCurrentRoom,
  type RaidPartyMember,
} from './raidRoomGenerator';

describe('Raid Chamber Room Generator & Scaling Engine', () => {
  it('scales monster stats accurately for solo vs 5-man teams', () => {
    // Solo standard scaling (baseHp: 300, baseDef: 200, baseMaxHit: 40)
    const solo = calculateRaidMonsterScaling(300, 200, 40, 1, 110, false);
    expect(solo.hp).toBe(300); // 1 + 0*0.75 = 1.0x
    expect(solo.defence).toBe(200);
    expect(solo.maxHit).toBe(42); // 1 + (110-100)*0.005 = 1.05x -> 42

    // 5-man team scaling
    const fiveMan = calculateRaidMonsterScaling(300, 200, 40, 5, 110, false);
    // 5 players -> 1 + 4*0.75 = 4.0x HP -> 1200 HP
    expect(fiveMan.hp).toBe(1200);
    // 5 players -> 1 + 4*0.05 = 1.20x Def -> 240 Def
    expect(fiveMan.defence).toBe(240);

    // 5-man Challenge Mode (CM: 1.5x HP, 1.2x Def)
    const fiveManCm = calculateRaidMonsterScaling(300, 200, 40, 5, 110, true);
    expect(fiveManCm.hp).toBe(1800); // 1200 * 1.5 = 1800
    expect(fiveManCm.defence).toBe(288); // 240 * 1.2 = 288
  });

  it('generates a full 8-room dungeon sequence culminating in The Great Wyrm', () => {
    const members: RaidPartyMember[] = [
      { id: 'u1', name: 'GioGimic', combatLevel: 126, points: 0, deaths: 0 },
      { id: 'u2', name: 'Zezima', combatLevel: 126, points: 0, deaths: 0 },
      { id: 'u3', name: 'B0aty', combatLevel: 120, points: 0, deaths: 0 },
    ];

    const raid = generateRaidDungeon('raid_001', members, 4242, false);
    expect(raid.rooms.length).toBe(8);
    expect(raid.currentRoomIndex).toBe(0);

    // Final room is always Wyrm
    const finalRoom = raid.rooms[7];
    expect(finalRoom.type).toBe('BOSS');
    expect(finalRoom.encounterId).toBe('great_olm');
    expect(finalRoom.floorIndex).toBe(3);
  });

  it('advances room clearance and shares contribution points across party members', () => {
    const members: RaidPartyMember[] = [
      { id: 'u1', name: 'GioGimic', combatLevel: 126, points: 0, deaths: 0 },
      { id: 'u2', name: 'Woox', combatLevel: 126, points: 0, deaths: 0 },
    ];

    const raid = generateRaidDungeon('raid_002', members, 9999, false);
    expect(raid.currentRoomIndex).toBe(0);

    // Clear Room 1 (Floor 1 Combat)
    const res1 = clearCurrentRoom(raid, 120);
    expect(res1.success).toBe(true);
    expect(res1.isRaidFinished).toBe(false);
    expect(raid.currentRoomIndex).toBe(1);
    expect(raid.rooms[0].isCleared).toBe(true);
    expect(raid.rooms[0].clearTimeSeconds).toBe(120);

    // Both party members earned their equal point share
    expect(raid.members[0].points).toBe(res1.pointsAwardedPerMember);
    expect(raid.members[1].points).toBe(res1.pointsAwardedPerMember);
    expect(res1.pointsAwardedPerMember).toBeGreaterThan(1000);
  });
});
