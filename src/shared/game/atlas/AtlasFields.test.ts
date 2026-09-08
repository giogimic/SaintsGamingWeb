import { describe, it, expect } from 'vitest';
import { buildAtlasWorld } from './world/AtlasWorldBuilder';
import { ConstantField, AddField, RemapField } from './composition/MathOperations';
import { SimplexNoiseSource } from './noise/SimplexNoiseSource';

describe('Saints Atlas — World Fields API', () => {

  it('evaluates deterministically for the same seed', () => {
    const world1 = buildAtlasWorld('test_seed_123');
    const world2 = buildAtlasWorld('test_seed_123');

    const sample = { x: 100, y: 0, z: 200 };
    
    expect(world1.elevation.sample(sample)).toBe(world2.elevation.sample(sample));
    expect(world1.temperature.sample(sample)).toBe(world2.temperature.sample(sample));
  });

  it('diverges meaningfully for different seeds', () => {
    const world1 = buildAtlasWorld('test_seed_123');
    const world2 = buildAtlasWorld('test_seed_456');

    const sample = { x: 100.5, y: 0, z: 200.5 };
    
    expect(world1.elevation.sample(sample)).not.toBe(world2.elevation.sample(sample));
  });

  it('exhibits spatial continuity', () => {
    const world = buildAtlasWorld('continuity_test');
    
    const v1 = world.elevation.sample({ x: 100.5, y: 0, z: 100.5 });
    const v2 = world.elevation.sample({ x: 100.51, y: 0, z: 100.5 });
    const v3 = world.elevation.sample({ x: 150.5, y: 0, z: 100.5 });

    const diffSmall = Math.abs(v1 - v2);
    const diffLarge = Math.abs(v1 - v3);

    expect(diffSmall).toBeLessThan(0.05); // Should be very close
    expect(diffLarge).toBeGreaterThan(diffSmall); // Should diverge further away
  });

  it('evaluates composition math correctly', () => {
    const c1 = new ConstantField('c1', 10);
    const c2 = new ConstantField('c2', 5);
    const add = new AddField('add', c1, c2);
    
    expect(add.sample({ x: 0, y: 0, z: 0 })).toBe(15);
    expect(add.definition.outputRange.min).toBe(15);

    const remap = new RemapField('remap', add, 0, 30, 0, 1);
    expect(remap.sample({ x: 0, y: 0, z: 0 })).toBe(0.5);
  });

  it('supports 2D dimension ignorance of Y coordinate', () => {
    const world = buildAtlasWorld('dimension_test');
    
    // Elevation is a 2D field
    const e1 = world.elevation.sample({ x: 50, y: 0, z: 50 });
    const e2 = world.elevation.sample({ x: 50, y: 100, z: 50 });
    
    expect(e1).toBe(e2); // Y coordinate shouldn't affect 2D field
  });

  it('supports 3D dimension reliance on Y coordinate', () => {
    const world = buildAtlasWorld('dimension_test');
    
    // Geology is a 3D field
    const g1 = world.geology.sample({ x: 50, y: 0, z: 50 });
    const g2 = world.geology.sample({ x: 50, y: 10, z: 50 });
    
    expect(g1).not.toBe(g2); // Y coordinate MUST affect 3D field
  });

  it('remaps values into normalized 0.0 to 1.0 ranges', () => {
    const world = buildAtlasWorld('normalized_test');
    const sample = { x: 42, y: 0, z: 99 };
    
    const elev = world.elevation.sample(sample);
    const temp = world.temperature.sample(sample);
    
    expect(elev).toBeGreaterThanOrEqual(0.0);
    expect(elev).toBeLessThanOrEqual(1.0);
    
    expect(temp).toBeGreaterThanOrEqual(0.0);
    expect(temp).toBeLessThanOrEqual(1.0);
  });
});
