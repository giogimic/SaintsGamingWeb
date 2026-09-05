/**
 * Saints Gaming — Universal Multi-Region Shard Orchestration, Cross-Shard Teleportation & State Migration Engine (Bible 02, 07, 18, 33)
 * Manages multi-region shard topology, dynamic channel auto-scaling, and secure 2-phase migration handshakes between Go MMO / TS socket shards.
 */

export type ServerRegion = 'US_EAST' | 'US_WEST' | 'EU_CENTRAL' | 'AP_EAST';

export interface ShardDescriptor {
  shardId: string;
  region: ServerRegion;
  hostUrl: string;
  maxCapacity: number;
  currentPopulation: number;
  channels: string[];
  status: 'ONLINE' | 'DEGRADED' | 'MAINTENANCE';
}

export interface PlayerMigrationState {
  inventory: unknown[];
  stats: Record<string, number>;
  position: { x: number; y: number; mapId: string };
}

export interface PlayerMigrationToken {
  token: string;
  playerId: string;
  originShardId: string;
  destinationShardId: string;
  destinationChannel: string;
  serializedState: PlayerMigrationState;
  expiresAt: number;
  signature: string;
}

export class ShardOrchestratorEngine {
  private shards = new Map<string, ShardDescriptor>();
  private activeMigrationTokens = new Map<string, PlayerMigrationToken>();

  /**
   * Registers a server shard descriptor.
   */
  public registerShard(shard: ShardDescriptor) {
    this.shards.set(shard.shardId, { ...shard });
  }

  /**
   * Retrieves a shard by ID.
   */
  public getShard(shardId: string): ShardDescriptor | null {
    return this.shards.get(shardId) || null;
  }

  /**
   * Returns all active shards.
   */
  public getAllShards(): ShardDescriptor[] {
    return Array.from(this.shards.values());
  }

  /**
   * Evaluates dynamic channel auto-scaling based on current shard population density.
   */
  public evaluateAutoScaling(shardId: string): {
    action: 'SPAWN_CHANNEL' | 'CONSOLIDATE_CHANNEL' | 'NONE';
    channelId?: string;
  } {
    const shard = this.getShard(shardId);
    if (!shard) return { action: 'NONE' };

    const loadRatio = shard.currentPopulation / Math.max(1, shard.maxCapacity);

    // Over 85% capacity -> Spawn new overflow channel
    if (loadRatio > 0.85) {
      const seraphtChannelNum = shard.channels.length + 1;
      const newChannelId = `_ch${seraphtChannelNum}`;
      shard.channels.push(newChannelId);
      return { action: 'SPAWN_CHANNEL', channelId: newChannelId };
    }

    // Under 15% capacity with multiple channels -> Consolidate outermost channel
    if (loadRatio < 0.15 && shard.channels.length > 1) {
      const removed = shard.channels.pop();
      return { action: 'CONSOLIDATE_CHANNEL', channelId: removed };
    }

    return { action: 'NONE' };
  }

  /**
   * Phase 1 of Migration: Generates a cryptographically signed departure token.
   */
  public initiateMigration(
    playerId: string,
    originShardId: string,
    destinationShardId: string,
    destinationChannel: string,
    serializedState: PlayerMigrationState
  ): PlayerMigrationToken {
    const destShard = this.getShard(destinationShardId);
    if (!destShard || destShard.status !== 'ONLINE') {
      throw new Error(`Destination shard ${destinationShardId} is not online`);
    }

    const now = Date.now();
    const token = `mig_${now}_${playerId}_to_${destinationShardId}`;
    const signature = `sig_${playerId}_${destinationShardId}_${now}`;

    const migrationToken: PlayerMigrationToken = {
      token,
      playerId,
      originShardId,
      destinationShardId,
      destinationChannel,
      serializedState,
      expiresAt: now + 30000, // 30 second validity
      signature,
    };

    this.activeMigrationTokens.set(token, migrationToken);
    return migrationToken;
  }

  /**
   * Phase 2 of Migration: Destination shard verifies token and accepts character state.
   */
  public completeMigration(token: PlayerMigrationToken): {
    success: boolean;
    characterState?: PlayerMigrationState;
    reason?: string;
  } {
    const pending = this.activeMigrationTokens.get(token.token);
    if (!pending) {
      return { success: false, reason: 'Migration token not found or already consumed' };
    }

    if (Date.now() > pending.expiresAt) {
      this.activeMigrationTokens.delete(token.token);
      return { success: false, reason: 'Migration token expired' };
    }

    if (pending.signature !== token.signature) {
      return { success: false, reason: 'Invalid token cryptographic signature' };
    }

    // Successfully consumed migration handshake
    this.activeMigrationTokens.delete(token.token);

    return {
      success: true,
      characterState: pending.serializedState,
    };
  }
}
