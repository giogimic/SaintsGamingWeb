import { describe, it, expect } from 'vitest';
import {
  createContentRevision,
  publishRevision,
  createRollbackRevision,
} from './revisionStore';

describe('Content Revision & Publishing Engine (Bible 26 §4 & §5)', () => {
  it('creates draft revisions with checksums and metadata', () => {
    const rev = createContentRevision({
      resourceType: 'map',
      resourceId: 'saints_village',
      version: 1,
      payload: { name: 'Saints Village', width: 32, height: 32 },
      authorId: 'admin_1',
      message: 'Initial map creation',
    });

    expect(rev.id).toBeDefined();
    expect(rev.resourceType).toBe('map');
    expect(rev.status).toBe('draft');
    expect(rev.checksum.length).toBeGreaterThan(0);
    expect(rev.version).toBe(1);
  });

  it('promotes draft revisions to live status with incremented live versions', () => {
    const draft = createContentRevision({
      resourceType: 'quest',
      resourceId: 'quest_goblin_invasion',
      version: 3,
      payload: { title: 'Goblin Invasion', stages: 4 },
      authorId: 'admin_2',
    });

    const result = publishRevision(draft, 5);
    expect(result.success).toBe(true);
    expect(result.publishedRevision?.status).toBe('live');
    expect(result.publishedRevision?.version).toBe(6);
    expect(result.previousLiveVersion).toBe(5);
  });

  it('aborts publishing when validation fails', () => {
    const draft = createContentRevision({
      resourceType: 'ability',
      resourceId: 'broken_strike',
      version: 1,
      payload: { power: -10 },
      authorId: 'admin_1',
    });

    const result = publishRevision(draft, 0, (payload) => ({
      valid: false,
      errors: ['Ability power cannot be negative.'],
    }));

    expect(result.success).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.publishedRevision).toBeUndefined();
  });

  it('creates rollback revisions as forward-incrementing live versions without mutating history', () => {
    const historicalRev = createContentRevision({
      resourceType: 'loot',
      resourceId: 'tier1_mob_pool',
      version: 2,
      status: 'archived',
      payload: { items: ['bronze_dagger'] },
      authorId: 'admin_1',
    });

    const rollback = createRollbackRevision(historicalRev, 10, 'admin_super');
    expect(rollback.version).toBe(11);
    expect(rollback.parentVersion).toBe(10);
    expect(rollback.status).toBe('live');
    expect(rollback.message).toContain('Rollback to historical version 2');
  });
});
