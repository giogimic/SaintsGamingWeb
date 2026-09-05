import { describe, it, expect } from 'vitest';
import { evaluateMonsterState, MonsterAIContext } from './monsterStateMachine';

describe('Real-Time Monster State Machine (Bible 10)', () => {
  const baseContext: MonsterAIContext = {
    currentPos: { x: 10, y: 10 },
    spawnOrigin: { x: 10, y: 10 },
    currentHp: 100,
    maxHp: 100,
    attackRange: 1.5,
    leashRadius: 15,
    fleeHpRatio: 0.2, // 20%
  };

  it('transitions to ATTACK when target is within striking distance', () => {
    const targetPos = { x: 11, y: 10 }; // Distance = 1.0 (within 1.5)
    const res = evaluateMonsterState('CHASE', baseContext, targetPos);

    expect(res.nextState).toBe('ATTACK');
    expect(res.reason).toContain('Within striking range');
  });

  it('transitions to CHASE when target is beyond attack range but within leash', () => {
    const targetPos = { x: 16, y: 10 }; // Distance = 6.0
    const res = evaluateMonsterState('IDLE', baseContext, targetPos);

    expect(res.nextState).toBe('CHASE');
    expect(res.targetPos).toEqual(targetPos);
  });

  it('triggers RETURN_LEASH and threat reset when pulled past leash radius', () => {
    const farContext: MonsterAIContext = {
      ...baseContext,
      currentPos: { x: 30, y: 10 }, // 20 tiles from spawn origin (10, 10)
    };

    const targetPos = { x: 31, y: 10 };
    const res = evaluateMonsterState('CHASE', farContext, targetPos);

    expect(res.nextState).toBe('RETURN_LEASH');
    expect(res.shouldResetThreat).toBe(true);
    expect(res.targetPos).toEqual(farContext.spawnOrigin);
  });

  it('triggers FLEE when monster HP falls below flee ratio', () => {
    const lowHpContext: MonsterAIContext = {
      ...baseContext,
      currentHp: 10, // 10% (below 20%)
    };

    const targetPos = { x: 11, y: 10 };
    const res = evaluateMonsterState('ATTACK', lowHpContext, targetPos);

    expect(res.nextState).toBe('FLEE');
    expect(res.reason).toContain('Health critical');
  });

  it('transitions to DEAD when HP drops to 0', () => {
    const deadContext: MonsterAIContext = {
      ...baseContext,
      currentHp: 0,
    };

    const res = evaluateMonsterState('ATTACK', deadContext, null);
    expect(res.nextState).toBe('DEAD');
    expect(res.shouldResetThreat).toBe(true);
  });
});
