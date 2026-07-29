import { GameEngine } from "./GameEngine";
import { WorldManager } from "./WorldManager";
import { AIState, SpawnMode } from "./types";

export interface CreatureState {
  entityId: string;
  templateId: string;
  name: string;
  mapId: string;
  x: number;
  y: number;
  spawnMode: SpawnMode;
  aiState: AIState;
  ownerId?: string; // If SpawnMode is ENCOUNTER_PRIVATE, this is the player's accountId or partyId
  hp: number;
  maxHp: number;
  isMoving: boolean;
  direction: "up" | "down" | "left" | "right";
  lastMoveTime: number;
}

export class CreatureManager {
  private creatures = new Map<string, CreatureState>();
  private dirtyEntities = new Set<string>();

  constructor(private engine: GameEngine, private worldManager: WorldManager) {
    this.engine.events.on("updateEntities", (dt) => this.tickAI(dt));
    this.engine.events.on("broadcastDeltas", () => this.broadcastDeltas());
    this.engine.events.on("spawnCreature", (data) => this.spawnCreature(data));
  }

  private spawnCreature(data: { templateId: string, mapId: string, x: number, y: number, spawnMode: SpawnMode, ownerId?: string }) {
    const entityId = `creature_${data.templateId}_${Date.now()}`;
    
    const creature: CreatureState = {
      entityId,
      templateId: data.templateId,
      name: "Wild " + data.templateId,
      mapId: data.mapId,
      x: data.x,
      y: data.y,
      spawnMode: data.spawnMode,
      aiState: AIState.IDLE,
      ownerId: data.ownerId,
      hp: 100,
      maxHp: 100,
      isMoving: false,
      direction: "down",
      lastMoveTime: Date.now()
    };

    this.creatures.set(entityId, creature);
    this.worldManager.addEntity(creature.mapId, creature.x, creature.y, entityId);
    this.dirtyEntities.add(entityId);
    
    // Broadcast spawn to clients. 
    // Private spawns need special handling, but for now we tag them with ownerId
    // so the client can ignore rendering if it's not theirs. A more robust server
    // implementation would filter the broadcast list.
    this.engine.events.emit("networkBroadcast", {
      room: creature.mapId,
      event: "creature_spawned",
      data: creature
    });
  }

  private tickAI(dt: number) {
    const now = Date.now();
    for (const [entityId, creature] of this.creatures.entries()) {
      // Basic Random Wander
      if (creature.aiState === AIState.IDLE || creature.aiState === AIState.WANDER) {
        if (now - creature.lastMoveTime > 3000) {
          // 25% chance to wander every 3 seconds
          if (Math.random() < 0.25) {
            const dirs: Array<"up" | "down" | "left" | "right"> = ["up", "down", "left", "right"];
            const dir = dirs[Math.floor(Math.random() * dirs.length)];
            
            let nextX = creature.x;
            let nextY = creature.y;
            
            if (dir === "up") nextY -= 1;
            else if (dir === "down") nextY += 1;
            else if (dir === "left") nextX -= 1;
            else if (dir === "right") nextX += 1;

            if (
              this.worldManager.isWalkable(creature.mapId, nextX, nextY) &&
              !this.worldManager.isOccupied(creature.mapId, nextX, nextY)
            ) {
              this.worldManager.moveEntity(creature.mapId, creature.x, creature.y, nextX, nextY, entityId);
              creature.x = nextX;
              creature.y = nextY;
              creature.direction = dir;
              creature.isMoving = true;
              creature.lastMoveTime = now;
              this.dirtyEntities.add(entityId);
              
              // Reset moving flag after short delay
              setTimeout(() => {
                const c = this.creatures.get(entityId);
                if (c) {
                  c.isMoving = false;
                  this.dirtyEntities.add(entityId);
                }
              }, 250);
            } else {
              creature.direction = dir; // Just turn
              creature.lastMoveTime = now;
              this.dirtyEntities.add(entityId);
            }
          }
        }
      }
    }
  }

  private broadcastDeltas() {
    if (this.dirtyEntities.size === 0) return;

    const mapDeltas = new Map<string, any[]>();

    for (const entityId of this.dirtyEntities) {
      const creature = this.creatures.get(entityId);
      if (creature) {
        if (!mapDeltas.has(creature.mapId)) {
          mapDeltas.set(creature.mapId, []);
        }
        mapDeltas.get(creature.mapId)!.push({
          entityId: creature.entityId,
          x: creature.x,
          y: creature.y,
          direction: creature.direction,
          isMoving: creature.isMoving,
          hp: creature.hp,
          ownerId: creature.ownerId
        });
      }
    }

    for (const [mapId, deltas] of mapDeltas.entries()) {
      for (const delta of deltas) {
         this.engine.events.emit("networkBroadcast", {
           room: mapId,
           event: "creature_moved",
           data: delta
         });
      }
    }

    this.dirtyEntities.clear();
  }
}
