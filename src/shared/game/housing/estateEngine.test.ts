import { describe, it, expect } from 'vitest';
import {
  createEstate,
  buildEstateRoom,
  placeFurniture,
  removeFurniture,
  PlacedFurniture,
} from './estateEngine';

describe('Sanctuary Estate Grid & Furniture Placement Engine (Bible 13)', () => {
  it('creates starter estate with central garden room', () => {
    const estate = createEstate('player_1');

    expect(estate.ownerId).toBe('player_1');
    expect(estate.rooms.length).toBe(1);
    expect(estate.rooms[0].type).toBe('GARDEN');
  });

  it('builds rooms when Construction level prerequisites are met', () => {
    const estate = createEstate('player_1');

    // Build Kitchen (requires level 5, player has level 10)
    const buildKitchen = buildEstateRoom(estate, 2, 3, 'KITCHEN', 10);
    expect(buildKitchen.success).toBe(true);
    expect(estate.rooms.length).toBe(2);

    // Build Throne Room (requires level 85, player has level 10 -> blocked)
    const buildThrone = buildEstateRoom(estate, 2, 1, 'THRONE_ROOM', 10);
    expect(buildThrone.success).toBe(false);
    expect(buildThrone.reason).toContain('Requires Construction level 85');
  });

  it('places furniture and prevents collision overlaps', () => {
    const estate = createEstate('player_1');

    const oakTable: PlacedFurniture = {
      id: 'furn_table_1',
      name: 'Oak Dining Table',
      x: 2,
      y: 2,
      width: 2,
      height: 2,
      hotspotType: 'table',
      reqConstructionLevel: 1,
    };

    const place1 = placeFurniture(estate, 2, 2, oakTable, 20);
    expect(place1.success).toBe(true);

    // Attempt to place chair overlapping the table at (3, 2)
    const chair: PlacedFurniture = {
      id: 'furn_chair_1',
      name: 'Oak Chair',
      x: 3,
      y: 2,
      width: 1,
      height: 1,
      hotspotType: 'chair',
      reqConstructionLevel: 1,
    };

    const place2 = placeFurniture(estate, 2, 2, chair, 20);
    expect(place2.success).toBe(false);
    expect(place2.reason).toContain('Overlaps with existing furniture');
  });

  it('removes furniture cleanly from room', () => {
    const estate = createEstate('player_1');
    const bench: PlacedFurniture = {
      id: 'furn_bench_1',
      name: 'Garden Bench',
      x: 0,
      y: 0,
      width: 2,
      height: 1,
      hotspotType: 'bench',
      reqConstructionLevel: 1,
    };

    placeFurniture(estate, 2, 2, bench, 10);
    expect(estate.rooms[0].furniture.length).toBe(1);

    const removed = removeFurniture(estate, 2, 2, 'furn_bench_1');
    expect(removed).toBe(true);
    expect(estate.rooms[0].furniture.length).toBe(0);
  });
});
