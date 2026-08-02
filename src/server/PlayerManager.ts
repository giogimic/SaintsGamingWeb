import { GameEngine } from "./GameEngine";
import { WorldManager } from "./WorldManager";
import { PlayerInput } from "./types";
import { DatabasePersistenceManager } from "./PersistenceManager";
import { isSameBaseMap } from "@/shared/net/mapIds";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export interface PlayerState {
  entityId: string;
  accountId: string;
  socketId: string; // Temporarily kept for frontend socket mapping
  name: string;
  spriteId: string;
  mapId: string;
  x: number;
  y: number;
  zoneX: number;
  zoneY: number;
  direction: "up" | "down" | "left" | "right";
  isMoving: boolean;
  lastMoveTime: number;
  hp: number;
  maxHp: number;
  isLocked: boolean;
}

const DIRECTION_DELTA: Record<string, { dx: number, dy: number }> = {
  up:    { dx:  0, dy: -1 },
  down:  { dx:  0, dy:  1 },
  left:  { dx: -1, dy:  0 },
  right: { dx:  1, dy:  0 },
};

const MOVE_COOLDOWN_MS = 150;

import { PartyManager } from "./PartyManager";
import { InterestManager } from "./net/InterestManager";
import { encodePlayerMoved } from "@/shared/net/movementCodec";

export class PlayerManager {
  private players = new Map<string, PlayerState>(); 
  private inputQueues = new Map<string, PlayerInput[]>();
  private dirtyEntities = new Set<string>(); // Entities that changed this tick

  constructor(private engine: GameEngine, private worldManager: WorldManager, private partyManager?: PartyManager) {
    this.engine.events.on("clientJoinRequest", (data) => this.handleClientJoin(data));
    this.engine.events.on("playerInput", (data) => this.queueInput(data));
    this.engine.events.on("playerDisconnected", (data) => this.handleDisconnect(data));
    this.engine.events.on("playerDamaged", (data) => this.handlePlayerDamaged(data));
    this.engine.events.on("creatureAoEAttack", (data) => this.handleCreatureAoEAttack(data));
    this.engine.events.on("processInputs", () => this.processInputs());
    this.engine.events.on("broadcastDeltas", () => this.broadcastDeltas());
    this.engine.events.on("lockPlayerMovement", (accountId) => this.setPlayerLock(accountId, true));
    this.engine.events.on("unlockPlayerMovement", (accountId) => this.setPlayerLock(accountId, false));
    
    // Phase 8: Data requests from other managers
    this.engine.events.on("requestPlayersInMap", ({ mapId, callback }) => {
      callback(this.getPlayersInMap(mapId));
    });

    // Phase 5: Periodic Database Flushing (Hot to Cold State)
    setInterval(() => this.flushPlayerPositions(), 60000);
  }

  private persistence = new DatabasePersistenceManager();

  private async flushPlayerPositions() {
    for (const player of this.players.values()) {
      await this.persistence.savePlayerPosition(player.accountId, player.mapId, player.x, player.y);
    }
  }

  private setPlayerLock(accountId: string, isLocked: boolean) {
    const player = Array.from(this.players.values()).find(p => p.accountId === accountId);
    if (player) {
      player.isLocked = isLocked;
      // Clear queue if locked
      if (isLocked) {
        this.inputQueues.set(player.entityId, []);
      }
    }
  }

  public getPlayerCount(): number {
    return this.players.size;
  }

  // --- Phase 9: Economy Helpers ---
  public getPlayerByAccountId(accountId: string): PlayerState | undefined {
    // Find player by accountId
    for (const player of this.players.values()) {
      if (player.accountId === accountId) return player;
    }
    return undefined;
  }

  public hasItem(accountId: string, itemId: string, amount: number = 1): boolean {
    const player = this.getPlayerByAccountId(accountId);
    if (!player) return false;
    // We don't have inventory on PlayerState right now!
    return false;
  }

  public async removeItem(accountId: string, itemId: string, amount: number = 1): Promise<boolean> {
    return false;
  }

  public async addItem(accountId: string, itemId: string, amount: number = 1): Promise<boolean> {
    return false;
  }

  public async addCredits(accountId: string, amount: number): Promise<boolean> {
    return false;
  }

  public async removeCredits(accountId: string, amount: number): Promise<boolean> {
    return false;
  }

