import { Point } from '../store';
import { ElementType } from './saints-dex';
import { TUXEMON_CAMPAIGN_MAPS } from './campaign-maps';

export interface MapGate {
  targetMapId: string;
  spawnPoint: Point;
  requiredElement?: ElementType;
  errorMessage?: string;
}

export interface GameMapData {
  id: string;
  name: string;
  grid: number[][]; // 0: safe, 1: wall/boundary, 2: tall grass, 3-4: gates, 5: tree(woodcutting), 6: ore(mining), 7: shop, 8: clinic, 10: fishing spot
  gates: Record<number, MapGate>;
  npcs?: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    sprite: string;
    dialogueKey: string;
  }>;
  encounterPool?: Array<{
    speciesId: string;
    minLevel: number;
    maxLevel: number;
    weight: number;
  }>;
}

export const GAME_MAPS: Record<string, GameMapData> = {
  ...TUXEMON_CAMPAIGN_MAPS
};
