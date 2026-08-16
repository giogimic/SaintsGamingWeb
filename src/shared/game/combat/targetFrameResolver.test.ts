import { describe, it, expect } from 'vitest';
import { evaluateTargetFrame, TargetEntityData } from './targetFrameResolver';

describe('Target Frame & Cast Range Resolver (Bible 09 & Bible 10)', () => {
  const playerPos = { x: 10, y: 10 };

  it('evaluates player target as FRIENDLY with party invite, whisper, and duel actions', () => {
    const targetPlayer: TargetEntityData = {
      entityId: 'player_alex',
      name: 'Alex',
      type: 'player',
      hp: 80,
      maxHp: 100,
      position: { x: 11, y: 10 }, // Distance = 1.0
    };

    const frame = evaluateTargetFrame(playerPos, targetPlayer, 2.0);

    expect(frame.relationship).toBe('FRIENDLY');
    expect(frame.distance).toBe(1.0);
    expect(frame.isInRange).toBe(true);
    expect(frame.hpPercent).toBe(80);
    expect(frame.availableActions).toContain('PARTY_INVITE');
    expect(frame.availableActions).toContain('DUEL');
  });

  it('evaluates hostile mob target as HOSTILE and validates out-of-range indicator', () => {
    const hostileMob: TargetEntityData = {
      entityId: 'mob_goblin',
      name: 'Forest Goblin',
      type: 'mob',
      hp: 50,
      maxHp: 50,
      position: { x: 16, y: 10 }, // Distance = 6.0
    };

    const frame = evaluateTargetFrame(playerPos, hostileMob, 3.0); // Range = 3.0

    expect(frame.relationship).toBe('HOSTILE');
    expect(frame.distance).toBe(6.0);
    expect(frame.isInRange).toBe(false);
    expect(frame.availableActions).toContain('ATTACK');
  });

  it('evaluates wild creature with attack and capture action flags', () => {
    const wildCreature: TargetEntityData = {
      entityId: 'creature_rockitten',
      name: 'Rockitten',
      type: 'creature',
      hp: 15,
      maxHp: 30,
      isWild: true,
      position: { x: 12, y: 10 }, // Distance = 2.0
    };

    const frame = evaluateTargetFrame(playerPos, wildCreature, 2.5);

    expect(frame.hpPercent).toBe(50);
    expect(frame.isInRange).toBe(true);
    expect(frame.availableActions).toContain('ATTACK');
    expect(frame.availableActions).toContain('CAPTURE');
  });

  it('evaluates NPC with TALK action', () => {
    const npc: TargetEntityData = {
      entityId: 'npc_guide',
      name: 'Elder Oakhaven',
      type: 'npc',
      hp: 100,
      maxHp: 100,
      position: { x: 10, y: 11 },
    };

    const frame = evaluateTargetFrame(playerPos, npc);
    expect(frame.relationship).toBe('NEUTRAL');
    expect(frame.availableActions).toContain('TALK');
  });
});
