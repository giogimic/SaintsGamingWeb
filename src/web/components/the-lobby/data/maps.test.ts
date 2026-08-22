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
});
