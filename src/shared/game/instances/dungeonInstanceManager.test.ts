import { describe, expect, it, beforeEach } from 'vitest';
import { DungeonInstanceManager } from './dungeonInstanceManager';

describe('DungeonInstanceManager', () => {
  let manager: DungeonInstanceManager;

  beforeEach(() => {
    manager = new DungeonInstanceManager();
  });

  it('creates an isolated dungeon instance with party members and objectives', () => {
    const instance = manager.createInstance({
      dungeonSlug: 'shadow_crypt',
      baseMapId: 'DUNGEON_CRYPT_01',
      partyId: 'party_alpha',
      leaderId: 'user_leader',
      partyMembers: ['user_leader', 'user_member2'],
      durationMinutes: 45,
      objectives: [
        { key: 'kill_skeletons', label: 'Defeat Skeleton Warriors', required: 5 },
        { key: 'defeat_boss', label: 'Slay Crypt Lord', required: 1 },
      ],
    });

    expect(instance.instanceId).toContain('dungeon_shadow_crypt_party_alpha_');
    expect(instance.partyMembers).toHaveLength(2);
    expect(instance.isCompleted).toBe(false);
    expect(instance.objectives.kill_skeletons.required).toBe(5);
    expect(instance.objectives.kill_skeletons.current).toBe(0);
  });

  it('tracks objective progress and automatically completes dungeon when all objectives are met', () => {
    const instance = manager.createInstance({
      dungeonSlug: 'goblin_den',
      baseMapId: 'MAP_DEN',
      partyId: 'party_bravo',
      leaderId: 'hero_1',
      partyMembers: ['hero_1'],
      objectives: [
        { key: 'find_key', required: 1 },
      ],
    });

    expect(instance.isCompleted).toBe(false);

    const updated = manager.updateObjective(instance.instanceId, 'find_key', 1);
    expect(updated).toBe(true);

    const fetched = manager.getInstance(instance.instanceId);
    expect(fetched?.isCompleted).toBe(true);
    expect(fetched?.clearedAt).toBeDefined();
  });

  it('validates party membership correctly', () => {
    const instance = manager.createInstance({
      dungeonSlug: 'infernal_abyss',
      baseMapId: 'MAP_ABYSS',
      partyId: 'party_charlie',
      leaderId: 'leader_joe',
      partyMembers: ['leader_joe', 'member_alice'],
    });

    expect(manager.isPartyMember(instance.instanceId, 'leader_joe')).toBe(true);
    expect(manager.isPartyMember(instance.instanceId, 'member_alice')).toBe(true);
    expect(manager.isPartyMember(instance.instanceId, 'intruder_bob')).toBe(false);
  });

  it('prunes expired dungeon instances', () => {
    const now = Date.now();
    const instance = manager.createInstance({
      dungeonSlug: 'quick_cave',
      baseMapId: 'MAP_CAVE',
      partyId: 'party_delta',
      leaderId: 'hero_2',
      partyMembers: ['hero_2'],
      durationMinutes: 10,
    });

    // Valid immediately
    expect(manager.getInstance(instance.instanceId)).not.toBeNull();

    // 15 minutes in future -> expired
    const futureTime = now + 15 * 60 * 1000;
    const prunedCount = manager.pruneExpired(futureTime);
    expect(prunedCount).toBe(1);
    expect(manager.getInstance(instance.instanceId)).toBeNull();
  });
});
