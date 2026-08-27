/**
 * Saints Gaming — World Exploration, Fog of War & Discovery POI Engine (Bible 02 & 08)
 * Manages player-specific Fog of War circular tile reveals, landmark POI proximity checks, exploration XP awards, waypoint unlocks, and map completion percentage calculations.
 */

export type POIType =
  | 'VILLAGE'
  | 'RUINS'
  | 'DUNGEON_ENTRANCE'
  | 'VISTA_POINT'
  | 'MYSTIC_SHRINE'
  | 'GATHERING_GROVE';

export interface PointOfInterest {
  id: string;
  mapId: string;
  name: string;
  type: POIType;
  x: number;
  y: number;
  discoveryRadius: number;
  xpAward: number;
  isWaypoint: boolean;
}

export interface PlayerExplorationData {
  characterId: string;
  mapId: string;
  exploredTiles: Set<string>; // "x,y"
  discoveredPoiIds: Set<string>;
}

export class ExplorationEngine {
  private pois = new Map<string, PointOfInterest>();

  /**
   * Registers a Point of Interest (POI) or landmark on a world map.
   */
  public registerPoi(poi: PointOfInterest) {
    this.pois.set(poi.id, { ...poi });
  }

  /**
   * Retrieves all POIs for a specific map.
   */
  public getMapPois(mapId: string): PointOfInterest[] {
    return Array.from(this.pois.values()).filter((p) => p.mapId === mapId);
  }

  /**
   * Initializes or loads a player's exploration state for a map.
   */
  public initPlayerExploration(
    characterId: string,
    mapId: string,
    initialTiles: string[] = [],
    initialPois: string[] = []
  ): PlayerExplorationData {
    return {
      characterId,
      mapId,
      exploredTiles: new Set(initialTiles),
      discoveredPoiIds: new Set(initialPois),
    };
  }

  /**
   * Unveils Fog of War tiles in a circular radius and evaluates POI proximity discoveries.
   */
  public revealRadius(
    data: PlayerExplorationData,
    centerX: number,
    centerY: number,
    radius: number,
    mapWidth: number,
    mapHeight: number
  ): {
    newlyExploredCount: number;
    newlyDiscoveredPois: PointOfInterest[];
    totalXpGained: number;
  } {
    let newlyExplored = 0;
    const r2 = radius * radius;

    const minX = Math.max(0, Math.floor(centerX - radius));
    const maxX = Math.min(mapWidth - 1, Math.ceil(centerX + radius));
    const minY = Math.max(0, Math.floor(centerY - radius));
    const maxY = Math.min(mapHeight - 1, Math.ceil(centerY + radius));

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const dx = x - centerX;
        const dy = y - centerY;
        if (dx * dx + dy * dy <= r2) {
          const key = `${x},${y}`;
          if (!data.exploredTiles.has(key)) {
            data.exploredTiles.add(key);
            newlyExplored++;
          }
        }
      }
    }

    // Check POI discoveries in this map
    const mapPois = this.getMapPois(data.mapId);
    const discovered: PointOfInterest[] = [];
    let xpGained = 0;

    for (const poi of mapPois) {
      if (!data.discoveredPoiIds.has(poi.id)) {
        const dist2 = (centerX - poi.x) ** 2 + (centerY - poi.y) ** 2;
        const discR2 = (poi.discoveryRadius || 3) ** 2;
        if (dist2 <= discR2) {
          data.discoveredPoiIds.add(poi.id);
          discovered.push(poi);
          xpGained += poi.xpAward || 100;
        }
      }
    }

    return {
      newlyExploredCount: newlyExplored,
      newlyDiscoveredPois: discovered,
      totalXpGained: xpGained,
    };
  }

  /**
   * Computes the exact percentage of the map explored by the player (0.0% to 100.0%).
   */
  public calculateExplorationPercentage(
    data: PlayerExplorationData,
    mapWidth: number,
    mapHeight: number
  ): number {
    const totalTiles = mapWidth * mapHeight;
    if (totalTiles <= 0) return 0;

    const exploredCount = data.exploredTiles.size;
    const percentage = (exploredCount / totalTiles) * 100;
    return Number(Math.min(100, percentage).toFixed(1));
  }
}
