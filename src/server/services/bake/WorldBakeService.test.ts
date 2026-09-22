import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/web/lib/prisma', () => ({
  prisma: {
    worldBootstrapRevision: {
      update: vi.fn(),
    },
  },
}));

import { prisma } from '@/web/lib/prisma';
import { WorldBakeService } from './WorldBakeService';

describe('WorldBakeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists a failed bootstrap revision when a worker reports an error', async () => {
    const service = new WorldBakeService();
    const internal = service as any;
    const job = {
      jobId: 'bootstrap_revision',
      revisionId: 'revision_1',
      status: 'RUNNING',
      manifest: { mapId: 'genesis' },
    };

    internal.activeJobs.set(job.jobId, job);
    internal.progressMap.set(job.jobId, {
      jobId: job.jobId,
      totalRegions: 2,
      completedRegions: 0,
      progressPercent: 0,
      activeWorkers: 1,
    });
    internal.pendingTasks.push({ taskId: `${job.jobId}__1_0` });

    await internal.handleWorkerResult({
      taskId: `${job.jobId}__0_0`,
      regionX: 0,
      regionZ: 0,
      status: 'ERROR',
      error: 'worker crashed',
      chunksGenerated: 0,
    });

    expect(job.status).toBe('FAILED');
    expect(internal.progressMap.get(job.jobId).error).toBe('worker crashed');
    expect(internal.pendingTasks).toHaveLength(0);
    expect(prisma.worldBootstrapRevision.update).toHaveBeenCalledWith({
      where: { id: 'revision_1' },
      data: { status: 'FAILED' },
    });
  });
});