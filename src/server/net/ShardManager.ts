/**
 * Saints Gaming — Authoritative Shard Manager
 *
 * Manages map instances, dynamic shard allocation, player membership,
 * and instance lifecycle (ACTIVE / EMPTY / DRAINING).
 */

import {
  toBaseMapId,
  pickPublicShardAssignment,
  type PublicShardCandidate,
} from "../../shared/net/mapIds";
import type { ConnectedPlayer } from "./LobbySocketHandler";

export type ShardLifecycleState = "ACTIVE" | "DRAINING" | "EMPTY";

export interface ShardInstance {
  instanceId: string;
  baseMapId: string;
  isPublic: boolean;
  state: ShardLifecycleState;
  members: Set<string>; // socketIds
  createdAt: number;
  lastActiveAt: number;
}

export class ShardManager {
  private instances = new Map<string, ShardInstance>();
  private playerMap = new Map<string, ConnectedPlayer>(); // socketId -> ConnectedPlayer

  public resolveInstanceId(
    baseMapId: string,
    accountId: string,
    opts: { isLobby?: boolean; isPrivate?: boolean; pie?: boolean }
  ): string {
    if (opts.pie) {
      return `studio_pie_${accountId}`;
    }
    if (opts.isPrivate) {
      return `BASE_${accountId}`;
    }
    if (opts.isLobby) {
      const candidates: PublicShardCandidate[] = [];
      for (const inst of this.instances.values()) {
        if (inst.baseMapId === baseMapId && inst.isPublic && inst.state === "ACTIVE") {
          candidates.push({
            instanceId: inst.instanceId,
            mapId: baseMapId,
            playerCount: inst.members.size,
          });
        }
      }
      const pick = pickPublicShardAssignment(baseMapId, candidates, 50);
      return pick.instanceId;
    }
    return `${baseMapId}_ch1`;
  }

  public joinShard(player: ConnectedPlayer): {
    instance: ShardInstance;
    isNewInstance: boolean;
    previousInstanceId?: string;
  } {
    const existing = this.playerMap.get(player.socketId);
    let previousInstanceId: string | undefined;

    if (existing && existing.instanceId !== player.instanceId) {
      previousInstanceId = existing.instanceId;
      this.leaveShard(player.socketId, existing.instanceId);
    }

    let instance = this.instances.get(player.instanceId);
    let isNewInstance = false;

    if (!instance) {
      isNewInstance = true;
      instance = {
        instanceId: player.instanceId,
        baseMapId: player.mapId,
        isPublic: !player.instanceId.startsWith("studio_pie_") && !player.instanceId.startsWith("BASE_"),
        state: "ACTIVE",
        members: new Set<string>(),
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      };
      this.instances.set(player.instanceId, instance);
    }

    instance.members.add(player.socketId);
    instance.lastActiveAt = Date.now();
    instance.state = "ACTIVE";
    this.playerMap.set(player.socketId, player);

    return { instance, isNewInstance, previousInstanceId };
  }

  public leaveShard(socketId: string, instanceId?: string): {
    instanceId: string;
    wasLastMember: boolean;
    player?: ConnectedPlayer;
  } | null {
    const player = this.playerMap.get(socketId);
    const targetInstId = instanceId || player?.instanceId;
    if (!targetInstId) return null;

    const instance = this.instances.get(targetInstId);
    let wasLastMember = false;

    if (instance) {
      instance.members.delete(socketId);
      if (instance.members.size === 0) {
        wasLastMember = true;
        instance.state = "EMPTY";
        // Clean up private or inactive non-default instances
        if (!instance.isPublic) {
          this.instances.delete(targetInstId);
        }
      }
    }

    if (!instanceId || (player && player.instanceId === instanceId)) {
      this.playerMap.delete(socketId);
    }

    return { instanceId: targetInstId, wasLastMember, player };
  }

  public getPlayer(socketId: string): ConnectedPlayer | undefined {
    return this.playerMap.get(socketId);
  }

  public getPeersInShard(instanceId: string, excludeSocketId?: string): Record<string, ConnectedPlayer> {
    const peers: Record<string, ConnectedPlayer> = {};
    const instance = this.instances.get(instanceId);
    if (!instance) return peers;

    for (const memberId of instance.members) {
      if (memberId !== excludeSocketId) {
        const peer = this.playerMap.get(memberId);
        if (peer) {
          peers[memberId] = peer;
        }
      }
    }
    return peers;
  }

  public updatePlayerPosition(
    socketId: string,
    x: number,
    y: number,
    direction: string,
    moving: boolean
  ): ConnectedPlayer | null {
    const player = this.playerMap.get(socketId);
    if (!player) return null;
    player.x = x;
    player.y = y;
    player.direction = direction;
    player.moving = moving;
    return player;
  }

  public getAllActiveInstances(): ShardInstance[] {
    return Array.from(this.instances.values());
  }
}
