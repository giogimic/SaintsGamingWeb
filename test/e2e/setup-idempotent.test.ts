import { describe, it, expect, beforeAll, vi } from 'vitest';
import { prisma } from '../../src/web/lib/prisma';
import { POST } from '../../app/api/setup/initialize-game/route';
import { NextRequest } from 'next/server';
import zlib from 'zlib';

// Mock auth
vi.mock('@/auth', () => ({
  auth: async () => ({ user: { id: 'test-admin', role: 'ADMIN', permissionLevel: 100 } })
}));

vi.mock('@/server/goMmoNotify', () => ({
  notifyGoProjectSynced: vi.fn().mockResolvedValue({ ok: true }),
  notifyGoMapSynced: vi.fn().mockResolvedValue({ ok: true, skipped: true }),
}));

describe('Setup Wizard Idempotency', () => {
  beforeAll(async () => {
    await prisma.worldMap.deleteMany();
    await prisma.mapSyncEntry.deleteMany();
    await prisma.worldRegionArtifact.deleteMany();
  });

  it('runs setup and creates first playable world', async () => {
    await prisma.worldRegionArtifact.create({
      data: {
        checksum: 'fake-checksum',
        voxelData: zlib.deflateSync(Buffer.from('{}')),
      }
    });

    const rev = await prisma.worldBootstrapRevision.create({
      data: {
        mapId: 'genesis',
        seed: 'test-seed',
        generatorVersion: 'v1',
        configHash: 'test-hash',
        dimensions: '1x1',
        status: 'COMPLETED',
        regions: {
          create: [{ regionX: 0, regionZ: 0, artifactChecksum: 'fake-checksum' }]
        }
      }
    });

    const payload = {
      bootstrapRevisionId: rev.id,
      game: { name: 'Test Game' },
      characters: [{ slug: 'hero1', name: 'Hero', classId: 'WARRIOR' }],
      environment: {},
      startingMap: { id: 'genesis', name: 'Meadow', spawnPoint: { x: 10, y: 10, z: 16 } }
    };

    const req = new NextRequest('http://localhost/api/setup/initialize-game', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const map = await prisma.worldMap.findUnique({ where: { id: 'genesis' } });
    expect(map).toBeDefined();
    expect(map?.version).toBe(1);

    const syncs = await prisma.mapSyncEntry.findMany({ where: { mapId: 'genesis' } });
    expect(syncs.length).toBeGreaterThan(0);
    expect(syncs[0].version).toBe(1);
    
    // Test idempotency
    const req2 = new NextRequest('http://localhost/api/setup/initialize-game', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(200);

    const mapAfter = await prisma.worldMap.findUnique({ where: { id: 'genesis' } });
    expect(mapAfter?.version).toBe(2);
  });
});
