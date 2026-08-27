import { describe, expect, it } from 'vitest';
import { ProceduralDungeonEngine } from './proceduralDungeonEngine';

describe('Master Procedural Dungeon & Crypt Labyrinth Engine (Phase 46)', () => {
  it('generates reproducible seeded dungeon layouts with carved rooms and orthogonal corridors', () => {
    const engine = new ProceduralDungeonEngine();

    const layoutA = engine.generateDungeon(1337, 64, 64);
    const layoutB = engine.generateDungeon(1337, 64, 64);

    expect(layoutA.rooms).toHaveLength(4);
    expect(layoutA.corridors).toHaveLength(3);

    // Verify deterministic reproducibility
    expect(layoutA.rooms).toEqual(layoutB.rooms);
    expect(layoutA.grid).toEqual(layoutB.grid);

    // Verify entrance room tiles are walkable (1)
    const entrance = layoutA.rooms.find((r) => r.type === 'ENTRANCE')!;
    expect(layoutA.grid[entrance.y][entrance.x]).toBe(1);

    // Verify out-of-room tile is solid wall (0)
    expect(layoutA.grid[0][0]).toBe(0);
  });

  it('validates lock-and-key dependency graph solvability and reaches the boss chamber', () => {
    const engine = new ProceduralDungeonEngine();

    // 1. Solvable layout
    const validLayout = engine.generateDungeon(42, 64, 64);
    const sol = engine.validateSolvability(validLayout);

    expect(sol.isSolvable).toBe(true);
    expect(sol.reachedBoss).toBe(true);
    expect(sol.collectedKeys).toContain('SILVER_KEY');
    expect(sol.collectedKeys).toContain('GOLD_KEY');

    // 2. Unsolvable layout (break the key chain: require GOLD_KEY on combat hall when gold key is in shrine)
    const brokenLayout = engine.generateDungeon(42, 64, 64);
    const combatRoom = brokenLayout.rooms.find((r) => r.id === 'room_combat')!;
    combatRoom.requiredKey = 'GOLD_KEY'; // Impossible: Gold key is locked behind shrine which requires silver key from combat room

    const brokenSol = engine.validateSolvability(brokenLayout);
    expect(brokenSol.isSolvable).toBe(false);
    expect(brokenSol.reachedBoss).toBe(false);
  });
});
