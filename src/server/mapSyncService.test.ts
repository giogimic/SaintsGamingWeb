import { afterEach, describe, expect, it, vi } from 'vitest';

const { notifyGoProjectSynced } = vi.hoisted(() => ({
  notifyGoProjectSynced: vi.fn(),
}));

vi.mock('./goMmoNotify', () => ({
  notifyGoMapSynced: vi.fn(),
  notifyGoProjectSynced,
}));

import { MapSyncService } from './mapSyncService';

const originalSyncMode = process.env.SYNC_MODE;

afterEach(() => {
  if (originalSyncMode === undefined) {
    delete process.env.SYNC_MODE;
  } else {
    process.env.SYNC_MODE = originalSyncMode;
  }
  vi.clearAllMocks();
});

describe('MapSyncService project releases', () => {
  it('awaits the Go runtime acknowledgement before reporting success', async () => {
    delete process.env.SYNC_MODE;
    notifyGoProjectSynced.mockResolvedValue({ ok: true });

    const result = await MapSyncService.enqueueProjectRelease({
      projectId: 'project_1',
      version: 'v1.0.2',
      eagerPush: true,
    });

    expect(result).toEqual({ ok: true });
    expect(notifyGoProjectSynced).toHaveBeenCalledWith({
      projectId: 'project_1',
      version: 'v1.0.2',
    });
  });

  it('rejects pull-only project sync because no durable project queue exists', async () => {
    process.env.SYNC_MODE = 'pull';

    const result = await MapSyncService.enqueueProjectRelease({
      projectId: 'project_1',
      version: 'v1.0.2',
    });

    expect(result).toMatchObject({
      ok: false,
      skipped: true,
      error: 'SYNC_MODE=pull does not support project release deployment',
    });
    expect(notifyGoProjectSynced).not.toHaveBeenCalled();
  });
});