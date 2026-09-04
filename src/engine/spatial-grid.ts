/**
 * Spatial Hash Grid
 * Provides O(1) time complexity for 2D coordinate lookups.
 * Used for entity collisions (Players, NPCs) in the game server.
 */

export class SpatialGrid {
  // Map key: "mapId:x,y" -> Set<entityId>
  private grid: Map<string, Set<string>>;

  constructor() {
    this.grid = new Map<string, Set<string>>();
  }

  private _key(mapId: string, x: number, y: number): string {
    return `${mapId}:${x},${y}`;
  }

  public addEntity(mapId: string, x: number, y: number, entityId: string): void {
    const k = this._key(mapId, x, y);
    if (!this.grid.has(k)) {
      this.grid.set(k, new Set<string>());
    }
    this.grid.get(k)!.add(entityId);
  }

  public removeEntity(mapId: string, x: number, y: number, entityId: string): void {
    const k = this._key(mapId, x, y);
    const cell = this.grid.get(k);
    if (cell) {
      cell.delete(entityId);
      if (cell.size === 0) {
        this.grid.delete(k);
      }
    }
  }

  public moveEntity(mapId: string, oldX: number, oldY: number, newX: number, newY: number, entityId: string): void {
    this.removeEntity(mapId, oldX, oldY, entityId);
    this.addEntity(mapId, newX, newY, entityId);
  }

  public isOccupied(mapId: string, x: number, y: number): boolean {
    return this.grid.has(this._key(mapId, x, y));
  }

  public getEntitiesAt(mapId: string, x: number, y: number): string[] {
    const k = this._key(mapId, x, y);
    const cell = this.grid.get(k);
    return cell ? Array.from(cell) : [];
  }
  
  public clearMap(mapId: string): void {
    // Clear all entries starting with mapId:
    const prefix = `${mapId}:`;
    for (const key of this.grid.keys()) {
      if (key.startsWith(prefix)) {
        this.grid.delete(key);
      }
    }
  }
}

export const spatialGrid = new SpatialGrid();
