import { GameEngine } from "./GameEngine";
import { WorldManager } from "./WorldManager";
import { AIState, SpawnMode, BehavioralState, EntityType } from "./types";

export interface CreatureState {
  entityId: string;
  entityType: EntityType;
  templateId: string;
  name: string;
  mapId: string;
  x: number;
  y: number;
  spawnMode: SpawnMode;
  aiState: AIState;
  behavior: BehavioralState;
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
    this.engine.events.on("updateEntities", (dt) => this.tickCombatAI(dt));
    this.engine.events.on("aiTick", (data) => this.tickWanderAI(data));
    this.engine.events.on("broadcastDeltas", () => this.broadcastDeltas());
    this.engine.events.on("spawnCreature", (data) => this.spawnCreature(data));
    this.engine.events.on("creatureDamaged", (data) => this.handleCreatureDamaged(data));
    this.engine.events.on("requestCreatureState", (entityId, callback) => {
      callback(this.creatures.get(entityId));
    });
  }

  public getCreature(entityId: string): CreatureState | undefined {
    return this.creatures.get(entityId);
  }

  private handleCreatureDamaged(data: { entityId: string, attackerId: string, damage: number }) {
    const creature = this.creatures.get(data.entityId);
    if (!creature) return;

    creature.hp = Math.max(0, creature.hp - data.damage);
    const hpPercent = creature.hp / creature.maxHp;

    this.engine.events.emit("networkBroadcast", {
      room: creature.mapId,
      event: "creature_hp_update",
      data: { entityId: data.entityId, hpPercent }
    });

    if (hpPercent <= 0) {
      this.engine.events.emit("entityDeath", { 
        entityId: data.entityId, 
        mapId: creature.mapId, 
        x: creature.x, 
        y: creature.y 
      });
      this.worldManager.removeEntity(creature.mapId, creature.x, creature.y, data.entityId);
      this.creatures.delete(data.entityId);
      this.engine.events.emit("networkBroadcast", {
        room: creature.mapId,
        event: "creature_despawned",
        data: { entityId: data.entityId }
      });
      return;
    } else if (hpPercent < 0.15) {
      creature.behavior = BehavioralState.FLEEING;
      creature.aiState = AIState.FLEE;
    } else if (hpPercent < 0.50) {
      creature.behavior = BehavioralState.ENRAGED;
      creature.aiState = AIState.ATTACK; // Transition to attack when enraged
    } else {
      creature.behavior = BehavioralState.ALERT;
      creature.aiState = AIState.CHASE; // Transition to chase/alert
    }

    this.dirtyEntities.add(data.entityId);
  }

  private spawnCreature(data: { templateId: string, entityType?: EntityType, mapId: string, x: number, y: number, spawnMode: SpawnMode, ownerId?: string }) {
    const isNpc = data.entityType === EntityType.NPC;
    const entityId = `${isNpc ? 'npc' : 'creature'}_${data.templateId}_${Date.now()}`;
    
    const creature: CreatureState = {
      entityId,
      entityType: data.entityType || EntityType.CREATURE,
      templateId: data.templateId,
      name: isNpc ? data.templateId : "Wild " + data.templateId,
      mapId: data.mapId,
      x: data.x,
      y: data.y,
      spawnMode: data.spawnMode,
      aiState: AIState.IDLE,
      behavior: BehavioralState.CALM,
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

  private tickWanderAI({ instanceId, mapId }: { instanceId: string, mapId: string }) {
    const now = Date.now();
    for (const [entityId, creature] of this.creatures.entries()) {
      if (creature.mapId !== instanceId) continue;
      
      // Phase 6: 1-TPS NPC/Creature Wander AI Loop
      if (creature.aiState === AIState.IDLE || creature.aiState === AIState.WANDER) {
        // 25% chance to wander every tick (which is 1 second)
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

  private tickCombatAI(dt: number) {
    const now = Date.now();
    for (const [entityId, creature] of this.creatures.entries()) {
      if (creature.aiState === AIState.FLEE) {
        // Simple fleeing logic: Move rapidly every 1 second in a random valid direction
        if (now - creature.lastMoveTime > 1000) {
          const dirs: Array<"up" | "down" | "left" | "right"> = ["up", "down", "left", "right"];
          const validDirs = dirs.filter(dir => {
            let nextX = creature.x;
            let nextY = creature.y;
            if (dir === "up") nextY -= 1;
            else if (dir === "down") nextY += 1;
            else if (dir === "left") nextX -= 1;
            else if (dir === "right") nextX += 1;
            return this.worldManager.isWalkable(creature.mapId, nextX, nextY) && !this.worldManager.isOccupied(creature.mapId, nextX, nextY);
          });
          
          if (validDirs.length > 0) {
            const dir = validDirs[Math.floor(Math.random() * validDirs.length)];
            let nextX = creature.x;
            let nextY = creature.y;
            if (dir === "up") nextY -= 1;
            else if (dir === "down") nextY += 1;
            else if (dir === "left") nextX -= 1;
            else if (dir === "right") nextX += 1;
            
            this.worldManager.moveEntity(creature.mapId, creature.x, creature.y, nextX, nextY, entityId);
            creature.x = nextX;
            creature.y = nextY;
            creature.direction = dir;
            creature.isMoving = true;
            creature.lastMoveTime = now;
            this.dirtyEntities.add(entityId);
            
            setTimeout(() => {
              const c = this.creatures.get(entityId);
              if (c) {
                c.isMoving = false;
                this.dirtyEntities.add(entityId);
              }
            }, 250);
          }
        }
      } else if (creature.aiState === AIState.ATTACK) {
        // Enraged creatures unleash AoE attacks every 2 seconds
        if (now - creature.lastMoveTime > 2000) {
          creature.lastMoveTime = now;
          
          // Emit a decoupled attack event. The PlayerManager will listen and apply damage
          // to any players within the radius.
          this.engine.events.emit("creatureAoEAttack", {
            attackerId: creature.entityId,
            mapId: creature.mapId,
            x: creature.x,
            y: creature.y,
            radius: 3,
            damage: 15
          });

          // Optional: visual broadcast so clients see an attack animation
          this.engine.events.emit("networkBroadcast", {
            room: creature.mapId,
            event: "combat_update",
            data: {
              type: "AOE_ATTACK",
              attackerId: creature.entityId,
              radius: 3,
              damage: 15
            }
          });
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
          maxHp: creature.maxHp,
          ownerId: creature.ownerId,
          behavior: creature.behavior
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
