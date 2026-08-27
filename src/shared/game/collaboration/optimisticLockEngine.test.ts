import { describe, expect, it } from 'vitest';
import {
  computeContentHash,
  createVersionedDocument,
  validateCommit,
  applyCommit,
  resolveMergeConflict,
} from './optimisticLockEngine';

describe('optimisticLockEngine', () => {
  it('computes identical hashes for objects with different key insertion orders', () => {
    const objA = { name: 'Dragon Cave', level: 50, isDungeon: true };
    const objB = { level: 50, isDungeon: true, name: 'Dragon Cave' };

    const hashA = computeContentHash(objA);
    const hashB = computeContentHash(objB);

    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[0-9a-f]{8}$/);
  });

  it('detects changes and produces distinct hashes', () => {
    const objA = { name: 'Dragon Cave', level: 50 };
    const objB = { name: 'Dragon Cave', level: 51 };

    expect(computeContentHash(objA)).not.toBe(computeContentHash(objB));
  });

  it('validates successful commit when base hash matches current hash', () => {
    const initialDoc = createVersionedDocument('map_01', { name: 'Village', width: 24 }, 'author_alice');
    const incomingData = { name: 'Village Updated', width: 24 };

    const result = validateCommit(initialDoc, initialDoc.versionHash, incomingData);
    expect(result.ok).toBe(true);

    const updatedDoc = applyCommit(initialDoc, incomingData, 'author_alice');
    expect(updatedDoc.revisionNumber).toBe(2);
    expect(updatedDoc.lastModifiedBy).toBe('author_alice');
    expect(updatedDoc.data.name).toBe('Village Updated');
  });

  it('intercepts concurrent edits and produces conflict payload', () => {
    const initialDoc = createVersionedDocument('map_01', { name: 'Village', width: 24 }, 'author_alice');

    // Author A commits change first
    const remoteDoc = applyCommit(initialDoc, { name: 'Village North', width: 24 }, 'author_alice');

    // Author B attempts to commit against original base hash
    const incomingData = { name: 'Village South', width: 32 };
    const result = validateCommit(remoteDoc, initialDoc.versionHash, incomingData);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.conflict.documentId).toBe('map_01');
      expect(result.conflict.baseHash).toBe(initialDoc.versionHash);
      expect(result.conflict.remoteHash).toBe(remoteDoc.versionHash);
      expect(result.conflict.remoteDocument.lastModifiedBy).toBe('author_alice');
      expect(result.conflict.localData.name).toBe('Village South');
    }
  });

  it('smart 3-way merge cleanly merges non-overlapping property edits', () => {
    const base = {
      name: 'Forest',
      weather: 'Clear',
      musicTrack: 'peaceful',
      recommendedLevel: 5,
    };

    // Author A changed weather
    const remote = {
      ...base,
      weather: 'Rain',
    };

    // Author B changed recommendedLevel
    const local = {
      ...base,
      recommendedLevel: 10,
    };

    const merged = resolveMergeConflict(base, local, remote, 'smart_merge');

    expect(merged.name).toBe('Forest');
    expect(merged.weather).toBe('Rain'); // from remote
    expect(merged.recommendedLevel).toBe(10); // from local
    expect(merged.musicTrack).toBe('peaceful');
  });

  it('take_local and take_remote strategies work as intended', () => {
    const base = { hp: 100, mp: 50 };
    const local = { hp: 120, mp: 50 };
    const remote = { hp: 100, mp: 80 };

    const takeLocal = resolveMergeConflict(base, local, remote, 'take_local');
    expect(takeLocal).toEqual(local);

    const takeRemote = resolveMergeConflict(base, local, remote, 'take_remote');
    expect(takeRemote).toEqual(remote);
  });
});
