import { describe, expect, it } from 'vitest';
import { ExplorationEngine } from './explorationEngine';

describe('World Exploration, Fog of War & Discovery POI Engine (Phase 18)', () => {
  it('unveils tiles in a circular radius and clamps to map boundaries', () => {
    const engine = new ExplorationEngine();
    const data = engine.initPlayerExploration('char_1', 'map_village');

    // Reveal at center (10, 10) with radius 2 on a 20x20 map
    const res1 = engine.revealRadius(data, 10, 10, 2, 20, 20);
    expect(res1.newlyExploredCount).toBeGreaterThan(0);
    expect(data.exploredTiles.has('10,10')).toBe(true);
    expect(data.exploredTiles.has('10,11')).toBe(true);

    // Re-revealing exact same spot -> 0 new tiles
    const res2 = engine.revealRadius(data, 10, 10, 2, 20, 20);
    expect(res2.newlyExploredCount).toBe(0);
  });

  it('triggers landmark POI discovery when player steps within detection radius', () => {
    const engine = new ExplorationEngine();

    engine.registerPoi({
      id: 'poi_ancient_shrine',
      mapId: 'map_mystic_woods',
      name: 'Shrine of the Celestials',
      type: 'MYSTIC_SHRINE',
      x: 15,
      y: 15,
      discoveryRadius: 3,
      xpAward: 250,
      isWaypoint: true,
    });

    const data = engine.initPlayerExploration('char_2', 'map_mystic_woods');

    // 1. Moving far away (5, 5) -> does not discover
    const r1 = engine.revealRadius(data, 5, 5, 2, 30, 30);
    expect(r1.newlyDiscoveredPois).toHaveLength(0);
    expect(r1.totalXpGained).toBe(0);
    expect(data.discoveredPoiIds.has('poi_ancient_shrine')).toBe(false);

    // 2. Moving within discovery radius (14, 15) -> discovers POI
    const r2 = engine.revealRadius(data, 14, 15, 2, 30, 30);
    expect(r2.newlyDiscoveredPois).toHaveLength(1);
    expect(r2.newlyDiscoveredPois[0].name).toBe('Shrine of the Celestials');
    expect(r2.totalXpGained).toBe(250);
    expect(data.discoveredPoiIds.has('poi_ancient_shrine')).toBe(true);

    // 3. Revisiting -> not re-discovered
    const r3 = engine.revealRadius(data, 15, 15, 2, 30, 30);
    expect(r3.newlyDiscoveredPois).toHaveLength(0);
    expect(r3.totalXpGained).toBe(0);
  });

  it('calculates map exploration percentage accurately', () => {
    const engine = new ExplorationEngine();
    const data = engine.initPlayerExploration('char_3', 'map_small');

    // 10x10 map = 100 tiles
    // Add 25 tiles
    for (let i = 0; i < 25; i++) {
      data.exploredTiles.add(`${i % 5},${Math.floor(i / 5)}`);
    }

    const pct = engine.calculateExplorationPercentage(data, 10, 10);
    expect(pct).toBe(25.0);
  });
});
