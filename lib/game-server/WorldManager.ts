import { GameEngine } from "./GameEngine";

// Using require for legacy JS modules (they can be converted to TS later)
const mapLoader = require("../game/map-loader.js");
const spatialGrid = require("../game/spatial-grid.js");

export interface MapInstance {
  instanceId: string; // e.g. "lobby_ch1"
  mapId: string;      // e.g. "lobby" (Map Definition)
  // Later: add players set, unique entity lists, etc.
}

export class WorldManager {
  // World -> Instances (e.g. Map Definition -> Lobby Channel 1, Player Base, etc.)
  private instances = new Map<string, MapInstance>();

  constructor(private engine: GameEngine) {
    this.engine.events.on("resolveCollisions", () => this.resolveCollisions());
  }

  public async initialize() {
    await mapLoader.initialize();
  }

  public async loadMap(mapId: string) {
    // Loads the Map Definition (collision grid, blocked areas, triggers)
    await mapLoader.loadMapData(mapId);
  }

  public createInstance(instanceId: string, mapId: string): MapInstance {
    const instance = { instanceId, mapId };
    this.instances.set(instanceId, instance);
    return instance;
  }

  public getInstance(instanceId: string): MapInstance | undefined {
    return this.instances.get(instanceId);
  }

  // COLLISION AUTHORITY: 
  // The server completely owns collision data. Clients handle visuals, but the server verifies 
  // every movement against the loaded Map Definition to prevent walking through walls.
  public isWalkable(instanceId: string, x: number, y: number): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;
    return mapLoader.isWalkableSync(instance.mapId, x, y);
  }

  public isOccupied(instanceId: string, x: number, y: number): boolean {
    return spatialGrid.isOccupied(instanceId, x, y);
  }

  public addEntity(instanceId: string, x: number, y: number, entityId: string) {
    spatialGrid.addEntity(instanceId, x, y, entityId);
  }

  public removeEntity(instanceId: string, x: number, y: number, entityId: string) {
    spatialGrid.removeEntity(instanceId, x, y, entityId);
  }

  public moveEntity(instanceId: string, oldX: number, oldY: number, newX: number, newY: number, entityId: string) {
    spatialGrid.moveEntity(instanceId, oldX, oldY, newX, newY, entityId);
  }

  private resolveCollisions() {
    // Spatial grid handles O(1) occupancy.
    // The GameEngine emits this event, and specific managers 
    // (like PlayerManager or NpcManager) check occupancy during their movement phase.
  }
}
