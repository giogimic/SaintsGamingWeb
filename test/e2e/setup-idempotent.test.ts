import { describe, it, expect, beforeAll, vi } from 'vitest';
import { prisma } from '../../src/web/lib/prisma';
import { POST } from '../../app/api/setup/initialize-game/route';
import { NextRequest } from 'next/server';

// Mock auth
vi.mock('@/auth', () => ({
  auth: async () => ({ user: { id: 'test-admin', role: 'ADMIN', permissionLevel: 100 } })
}));

describe('Setup Wizard Idempotency', () => {
  beforeAll(async () => {
    await prisma.worldMap.deleteMany();
    await prisma.worldMapVersion.deleteMany();
    await prisma.mapSyncEntry.deleteMany();
  });

  it('runs setup and creates first playable world', async () => {
    const rev = await prisma.worldBootstrapRevision.create({
      data: {
        mapId: 'STARTING_MEADOW',
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
      startingMap: { id: 'STARTING_MEADOW', name: 'Meadow', spawnPoint: { x: 10, y: 10, z: 16 } }
    };

    const req = new NextRequest('http://localhost/api/setup/initialize-game', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const map = await prisma.worldMap.findUnique({ where: { id: 'STARTING_MEADOW' } });
    expect(map).toBeDefined();
    expect(map?.publishedVersion).toBe(1);

    const version = await prisma.worldMapVersion.findUnique({
      where: { mapId_version: { mapId: 'STARTING_MEADOW', version: 1 } }
    });
    expect(version).toBeDefined();
    expect(JSON.parse(version!.data)).toHaveProperty('publishedVersion', 1);

    const syncs = await prisma.mapSyncEntry.findMany({ where: { mapId: 'STARTING_MEADOW' } });
    expect(syncs.length).toBeGreaterThan(0);
    expect(syncs[0].version).toBe(1);
    
    // Test idempotency
    const req2 = new NextRequest('http://localhost/api/setup/initialize-game', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(200);

    const mapAfter = await prisma.worldMap.findUnique({ where: { id: 'STARTING_MEADOW' } });
    expect(mapAfter?.version).toBe(1); // Should not have incremented
    expect(mapAfter?.publishedVersion).toBe(1);
  });
});
