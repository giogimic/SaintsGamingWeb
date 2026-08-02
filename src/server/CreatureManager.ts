import { GameEngine } from "./GameEngine";
import { WorldManager } from "./WorldManager";
import { AIState, SpawnMode, BehavioralState, EntityType } from "./types";
import { InterestManager } from "./net/InterestManager";
import { encodeCreatureMoved } from "@/shared/net/movementCodec";

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
    // 1-TPS NPC/Creature AI Loop
    let playersInMap: any[] = [];
    this.engine.events.emit("requestPlayersInMap", {
      mapId: instanceId,
      callback: (players: any[]) => { playersInMap = players; }
    });

    const now = Date.now();
    for (const [entityId, creature] of this.creatures.entries()) {
      if (creature.mapId !== instanceId) continue;
      
      const dirs: Array<"up" | "down" | "left" | "right"> = ["up", "down", "left", "right"];
      let nextX = creature.x;
      let nextY = creature.y;
      let chosenDir: "up" | "down" | "left" | "right" | null = null;

      // 1. Target Acquisition & State Transitions (Aggro Check)
      let closestPlayer = null;
      let closestDist = Infinity;

      for (const p of playersInMap) {
        const dx = p.x - creature.x;
        const dy = p.y - creature.y;
        const dist = Math.abs(dx) + Math.abs(dy); // Manhattan distance
        if (dist < closestDist) {
          closestDist = dist;
          closestPlayer = p;
        }
      }

      // Neutral/Hostile Aggro Logic
      if (closestPlayer && closestDist <= 7) {
        const hasLoS = this.worldManager.hasLineOfSight(instanceId, creature.x, creature.y, closestPlayer.x, closestPlayer.y);
        
        if (hasLoS) {
          if (creature.behavior === BehavioralState.HOSTILE || creature.behavior === BehavioralState.ENRAGED) {
             // If close enough to attack
             if (closestDist <= 1) {
               creature.aiState = AIState.ATTACK;
             } else {
               creature.aiState = AIState.CHASE;
             }
          } else if (creature.behavior === BehavioralState.FLEEING) {
             creature.aiState = AIState.FLEE;
          }
        } else if (creature.aiState === AIState.CHASE || creature.aiState === AIState.FLEE) {
           // Lost LoS
           creature.aiState = AIState.WANDER;
        }
      } else if (creature.aiState === AIState.CHASE || creature.aiState === AIState.FLEE) {
        // Target too far
        creature.aiState = AIState.WANDER;
      }

      // 2. State Execution
      if (creature.aiState === AIState.IDLE || creature.aiState === AIState.WANDER) {
        // 25% chance to wander every tick
        if (Math.random() < 0.25) {
          chosenDir = dirs[Math.floor(Math.random() * dirs.length)];
        }
      } else if (creature.aiState === AIState.CHASE && closestPlayer) {
        // Simple Chase Pathing (Move towards player)
        const dx = closestPlayer.x - creature.x;
        const dy = closestPlayer.y - creature.y;
        if (Math.abs(dx) > Math.abs(dy)) {
          chosenDir = dx > 0 ? "right" : "left";
        } else {
          chosenDir = dy > 0 ? "down" : "up";
        }
      } else if (creature.aiState === AIState.FLEE && closestPlayer) {
        // Simple Flee Pathing (Move away from player)
        const dx = closestPlayer.x - creature.x;
        const dy = closestPlayer.y - creature.y;
        if (Math.abs(dx) > Math.abs(dy)) {
          chosenDir = dx > 0 ? "left" : "right";
        } else {
          chosenDir = dy > 0 ? "up" : "down";
        }
      } else if (creature.aiState === AIState.ATTACK) {
        // Emit an attack event
        this.engine.events.emit("creatureAoEAttack", {
          attackerId: creature.entityId,
          mapId: creature.mapId,
          x: creature.x,
          y: creature.y,
          radius: 3,
          damage: 15
        });

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

      // 3. Movement Execution
      if (chosenDir) {
        if (chosenDir === "up") nextY -= 1;
        else if (chosenDir === "down") nextY += 1;
        else if (chosenDir === "left") nextX -= 1;
        else if (chosenDir === "right") nextX += 1;

        if (
          this.worldManager.isWalkable(creature.mapId, nextX, nextY) &&
          !this.worldManager.isOccupied(creature.mapId, nextX, nextY)
        ) {
          this.worldManager.moveEntity(creature.mapId, creature.x, creature.y, nextX, nextY, entityId);
          creature.x = nextX;
          creature.y = nextY;
          creature.direction = chosenDir;
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
        } else {
          creature.direction = chosenDir; // Turn to face blocked path
          creature.lastMoveTime = now;
          this.dirtyEntities.add(entityId);
        }
      }
    }
  }

  private tickCombatAI(dt: number) {
    // Legacy high-frequency logic. Moved to 1Hz aiTick for performance.
  }

  private broadcastDeltas() {
    if (this.dirtyEntities.size === 0) return;

    const useBinary = process.env.MMO_BINARY_MOVEMENT !== "0";

    for (const entityId of this.dirtyEntities) {
      const creature = this.creatures.get(entityId);
      if (!creature) continue;

      const delta = {
        entityId: creature.entityId,
        x: creature.x,
        y: creature.y,
        direction: creature.direction,
        isMoving: creature.isMoving,
        hp: creature.hp,
        maxHp: creature.maxHp,
        ownerId: creature.ownerId ?? "",
        behavior: creature.behavior ?? "",
      };

      // Broadcast only to AOI zones around the creature (players in those rooms)
      const rooms = InterestManager.roomsForPosition(creature.mapId, creature.x, creature.y);
      this.engine.events.emit("networkBroadcast", {
        rooms,
        event: "creature_moved",
        data: useBinary ? Buffer.from(encodeCreatureMoved(delta)) : delta,
      });
    }

    this.dirtyEntities.clear();
  }
}
