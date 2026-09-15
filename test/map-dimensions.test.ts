import { describe, it, expect } from 'vitest';
import { resolveMapDimensions } from '../src/shared/game/mapDocVisual';

describe('Map Dimensions Regression Tests', () => {
  it('should propagate 64x64 dimensions correctly and not fall back to 24x24', () => {
    const doc = {
      width: 64,
      height: 64,
      voxelDoc: {
        mapWidth: 64,
        mapHeight: 64,
      }
    };
    
    const dims = resolveMapDimensions(doc as any);
    expect(dims.width).toBe(64);
    expect(dims.height).toBe(64);
  });

  it('should reject 0 dimensions and fallback if applicable', () => {
    // If a doc has 0, the || operator will fall through to the default 24
    const doc = {
      width: 0,
      height: 0,
    };
    
    const dims = resolveMapDimensions(doc as any);
    expect(dims.width).toBe(24);
    expect(dims.height).toBe(24);
  });

  it('should use tileLayer grid dimensions if provided', () => {
    const doc = {
      tileLayers: [
        {
          grid: Array.from({ length: 64 }, () => Array(64).fill(1))
        }
      ]
    };
    
    const dims = resolveMapDimensions(doc as any);
    expect(dims.width).toBe(64);
    expect(dims.height).toBe(64);
  });
});
