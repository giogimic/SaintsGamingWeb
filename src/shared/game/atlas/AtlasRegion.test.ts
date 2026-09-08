import { describe, it, expect } from 'vitest';
import { buildAtlasWorld } from './world/AtlasWorldBuilder';
import { AtlasRegionResolver } from './world/AtlasRegionResolver';
import { calculateTerrainElevation } from './world/TerrainModifiers';
import { CANONICAL_FRACTAL_AREAS } from './world/FractalArea';

describe('Saints Atlas — Phase 2: Fractal Areas', () => {

  it('resolves coordinates to deterministic fractal areas', () => {
    const context = buildAtlasWorld('region_test_123');
    const resolver = new AtlasRegionResolver();

    const area1 = resolver.resolveArea(context, 100.5, 200.5);
    const area2 = resolver.resolveArea(context, 100.5, 200.5);

    expect(area1.id).toBe(area2.id); // Same coordinate = same area
  });

  it('calculates deterministic terrain elevation', () => {
    const context = buildAtlasWorld('terrain_test_456');
    const resolver = new AtlasRegionResolver();

    const elev1 = calculateTerrainElevation(context, resolver, 300.5, 400.5);
    const elev2 = calculateTerrainElevation(context, resolver, 300.5, 400.5);

    expect(elev1).toBe(elev2);
  });

  it('verifies that ruggedness and erosion modifiers alter base elevation', () => {
    const context = buildAtlasWorld('terrain_test_789');
    const resolver = new AtlasRegionResolver();

    const x = 500.5;
    const z = 600.5;
    
    const baseElev = context.elevation.sample({ x, y: 0, z });
    const finalElev = calculateTerrainElevation(context, resolver, x, z);
    
    // finalElev should be modified by ruggedness, continentalness, and region multipliers
    // We expect them to rarely be exactly identical unless the area forces it.
    
    const area = resolver.resolveArea(context, x, z);
    if (area.terrainModifiers.heightMultiplier !== 1.0 || area.terrainModifiers.heightOffset !== 0.0) {
      expect(finalElev).not.toBe(baseElev);
    }
  });

  it('favors Alpine Range when elevation is high and temperature is low', () => {
    // In our canonical array, Alpine is cold and high.
    // Let's create a mocked context to test the resolver logic explicitly.
    const mockContext: any = {
      temperature: { sample: () => 0.1 }, // Cold
      moisture: { sample: () => 0.5 },    // Mid
      elevation: { sample: () => 0.9 },   // High
    };

    const resolver = new AtlasRegionResolver(CANONICAL_FRACTAL_AREAS);
    const resolved = resolver.resolveArea(mockContext, 0, 0);

    expect(resolved.id).toBe('area_alpine_range');
  });

  it('favors Golden Dunes when temperature is high and moisture is low', () => {
    const mockContext: any = {
      temperature: { sample: () => 0.9 }, // Hot
      moisture: { sample: () => 0.1 },    // Dry
      elevation: { sample: () => 0.4 },   // Mid
    };

    const resolver = new AtlasRegionResolver(CANONICAL_FRACTAL_AREAS);
    const resolved = resolver.resolveArea(mockContext, 0, 0);

    expect(resolved.id).toBe('area_golden_dunes');
  });
});
