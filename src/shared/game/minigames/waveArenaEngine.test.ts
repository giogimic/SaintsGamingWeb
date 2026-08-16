import { describe, it, expect } from 'vitest';
import {
  createArenaSession,
  spawnWave,
  damageArenaMonster,
} from './waveArenaEngine';

describe('Wave-Based Monster Arena & Fight Cave Engine (Bible 24)', () => {
  it('initializes arena session and spawns monster perimeter waves', () => {
    const session = createArenaSession('player_123', 3);
    expect(session.currentWave).toBe(1);
    expect(session.totalWaves).toBe(3);

    const monsters = spawnWave(session, [{ monsterId: 'monster_tz_bat', count: 2 }]);
    expect(monsters.length).toBe(2);
    expect(session.activeMonsters.length).toBe(2);
    expect(monsters[0].currentHp).toBe(20);
    expect(monsters[0].x).toBeDefined();
    expect(monsters[0].y).toBeDefined();
  });

  it('damages monsters and advances waves upon wave clear', () => {
    const session = createArenaSession('player_123', 2);
    spawnWave(session, [{ monsterId: 'monster_tz_bat', count: 1 }]);

    const uid = session.activeMonsters[0].uid;

    // Partial damage (10 HP remaining)
    const hit1 = damageArenaMonster(session, uid, 10);
    expect(hit1.monsterKilled).toBe(false);
    expect(hit1.waveCompleted).toBe(false);

    // Fatal damage (killed) -> clears wave 1, advances to wave 2
    const hit2 = damageArenaMonster(session, uid, 10);
    expect(hit2.monsterKilled).toBe(true);
    expect(hit2.waveCompleted).toBe(true);
    expect(hit2.arenaCompleted).toBe(false);
    expect(hit2.tokensAwarded).toBe(100);
    expect(session.currentWave).toBe(2);
  });

  it('awards Fire Cape and completes session upon final boss defeat', () => {
    const session = createArenaSession('player_123', 1); // 1-wave session
    spawnWave(session, [{ monsterId: 'monster_tz_boss_jad', count: 1 }]);

    const jadUid = session.activeMonsters[0].uid;
    const finalHit = damageArenaMonster(session, jadUid, 500);

    expect(finalHit.monsterKilled).toBe(true);
    expect(finalHit.waveCompleted).toBe(true);
    expect(finalHit.arenaCompleted).toBe(true);
    expect(finalHit.rewardItem).toBe('item_fire_cape');
    expect(session.isCompleted).toBe(true);
  });
});
