import { GameEngine } from "./GameEngine";
import { WorldManager } from "./WorldManager";
import { PlayerInput } from "./types";

export interface PlayerState {
  entityId: string;
  accountId: string;
  socketId: string; // Temporarily kept for frontend socket mapping
  name: string;
  spriteId: string;
  mapId: string;
  x: number;
  y: number;
  direction: "up" | "down" | "left" | "right";
  isMoving: boolean;
  lastMoveTime: number;
  hp: number;
  maxHp: number;
}

const DIRECTION_DELTA: Record<string, { dx: number, dy: number }> = {
  up:    { dx:  0, dy: -1 },
  down:  { dx:  0, dy:  1 },
  left:  { dx: -1, dy:  0 },
  right: { dx:  1, dy:  0 },
};

const MOVE_COOLDOWN_MS = 200;

export class PlayerManager {
  private players = new Map<string, PlayerState>(); 
  private inputQueues = new Map<string, PlayerInput[]>();
  private dirtyEntities = new Set<string>(); // Entities that changed this tick

  constructor(private engine: GameEngine, private worldManager: WorldManager) {
    this.engine.events.on("clientJoinRequest", (data) => this.handleClientJoin(data));
    this.engine.events.on("playerInput", (data) => this.queueInput(data));
    this.engine.events.on("playerDisconnected", (data) => this.handleDisconnect(data));
    this.engine.events.on("playerDamaged", (data) => this.handlePlayerDamaged(data));
    this.engine.events.on("creatureAoEAttack", (data) => this.handleCreatureAoEAttack(data));
    this.engine.events.on("processInputs", () => this.processInputs());
    this.engine.events.on("broadcastDeltas", () => this.broadcastDeltas());
  }

  private async handleClientJoin({ accountId, socketId, data }: any) {
    // Generate entity ID
    const entityId = `player_${accountId}_${Date.now()}`;
    // Ensure map definition is loaded
    await this.worldManager.loadMap(data.mapId);
    
    // Check if it's a private instance request
    const isPrivate = data.mapId === 'BASE' || data.isPrivate === true;
    
    // Use dynamic sharding to get an instance
    const instance = this.worldManager.joinMap(data.mapId, accountId, isPrivate);
    const instanceId = instance.instanceId;

    const player: PlayerState = {
      entityId,
      accountId,
      socketId,
      name: data.name || "Tamer",
      spriteId: data.spriteId || "adventurer",
      mapId: instanceId, // We store instanceId in mapId field for simplicity in v1
      x: data.x || 6,
      y: data.y || 2,
      direction: "down",
      isMoving: false,
      lastMoveTime: 0,
      hp: 100,
      maxHp: 100
    };

    this.players.set(entityId, player);
    this.inputQueues.set(entityId, []);
    this.worldManager.addEntity(player.mapId, player.x, player.y, entityId);

    // Join room
    this.engine.events.emit("joinRoom", { socketId, room: player.mapId });

    // Send full map state to the new player
    const mapPlayers: any = {};
    for (const p of this.players.values()) {
      if (p.mapId === player.mapId && p.entityId !== entityId) {
        mapPlayers[p.socketId] = {
           socketId: p.socketId,
           entityId: p.entityId,
           x: p.x, y: p.y, direction: p.direction, name: p.name, spriteId: p.spriteId, isMoving: p.isMoving
        };
      }
    }
    
    this.engine.events.emit("directMessage", { 
      socketId, 
      event: "map_players", 
      data: mapPlayers 
    });

    // Notify the client what shard they are in
    this.engine.events.emit("directMessage", {
      socketId,
      event: "map_joined",
      data: {
        instanceId: player.mapId,
        mapId: instance.mapId
      }
    });

    // Broadcast join to others
    this.engine.events.emit("networkBroadcast", {
      room: player.mapId,
      event: "player_joined",
      data: {
        socketId: player.socketId,
        entityId: player.entityId,
        x: player.x,
        y: player.y,
        direction: player.direction,
        name: player.name,
        spriteId: player.spriteId,
        isMoving: player.isMoving
      }
    });
  }

