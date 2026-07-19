import { Point } from '../store';
import { ElementType } from './saints-dex';

export interface MapGate {
  targetMapId: string;
  spawnPoint: Point;
  requiredElement: ElementType;
  errorMessage: string;
}

export interface GameMapData {
  id: string;
  name: string;
  grid: number[][]; // 0: safe, 1: wall/boundary, 2: tall grass, 3-4: gates, 5: tree(woodcutting), 6: ore(mining), 7: shop, 8: clinic, 10: fishing spot
  gates: Record<number, MapGate>;
}

export const GAME_MAPS: Record<string, GameMapData> = {
  SAINTS_VILLAGE: {
    id: 'SAINTS_VILLAGE',
    name: 'Saints Village',
    grid: Array.from({ length: 32 }, (_, y) => 
      Array.from({ length: 32 }, (_, x) => {
        // Create a basic perimeter wall
        if (x === 15 && y === 0) return 3; // North Gate
        if (x === 0 && y === 15) return 4; // West Gate
        if (x === 0 || x === 31 || y === 0 || y === 31) return 1;
        // Central village area
        if (x >= 10 && x <= 20 && y >= 10 && y <= 20) {
          if (x === 15 && y === 15) return 8; // Clinic
          if (x === 12 && y === 12) return 7; // Shop
          if (x === 14 && y === 12) return 9; // Crafting Station
          if (x === 12 && y === 10) return 12; // Base Terminal
          if (x === 18 && y === 18) return 5; // Tree
          return 0; // Safe path
        }
        // Tall grass fields
        if (x < 10 && y < 10) return 2;
        // Forest
        if (x > 25 && y > 25) return 5;
        // Mining spot
        if (x === 28 && y === 5) return 6;
        // Fishing spot
        if (x === 5 && y === 28) return 10;
        
        return 0; // Default grass
      })
    ),
    gates: {
      3: { targetMapId: 'VERDANT_OUTPOST', spawnPoint: {x: 4, y: 7}, requiredElement: 'Cyber', errorMessage: 'Thick vines block the path.' },
      4: { targetMapId: 'CRYSTAL_CAVES', spawnPoint: {x: 1, y: 4}, requiredElement: 'Hydro', errorMessage: 'A deep river blocks the way.' }
    }
  },
  VERDANT_OUTPOST: {
    id: 'VERDANT_OUTPOST',
    name: 'Verdant Outpost',
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 2, 2, 2, 1, 0, 0, 0, 2, 2, 2, 1, 0, 0, 0, 1],
      [1, 2, 2, 2, 1, 0, 1, 1, 2, 2, 2, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
      [1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
      [1, 2, 2, 2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 9, 9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    gates: {
      9: { targetMapId: 'SAINTS_VILLAGE', spawnPoint: {x: 4, y: 1}, requiredElement: 'None', errorMessage: '' }
    }
  },
  CRYSTAL_CAVES: {
    id: 'CRYSTAL_CAVES',
    name: 'Crystal Caves',
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 2, 2, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 2, 2, 1],
      [1, 2, 2, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 2, 2, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [9, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1],
      [9, 0, 0, 1, 2, 2, 2, 1, 0, 0, 0, 1, 2, 1, 0, 1],
      [1, 0, 0, 1, 2, 2, 2, 1, 0, 0, 0, 1, 2, 1, 0, 1],
      [1, 2, 2, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    gates: {
      9: { targetMapId: 'SAINTS_VILLAGE', spawnPoint: {x: 14, y: 4}, requiredElement: 'None', errorMessage: '' }
    }
  }
};
