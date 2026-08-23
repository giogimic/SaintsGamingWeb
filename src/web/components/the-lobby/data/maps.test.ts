import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadMap,
  getClientAtlas,
  invalidateClientAtlas,
  invalidateMapCache,
} from './maps';

describe('Map Loader & Atlas Invalidation Engine', () => {
  beforeEach(() => {
    invalidateClientAtlas();
    invalidateMapCache();
    vi.restoreAllMocks();
  });

  it('caches atlas in memory and invalidates when invalidateClientAtlas() is called', async () => {
    let atlasVersion = 1;
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/world/atlas')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            atlas: {
              atlasData: JSON.stringify({
                nodes: [
                  { id: `node_forest_${atlasVersion}`, mapId: 'FOREST', x: 2, y: 3 }
                ]
              })
            }
          })
        });
      }
      return Promise.resolve({ ok: false });
    });

    global.fetch = fetchMock as any;

    const atlas1 = await getClientAtlas();
    expect(atlas1.nodes[0].id).toBe('node_forest_1');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second call without invalidate should use memory cache
    atlasVersion = 2;
    const atlasCached = await getClientAtlas();
    expect(atlasCached.nodes[0].id).toBe('node_forest_1');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Invalidate client atlas -> forces refetch
    invalidateClientAtlas();
    const atlasRefetched = await getClientAtlas();
    expect(atlasRefetched.nodes[0].id).toBe('node_forest_2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('resolves distinct neighbor connections for duplicated map placements when atlasNodeId is provided', async () => {
    const mockAtlasData = {
      nodes: [
        { id: 'node_forest_a', mapId: 'FOREST', x: 2, y: 3 },
        { id: 'node_town', mapId: 'TOWN', x: 2, y: 2 },
        { id: 'node_cave', mapId: 'CAVE', x: 3, y: 3 },
        { id: 'node_forest_b', mapId: 'FOREST', x: 8, y: 3 },
        { id: 'node_desert', mapId: 'DESERT', x: 8, y: 2 },
        { id: 'node_village', mapId: 'VILLAGE', x: 7, y: 3 },
      ]
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/world/atlas')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            atlas: { atlasData: JSON.stringify(mockAtlasData) }
          })
        });
      }
      if (url.includes('/api/maps/FOREST')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'FOREST',
            name: 'Forest',
            width: 20,
            height: 20,
            grid: Array(20).fill(0).map(() => Array(20).fill(0)),
            gates: {},
            npcs: [],
          })
        });
      }
      // Stub neighbor map fetches
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'NEIGHBOR',
          width: 20,
          height: 20,
          grid: Array(20).fill(0).map(() => Array(20).fill(0)),
          gates: {},
          npcs: [],
        })
      });
    }) as any;

    // Load Forest A
    const mapA = await loadMap('FOREST', 0, 'node_forest_a');
    expect(mapA.atlasNodeId).toBe('node_forest_a');
    expect(mapA.connections?.north).toBe('TOWN');
    expect(mapA.connections?.east).toBe('CAVE');
    expect(mapA.connections?.south).toBeUndefined();
    expect(mapA.connections?.west).toBeUndefined();

    // Invalidate map cache and load Forest B
    invalidateMapCache();
    const mapB = await loadMap('FOREST', 0, 'node_forest_b');
    expect(mapB.atlasNodeId).toBe('node_forest_b');
    expect(mapB.connections?.north).toBe('DESERT');
    expect(mapB.connections?.west).toBe('VILLAGE');
    expect(mapB.connections?.south).toBeUndefined();
    expect(mapB.connections?.east).toBeUndefined();
  });

  it('allows Forest B and Forest D to coexist concurrently in placement cache without overwriting each other', async () => {
    // Exact user test scenario:
    // Town @ A = (5,5)
    // Forest @ B = (5,4)
    // Town @ C = (10,10)
    // Forest @ D = (10,9)
    const atlasScenario = {
      nodes: [
        { id: 'node_town_a', mapId: 'TOWN', x: 5, y: 5 },
        { id: 'node_forest_b', mapId: 'FOREST', x: 5, y: 4 },
        { id: 'node_town_c', mapId: 'TOWN', x: 10, y: 10 },
        { id: 'node_forest_d', mapId: 'FOREST', x: 10, y: 9 },
      ]
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/world/atlas')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            atlas: { atlasData: JSON.stringify(atlasScenario) }
          })
        });
      }
      if (url.includes('/api/maps/FOREST')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'FOREST',
            name: 'Forest',
            width: 20,
            height: 20,
            grid: Array(20).fill(0).map(() => Array(20).fill(0)),
            gates: {},
            npcs: [],
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'TOWN',
          width: 20,
          height: 20,
          grid: Array(20).fill(0).map(() => Array(20).fill(0)),
          gates: {},
          npcs: [],
        })
      });
    }) as any;

    // Load Forest B (South is Town A @ 5,5)
    const mapB = await loadMap('FOREST', 0, 'node_forest_b');
    expect(mapB.atlasNodeId).toBe('node_forest_b');
    expect(mapB.connections?.south).toBe('TOWN');
    expect(mapB.nodeConnections?.south).toBe('node_town_a');

    // Load Forest D (South is Town C @ 10,10) - WITHOUT invalidating cache!
    const mapD = await loadMap('FOREST', 0, 'node_forest_d');
    expect(mapD.atlasNodeId).toBe('node_forest_d');
    expect(mapD.connections?.south).toBe('TOWN');
    expect(mapD.nodeConnections?.south).toBe('node_town_c');

    // Verify both remain cached under their placement keys
    const cachedB = await loadMap('FOREST', 0, 'node_forest_b');
    const cachedD = await loadMap('FOREST', 0, 'node_forest_d');
    expect(cachedB.nodeConnections?.south).toBe('node_town_a');
    expect(cachedD.nodeConnections?.south).toBe('node_town_c');
  });
});
