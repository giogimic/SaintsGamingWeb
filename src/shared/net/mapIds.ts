/**
 * Map definition vs shard/instance helpers.
 * Public shards look like `SAINTS_VILLAGE_ch1`; private like `BASE_<accountId>`;
 * Studio PIE like `studio_pie_<userId>`.
 */

/** Strip shard / channel / instance suffix so peers compare on the same logical map. */
export function toBaseMapId(mapOrInstanceId: string): string {
  if (!mapOrInstanceId) return mapOrInstanceId;
  const channel = mapOrInstanceId.match(/^(.*)_ch\d+$/);
  if (channel?.[1]) return channel[1];
  const instMatch = mapOrInstanceId.match(/^(.*)_inst_.*$/);
  if (instMatch?.[1]) return instMatch[1];
  return mapOrInstanceId;
}

export function isSameBaseMap(a: string, b: string): boolean {
  return toBaseMapId(a) === toBaseMapId(b);
}

/**
 * Public multiplayer channel: `MAPID_chN` only (never private / PIE / dungeon rooms).
 */
export function isPublicChannelInstanceId(instanceId: string | null | undefined): boolean {
  if (!instanceId) return false;
  return /_ch\d+$/.test(instanceId);
}

/** Studio Play-In-Editor room (`studio_pie_{userId}`). */
export function isStudioPieInstanceId(instanceId: string | null | undefined): boolean {
  if (!instanceId) return false;
  return instanceId.startsWith("studio_pie_");
}

/** Instanced party dungeon room (`dungeon_{slug}_{partyId}_{ts}` or `{map}_inst_{id}`). */
export function isDungeonInstanceId(instanceId: string | null | undefined): boolean {
  if (!instanceId) return false;
  return instanceId.startsWith("dungeon_") || instanceId.includes("_inst_");
}

/**
 * Party followers may only force-join the leader onto a **public** channel shard
 * of the same base map — never a leftover private/PIE instance.
 */
export function canPartyForceJoinInstance(
  leaderInstanceId: string,
  requestedBaseMapId: string
): boolean {
  if (!isPublicChannelInstanceId(leaderInstanceId)) return false;
  return isSameBaseMap(leaderInstanceId, requestedBaseMapId);
}

export type PublicShardCandidate = {
  instanceId: string;
  mapId: string;
  playerCount: number;
};

export type PublicShardPick =
  | { action: "join"; instanceId: string }
  | { action: "create"; instanceId: string; shardNum: number };

/**
 * Choose which public `_chN` room a lobby join should use.
 * Ignores private (`MAP_user`) and PIE (`studio_pie_*`) instances even when
 * their `mapId` matches the base definition (the P2 multiplayer bug).
 */
export function pickPublicShardAssignment(
  baseMapId: string,
  instances: PublicShardCandidate[],
  maxPlayersPerShard: number
): PublicShardPick {
  let maxShardNum = 0;
  let available: PublicShardCandidate | undefined;

  for (const inst of instances) {
    if (inst.mapId !== baseMapId || !isPublicChannelInstanceId(inst.instanceId)) {
      continue;
    }
    const match = inst.instanceId.match(/_ch(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxShardNum) maxShardNum = n;
    }
    if (!available && inst.playerCount < maxPlayersPerShard) {
      available = inst;
    }
  }

  if (available) {
    return { action: "join", instanceId: available.instanceId };
  }
  const shardNum = maxShardNum + 1;
  return {
    action: "create",
    instanceId: `${baseMapId}_ch${shardNum}`,
    shardNum,
  };
}
