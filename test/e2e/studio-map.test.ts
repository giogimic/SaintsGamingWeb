// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Socket } from 'socket.io-client';
import { prisma, ensureUser, connectAs, once } from './e2e-helpers';
import { generateDefaultWorldDoc, VoxelWorld } from "../../src/shared/game/voxel/VoxelWorldDoc";
import { generateGridFromVoxelDoc } from "../../src/shared/game/voxel/voxelToGrid";
import { validateVoxelDocSave } from "../../src/shared/game/mapSaveValidation";
import { CHUNK_SIZE_X, CHUNK_SIZE_Z } from "../../src/shared/game/voxel/VoxelChunk";

describe('Studio Map Editor E2E', () => {
  let sa: Socket;

  beforeAll(async () => {
    const a = await ensureUser('smoke_studio');
    sa = await connectAs(a.id);
  });

  afterAll(async () => {
    sa.disconnect();
    await prisma.$disconnect();
  });

  it('should successfully save map edits via socket', async () => {
    const mapId = 'SMOKE_STUDIO_TEST';
    
    // 1. Reset map
    await prisma.worldMap.upsert({
      where: { id: mapId },
      create: {
        id: mapId,
        gameId: 'saints',
        name: 'Smoke Studio Map',
        gridData: JSON.stringify([[1,1],[1,1]]),
        gatesData: '{}',
        npcsData: '[]',
        encountersData: '[]',
        version: 1,
      },
      update: {
        gridData: JSON.stringify([[1,1],[1,1]]),
        version: 1,
      }
    });

    const joinedA = once<{ instanceId?: string; mapId?: string }>(sa, 'map_joined');
    sa.emit('join_map', {
      mapId,
      lobby: false,
      name: 'SmokeStudioUser',
      x: 0,
      y: 0,
    });
    await joinedA;

    // 2. Perform edit
    const newGrid = [[1,1],[1,2]];
    const savedEvent = once<{ version?: number; error?: string }>(sa, 'studio_map_saved');
    
    sa.emit('studio_save_map', {
      mapId,
      grid: newGrid,
      gates: {},
      npcs: [],
      encounters: [],
    });

    const result = await savedEvent;
    expect(result.error).toBeUndefined();
    expect(result.version).toBe(2);

    // 3. Verify in DB
    const dbMap = await prisma.worldMap.findUnique({ where: { id: mapId }});
    expect(dbMap).toBeDefined();
    expect(dbMap?.version).toBe(2);
    expect(JSON.parse(dbMap?.gridData as string)).toEqual(newGrid);

    // 4. Cleanup
    await prisma.worldMap.delete({ where: { id: mapId }});
  });

  it('should correctly generate and serialize 32³ VoxelWorldDocs (End-to-End Voxel Test)', async () => {
    const testMapId = "E2E_VOXEL_TEST_MAP";
    const width = 64;
    const height = 64;
    const widthChunks = Math.ceil(width / CHUNK_SIZE_X);
    const depthChunks = Math.ceil(height / CHUNK_SIZE_Z);

    const voxelDoc = generateDefaultWorldDoc(widthChunks, depthChunks, 64, width, height);
    voxelDoc.id = testMapId;
    voxelDoc.name = "E2E Voxel Test Map";

    const validation = validateVoxelDocSave(voxelDoc);
    expect(validation.ok).toBe(true);

    const grid = generateGridFromVoxelDoc(voxelDoc, width, height);
    expect(grid.length).toBe(height);
    expect(grid[0].length).toBe(width);
    expect(grid[32][32]).toBe(0);

    await prisma.worldMap.upsert({
      where: { id: testMapId },
      create: {
        id: testMapId,
        gameId: "saints",
        name: "E2E Voxel Test Map",
        gridData: JSON.stringify(grid),
        gatesData: "{}",
        npcsData: "[]",
        encountersData: "[]",
        tileLayersData: null,
        tilesetsData: null,
        voxelData: JSON.stringify(voxelDoc),
        regionClass: "authored",
        proceduralConfig: JSON.stringify({ biome: "temperate_plains", seed: 42 }),
        version: 1,
      },
      update: {
        gridData: JSON.stringify(grid),
        tileLayersData: null,
        tilesetsData: null,
        voxelData: JSON.stringify(voxelDoc),
        regionClass: "authored",
        proceduralConfig: JSON.stringify({ biome: "temperate_plains", seed: 42 }),
        version: { increment: 1 },
      },
    });

    const saved = await prisma.worldMap.findUnique({
      where: { id: testMapId },
    });
    expect(saved).toBeDefined();
    expect(saved?.voxelData).toBeDefined();

    const parsedDoc = JSON.parse(saved!.voxelData!);
    const world = VoxelWorld.deserializeFromDoc(parsedDoc);
    expect(world.chunks.size).toBeGreaterThan(0);

    await prisma.worldMap.delete({ where: { id: testMapId } });
  });
});
