import { describe, expect, it } from 'vitest';
import { ShardDescriptor, ShardOrchestratorEngine } from './shardOrchestratorEngine';

describe('Universal Multi-Region Shard Orchestration & Cross-Shard Migration Engine (Phase 33)', () => {
  it('registers and indexes multi-region server shards', () => {
    const engine = new ShardOrchestratorEngine();

    const shardUS: ShardDescriptor = {
      shardId: 'shard_us_east_1',
      region: 'US_EAST',
      hostUrl: 'https://useast.saintsgaming.io',
      maxCapacity: 500,
      currentPopulation: 120,
      channels: ['_ch1', '_ch2'],
      status: 'ONLINE',
    };

    const shardEU: ShardDescriptor = {
      shardId: 'shard_eu_central_1',
      region: 'EU_CENTRAL',
      hostUrl: 'https://eucentral.saintsgaming.io',
      maxCapacity: 500,
      currentPopulation: 450,
      channels: ['_ch1'],
      status: 'ONLINE',
    };

    engine.registerShard(shardUS);
    engine.registerShard(shardEU);

    expect(engine.getAllShards()).toHaveLength(2);
    expect(engine.getShard('shard_us_east_1')?.region).toBe('US_EAST');
    expect(engine.getShard('shard_eu_central_1')?.region).toBe('EU_CENTRAL');
  });

  it('triggers dynamic channel auto-scaling based on population thresholds', () => {
    const engine = new ShardOrchestratorEngine();

    const shard: ShardDescriptor = {
      shardId: 'shard_us_west_1',
      region: 'US_WEST',
      hostUrl: 'https://uswest.saintsgaming.io',
      maxCapacity: 500,
      currentPopulation: 460, // 460/500 = 92% (>85%)
      channels: ['_ch1', '_ch2'],
      status: 'ONLINE',
    };

    engine.registerShard(shard);

    // 1. High capacity triggers SPAWN_CHANNEL
    const scaleUp = engine.evaluateAutoScaling('shard_us_west_1');
    expect(scaleUp.action).toBe('SPAWN_CHANNEL');
    expect(scaleUp.channelId).toBe('_ch3');
    expect(shard.channels).toContain('_ch3');

    // 2. Population drops to 40/500 (8% < 15%) triggers CONSOLIDATE_CHANNEL
    const targetShard = engine.getShard('shard_us_west_1')!;
    targetShard.currentPopulation = 40;
    const scaleDown = engine.evaluateAutoScaling('shard_us_west_1');
    expect(scaleDown.action).toBe('CONSOLIDATE_CHANNEL');
    expect(scaleDown.channelId).toBe('_ch3');
    expect(targetShard.channels).toHaveLength(2);
  });

  it('executes secure 2-phase cross-shard migration handshakes', () => {
    const engine = new ShardOrchestratorEngine();

    const originShard: ShardDescriptor = {
      shardId: 'shard_origin',
      region: 'US_EAST',
      hostUrl: 'https://origin.saints.io',
      maxCapacity: 500,
      currentPopulation: 200,
      channels: ['_ch1'],
      status: 'ONLINE',
    };

    const destShard: ShardDescriptor = {
      shardId: 'shard_dest',
      region: 'EU_CENTRAL',
      hostUrl: 'https://dest.saints.io',
      maxCapacity: 500,
      currentPopulation: 150,
      channels: ['_ch1'],
      status: 'ONLINE',
    };

    engine.registerShard(originShard);
    engine.registerShard(destShard);

    const characterState = {
      inventory: [{ itemId: 'dragon_scimitar', quantity: 1 }],
      stats: { hitpoints: 99, attack: 75 },
      position: { x: 100, y: 150, mapId: 'SAINTS_VILLAGE' },
    };

    // Phase 1: Initiate migration on origin
    const token = engine.initiateMigration(
      'player_saint_77',
      'shard_origin',
      'shard_dest',
      '_ch1',
      characterState
    );

    expect(token.token).toBeDefined();
    expect(token.signature).toBeDefined();

    // Phase 2: Complete migration on destination
    const completion = engine.completeMigration(token);
    expect(completion.success).toBe(true);
    expect(completion.characterState?.stats.hitpoints).toBe(99);

    // Replay attack / duplicate consume fails
    const replay = engine.completeMigration(token);
    expect(replay.success).toBe(false);
    expect(replay.reason).toContain('not found or already consumed');
  });
});
