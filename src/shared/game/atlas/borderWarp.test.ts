import { describe, it, expect } from 'vitest';
import { evaluateBorderStep } from './borderWarp';
import { AtlasGridData } from './spatialAtlas';

describe('Cross-Map Border Seamless Warp Resolution (Bible 23 & 24)', () => {
  const mockAtlas: AtlasGridData = {
    nodes: [
      { id: 'node_village', mapId: 'VILLAGE_CENTER', x: 2, y: 2, gridX: 2, gridY: 2, width: 20, height: 20 },
      { id: 'node_river', mapId: 'EAST_RIVER', x: 3, y: 2, gridX: 3, gridY: 2, width: 25, height: 20 },
    ],
  };

  const mapDims = { width: 20, height: 20 };

  it('returns shouldWarp: false when movement is completely within map boundaries', () => {
    const res = evaluateBorderStep(
      'VILLAGE_CENTER',
      { x: 5, y: 5 },
      { dx: 1, dy: 0 },
      mapDims,
      mockAtlas
    );

    expect(res.shouldWarp).toBe(false);
    expect(res.targetMapId).toBeUndefined();
  });

  it('resolves seamless East border step when stepping past x=19', () => {
    const res = evaluateBorderStep(
      'VILLAGE_CENTER',
      { x: 19, y: 10 },
      { dx: 1, dy: 0 },
      mapDims,
      mockAtlas
    );

    expect(res.shouldWarp).toBe(true);
    expect(res.targetMapId).toBe('EAST_RIVER');
    expect(res.spawnX).toBe(0);
    expect(res.spawnY).toBe(10);
    expect(res.direction).toBe('east');
  });

  it('blocks border warp and provides reason when stepping off an unconnected edge', () => {
    // Stepping off North (no North neighbor registered)
    const res = evaluateBorderStep(
      'VILLAGE_CENTER',
      { x: 10, y: 0 },
      { dx: 0, dy: -1 },
      mapDims,
      mockAtlas
    );

    expect(res.shouldWarp).toBe(false);
    expect(res.reason).toContain('no adjacent world zone is connected');
  });
});