  private handleCreatureAoEAttack(data: { attackerId: string, mapId: string, x: number, y: number, radius: number, damage: number }) {
    for (const player of this.players.values()) {
      if (player.mapId === data.mapId) {
        const dx = player.x - data.x;
        const dy = player.y - data.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist <= data.radius) {
          this.handlePlayerDamaged({
            entityId: player.entityId,
            attackerId: data.attackerId,
            damage: data.damage
          });
        }
      }
    }
  }

  private handlePlayerDamaged(data: { entityId: string, attackerId: string, damage: number }) {
    const player = this.players.get(data.entityId);
    if (!player) return;

    player.hp = Math.max(0, player.hp - data.damage);
    this.dirtyEntities.add(player.entityId);
    console.log(`[PlayerManager] ${player.name} took ${data.damage} damage! HP: ${player.hp}/${player.maxHp}`);

    if (player.hp <= 0) {
      this.handlePlayerDefeated(player);
    }
  }

  private handlePlayerDefeated(player: PlayerState) {
    console.log(`[PlayerManager] ${player.name} was defeated! Teleporting to Safe Zone.`);
    
    // Restore HP
    player.hp = player.maxHp;
    
    // Remove from current instance spatial grid
    this.worldManager.removeEntity(player.mapId, player.x, player.y, player.entityId);
    this.worldManager.leaveInstance(player.mapId, player.accountId);

    // Leave socket room
    this.engine.events.emit("networkBroadcast", {
      room: player.mapId,
      event: "player_left",
      data: player.socketId
    });
    this.engine.events.emit("leaveRoom", { socketId: player.socketId, room: player.mapId });
    
    // Teleport to SAINTS_VILLAGE coordinate X: 10, Y: 15
    const safeMapId = "SAINTS_VILLAGE";
    const safeInstance = this.worldManager.joinMap(safeMapId, player.accountId, false);
    
    player.mapId = safeInstance.instanceId;
    player.x = 10;
    player.y = 15;
    player.direction = "down";
    player.isMoving = false;
    this.dirtyEntities.add(player.entityId);

    // Add to new spatial grid
    this.worldManager.addEntity(player.mapId, player.x, player.y, player.entityId);
    
    // Join new socket room
    this.engine.events.emit("joinRoom", { socketId: player.socketId, room: player.mapId });

    // Tell the client they were defeated and give new position
    this.engine.events.emit("directMessage", {
      socketId: player.socketId,
      event: "player_defeated",
      data: {
        instanceId: player.mapId,
        mapId: safeInstance.mapId,
        x: player.x,
        y: player.y
      }
    });

    // Send full map state to the reborn player
    const mapPlayers: any = {};
    for (const p of this.players.values()) {
      if (p.mapId === player.mapId && p.entityId !== player.entityId) {
        mapPlayers[p.socketId] = {
           socketId: p.socketId,
           entityId: p.entityId,
           x: p.x, y: p.y, direction: p.direction, name: p.name, spriteId: p.spriteId, isMoving: p.isMoving
        };
      }
    }
    
    this.engine.events.emit("directMessage", { 
      socketId: player.socketId, 
      event: "map_players", 
      data: mapPlayers 
    });

    // Broadcast join to others in safe zone
    this.engine.events.emit("networkBroadcast", {
      room: player.mapId,
      event: "player_joined",
      data: {
        socketId: player.socketId,
        entityId: player.entityId,
        x: player.x,
        y: player.y,
        direction: player.direction,
        name: player.name,
        spriteId: player.spriteId,
        isMoving: player.isMoving
      }
    });
  }

  private queueInput({ accountId, input }: { accountId: string, input: PlayerInput }) {
    let player = Array.from(this.players.values()).find(p => p.accountId === accountId);
    if (player) {
      const queue = this.inputQueues.get(player.entityId);
      if (queue && queue.length < 2) {
        queue.push(input);
      }
    }
  }

  private processInputs() {
    const now = Date.now();
    for (const [entityId, queue] of this.inputQueues.entries()) {
      if (queue.length === 0) continue;
      
      const player = this.players.get(entityId);
      if (!player) continue;

      if (now - player.lastMoveTime < MOVE_COOLDOWN_MS) continue;

      const input = queue.shift()!;
      if (input.type === "MOVE" && input.direction) {
        const delta = DIRECTION_DELTA[input.direction];
        if (delta) {
          const targetX = player.x + delta.dx;
          const targetY = player.y + delta.dy;

          const walkable = this.worldManager.isWalkable(player.mapId, targetX, targetY);
          const occupied = this.worldManager.isOccupied(player.mapId, targetX, targetY);

          if (walkable && !occupied) {
            this.worldManager.moveEntity(player.mapId, player.x, player.y, targetX, targetY, entityId);
            player.x = targetX;
            player.y = targetY;
            player.direction = input.direction;
            player.isMoving = true;
            player.lastMoveTime = now;
            this.dirtyEntities.add(entityId);
            
            this.engine.events.emit("directMessage", {
              socketId: player.socketId,
              event: "move_ack",
              data: { seq: input.sequence, x: player.x, y: player.y, direction: player.direction }
            });
            
            // Emit playerMoved to interrupt any ongoing channel/cast
            this.engine.events.emit("playerMoved", entityId);
          } else {
            // Collision
            player.direction = input.direction;
            this.dirtyEntities.add(entityId);
            this.engine.events.emit("directMessage", {
              socketId: player.socketId,
              event: "position_correction",
              data: { seq: input.sequence, x: player.x, y: player.y, direction: player.direction, reason: occupied ? "entity" : "wall" }
            });
          }
        }
      }
    }
    
    // Stop moving if idle
    for (const player of this.players.values()) {
      if (player.isMoving && now - player.lastMoveTime > 300) {
        player.isMoving = false;
        this.dirtyEntities.add(player.entityId);
      }
    }
  }

  private broadcastDeltas() {
    if (this.dirtyEntities.size === 0) return;

    const mapDeltas = new Map<string, any[]>();

    for (const entityId of this.dirtyEntities) {
      const player = this.players.get(entityId);
      if (player) {
        if (!mapDeltas.has(player.mapId)) {
          mapDeltas.set(player.mapId, []);
        }
        mapDeltas.get(player.mapId)!.push({
          socketId: player.socketId, 
          entityId: player.entityId,
          x: player.x,
          y: player.y,
          direction: player.direction,
          isMoving: player.isMoving,
          hp: player.hp,
          maxHp: player.maxHp
        });
      }
    }

    for (const [mapId, deltas] of mapDeltas.entries()) {
      for (const delta of deltas) {
         this.engine.events.emit("networkBroadcast", {
           room: mapId,
           event: "player_moved",
           data: delta
         });
      }
    }

    this.dirtyEntities.clear();
  }

  private handleDisconnect({ accountId, socketId }: any) {
    let player = Array.from(this.players.values()).find(p => p.accountId === accountId);
    if (player) {
      this.worldManager.removeEntity(player.mapId, player.x, player.y, player.entityId);
      this.worldManager.leaveInstance(player.mapId, player.accountId);
      this.players.delete(player.entityId);
      this.inputQueues.delete(player.entityId);
      
      this.engine.events.emit("networkBroadcast", {
        room: player.mapId,
        event: "player_left",
        data: socketId
      });
    }
  }
}
