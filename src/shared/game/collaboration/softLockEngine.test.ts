import { describe, it, expect, beforeEach } from 'vitest';
import { SoftLockManager, softLockManager } from './softLockEngine';
import { CanonicalResourceRef } from '../studioGlossary';

describe('Studio SoftLock & Collaborative Presence Engine (Bible 32 §1)', () => {
  let manager: SoftLockManager;

  beforeEach(() => {
    manager = new SoftLockManager();
  });

  it('allows a user to acquire and refresh a soft lock on a resource', () => {
    const res: CanonicalResourceRef = { type: 'map', id: 'saints_citadel' };
    const firstAcquire = manager.acquireLock(res, 'user_1', 'Developer Dan');

    expect(firstAcquire.success).toBe(true);
    expect(firstAcquire.currentLock?.userId).toBe('user_1');

    // Refreshing lock succeeds
    const refresh = manager.acquireLock(res, 'user_1', 'Developer Dan');
    expect(refresh.success).toBe(true);
  });

  it('blocks another user from acquiring an active lock', () => {
    const res: CanonicalResourceRef = { type: 'loot', id: 'boss_pool' };
    manager.acquireLock(res, 'user_1', 'Developer Dan');

    const blockedAcquire = manager.acquireLock(res, 'user_2', 'Designer Dave');
    expect(blockedAcquire.success).toBe(false);
    expect(blockedAcquire.currentLock?.userId).toBe('user_1');
    expect(blockedAcquire.currentLock?.displayName).toBe('Developer Dan');
  });

  it('allows administrator takeover of locked resources', () => {
    const res: CanonicalResourceRef = { type: 'quest', id: 'quest_goblin' };
    manager.acquireLock(res, 'user_1', 'Developer Dan');

    const takeover = manager.forceTakeover(res, 'admin_super', 'Lead Admin');
    expect(takeover.userId).toBe('admin_super');
    expect(manager.getLock(res)?.userId).toBe('admin_super');
  });

  it('tracks active project team presence', () => {
    manager.updatePresence({
      userId: 'user_1',
      displayName: 'Dev Dan',
      gameId: 'custom_world',
      activeDockId: 'quest',
      lastHeartbeat: new Date().toISOString(),
    });

    manager.updatePresence({
      userId: 'user_2',
      displayName: 'Dev Dave',
      gameId: 'custom_world',
      activeDockId: 'loot',
      lastHeartbeat: new Date().toISOString(),
    });

    const members = manager.getProjectPresence('custom_world');
    expect(members.length).toBe(2);
    expect(members.map((m) => m.displayName)).toContain('Dev Dan');
    expect(members.map((m) => m.displayName)).toContain('Dev Dave');
  });
});
