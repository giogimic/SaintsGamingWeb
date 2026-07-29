/**
 * Spatial Hash Grid
 * Provides O(1) time complexity for 2D coordinate lookups.
 * Used for entity collisions (Players, NPCs) in the game server.
 */

class SpatialGrid {
  constructor() {
    // Map key: "mapId:x,y" -> Set<entityId>
    this.grid = new Map();
  }

  _key(mapId, x, y) {
    return `${mapId}:${x},${y}`;
  }

  addEntity(mapId, x, y, entityId) {
    const k = this._key(mapId, x, y);
    if (!this.grid.has(k)) {
      this.grid.set(k, new Set());
    }
    this.grid.get(k).add(entityId);
  }

  removeEntity(mapId, x, y, entityId) {
    const k = this._key(mapId, x, y);
    const cell = this.grid.get(k);
    if (cell) {
      cell.delete(entityId);
      if (cell.size === 0) {
        this.grid.delete(k);
      }
    }
  }

  moveEntity(mapId, oldX, oldY, newX, newY, entityId) {
    this.removeEntity(mapId, oldX, oldY, entityId);
    this.addEntity(mapId, newX, newY, entityId);
  }

  isOccupied(mapId, x, y) {
    return this.grid.has(this._key(mapId, x, y));
  }

  getEntitiesAt(mapId, x, y) {
    const k = this._key(mapId, x, y);
    const cell = this.grid.get(k);
    return cell ? Array.from(cell) : [];
  }
  
  clearMap(mapId) {
    // Clear all entries starting with mapId:
    const prefix = `${mapId}:`;
    for (const key of this.grid.keys()) {
      if (key.startsWith(prefix)) {
        this.grid.delete(key);
      }
    }
  }
}

module.exports = new SpatialGrid();