  public getPlayer(entityId: string): PlayerState | undefined {
    return this.players.get(entityId);
  }

  public getPlayersInMap(mapId?: string): PlayerState[] {
    if (!mapId) return Array.from(this.players.values());
    return Array.from(this.players.values()).filter(p => p.mapId === mapId);
  }

  private async handleClientJoin({ accountId, socketId, data }: any) {
    // Clean up existing player entities for this socket or account to prevent duplicate entities
    for (const [existingId, existingPlayer] of Array.from(this.players.entries())) {
      if (existingPlayer.socketId === socketId || (accountId && existingPlayer.accountId === accountId)) {
        this.worldManager.removeEntity(existingPlayer.mapId, existingPlayer.x, existingPlayer.y, existingId);
        this.worldManager.leaveInstance(existingPlayer.mapId, existingPlayer.accountId);
        this.players.delete(existingId);
        this.inputQueues.delete(existingId);
        this.engine.events.emit("leaveRoom", { socketId: existingPlayer.socketId, room: existingPlayer.mapId });
      }
    }

    // Generate entity ID
    const entityId = `player_${accountId}_${Date.now()}`;
    // Ensure map definition is loaded
    await this.worldManager.loadMap(data.mapId);
    
    // Check if it's a private instance request
    const isPrivate = data.mapId === 'BASE' || data.isPrivate === true;
    
    // Phase 8: Shard Syncing (Party Lock Rule)
    let instanceId: string | undefined;
    
    if (this.partyManager) {
      const leaderId = this.partyManager.getPartyLeader(accountId);
      if (leaderId && leaderId !== accountId) {
        // Find if the leader is online and on the exact same base map
        // We need to iterate over this.players to find the leader
        const leader = Array.from(this.players.values()).find(p => p.accountId === leaderId);
        if (leader && leader.mapId.startsWith(data.mapId)) {
          // Force join the leader's exact instance!
          const joined = this.worldManager.forceJoinInstance(leader.mapId, accountId);
          if (joined) instanceId = leader.mapId;
        }
      }
    }

    if (!instanceId) {
      // Use dynamic sharding to get an instance
      const instance = this.worldManager.joinMap(data.mapId, accountId, isPrivate);
      instanceId = instance.instanceId;
    }

    const startX = data.x || 6;
    const startY = data.y || 2;
    const startZone = InterestManager.zoneOf(startX, startY);

    const player: PlayerState = {
      entityId,
      accountId,
      socketId,
      name: data.name || "Tamer",
      spriteId: data.spriteId || "adventurer",
      mapId: instanceId, // We store instanceId in mapId field for simplicity in v1
      x: startX,
      y: startY,
      zoneX: startZone.zx,
      zoneY: startZone.zy,
      direction: "down",
      isMoving: false,
      lastMoveTime: 0,
      hp: 100,
      maxHp: 100,
      isLocked: false
    };

    // Phase 5: DB Hydration — restore coords only when the saved base map
    // matches this join. Never overwrite the live instanceId with a stale
    // map id (that put players in different rooms and hid multiplayer).
    const savedPos = await this.persistence.loadPlayerPosition(accountId);
    if (savedPos) {
      if (isSameBaseMap(String(savedPos.mapId || ""), String(data.mapId || ""))) {
        player.x = savedPos.x;
        player.y = savedPos.y;
        const z = InterestManager.zoneOf(player.x, player.y);
        player.zoneX = z.zx;
        player.zoneY = z.zy;
      }
    }

    this.players.set(entityId, player);
    this.inputQueues.set(entityId, []);
    this.worldManager.addEntity(player.mapId, player.x, player.y, entityId);

    // Join map room (chat / map events) + AOI zone room (interest management)
    this.engine.events.emit("joinRoom", { socketId, room: player.mapId });
    this.engine.events.emit("joinRoom", {
      socketId,
      room: InterestManager.roomKey(player.mapId, player.zoneX, player.zoneY),
    });

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
        mapId: data.mapId
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

    // Coarse website-bus event only — never include position/combat ticks
    this.engine.events.emit("ecosystemBroadcast", {
      type: "game.player.online",
      payload: {
        userId: accountId,
        characterName: player.name,
        mapId: data.mapId || "world",
        playerCount: this.players.size,
      },
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

    // Leave socket rooms (map + AOI)
    this.engine.events.emit("networkBroadcast", {
      room: player.mapId,
      event: "player_left",
      data: player.socketId
    });
    this.engine.events.emit("leaveRoom", { socketId: player.socketId, room: player.mapId });
    this.engine.events.emit("leaveRoom", {
      socketId: player.socketId,
      room: InterestManager.roomKey(player.mapId, player.zoneX, player.zoneY),
    });
    
    // Teleport to SAINTS_VILLAGE coordinate X: 10, Y: 15
    const safeMapId = "SAINTS_VILLAGE";
    const safeInstance = this.worldManager.joinMap(safeMapId, player.accountId, false);
    
    player.mapId = safeInstance.instanceId;
    player.x = 10;
    player.y = 15;
    const safeZone = InterestManager.zoneOf(player.x, player.y);
    player.zoneX = safeZone.zx;
    player.zoneY = safeZone.zy;
    player.direction = "down";
    player.isMoving = false;
    this.dirtyEntities.add(player.entityId);

    // Add to new spatial grid
    this.worldManager.addEntity(player.mapId, player.x, player.y, player.entityId);
    
    // Join new socket rooms
    this.engine.events.emit("joinRoom", { socketId: player.socketId, room: player.mapId });
    this.engine.events.emit("joinRoom", {
      socketId: player.socketId,
      room: InterestManager.roomKey(player.mapId, player.zoneX, player.zoneY),
    });

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
      if (player.isLocked) continue;

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
            this.syncPlayerAoiRoom(player);
            
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

  /** Keep socket subscribed to the AOI zone that contains the player. */
  private syncPlayerAoiRoom(player: PlayerState) {
    const { zx, zy } = InterestManager.zoneOf(player.x, player.y);
    if (zx === player.zoneX && zy === player.zoneY) return;

    this.engine.events.emit("leaveRoom", {
      socketId: player.socketId,
      room: InterestManager.roomKey(player.mapId, player.zoneX, player.zoneY),
    });
    player.zoneX = zx;
    player.zoneY = zy;
    this.engine.events.emit("joinRoom", {
      socketId: player.socketId,
      room: InterestManager.roomKey(player.mapId, player.zoneX, player.zoneY),
    });
  }

  private broadcastDeltas() {
    if (this.dirtyEntities.size === 0) return;

    const useBinary = process.env.MMO_BINARY_MOVEMENT !== "0";

    for (const entityId of this.dirtyEntities) {
      const player = this.players.get(entityId);
      if (!player) continue;

      const delta = {
        socketId: player.socketId,
        entityId: player.entityId,
        x: player.x,
        y: player.y,
        direction: player.direction,
        isMoving: player.isMoving,
        hp: player.hp,
        maxHp: player.maxHp,
        name: player.name,
        spriteId: player.spriteId,
      };

      // Interest management: only nearby AOI zones (not the entire map shard)
      const rooms = InterestManager.neighborRooms(player.mapId, player.zoneX, player.zoneY);
      this.engine.events.emit("networkBroadcast", {
        rooms,
        event: "player_moved",
        data: useBinary ? Buffer.from(encodePlayerMoved(delta)) : delta,
      });
    }

    this.dirtyEntities.clear();
  }

  private async handleDisconnect({ accountId, socketId }: { accountId: string, socketId: string }) {
    const player = Array.from(this.players.values()).find(p => p.socketId === socketId);
    if (player) {
      // Phase 5: Emergency Flush on Disconnect
      await this.persistence.savePlayerPosition(player.accountId, player.mapId, player.x, player.y);
      
      this.worldManager.removeEntity(player.mapId, player.x, player.y, player.entityId);
      this.worldManager.leaveInstance(player.mapId, accountId);
      this.engine.events.emit("leaveRoom", {
        socketId: player.socketId,
        room: InterestManager.roomKey(player.mapId, player.zoneX, player.zoneY),
      });
      this.players.delete(player.entityId);
      this.inputQueues.delete(player.entityId);
      this.engine.events.emit("networkBroadcast", {
        room: player.mapId,
        event: "player_left",
        data: { socketId }
      });

      // Coarse website-bus leave — no coordinates or combat data
      this.engine.events.emit("ecosystemBroadcast", {
        type: "game.player.offline",
        payload: {
          userId: accountId,
          playerCount: this.players.size,
        },
      });
    }
  }
}
