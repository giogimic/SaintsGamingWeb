/**
 * Map definition vs shard/instance helpers.
 * Public shards look like `SAINTS_VILLAGE_ch1`; private like `BASE_<accountId>`;
 * Studio PIE like `studio_pie_<userId>`.
 */

/** Strip shard / channel suffix so peers compare on the same logical map. */
export function toBaseMapId(mapOrInstanceId: string): string {
  if (!mapOrInstanceId) return mapOrInstanceId;
  const channel = mapOrInstanceId.match(/^(.*)_ch\d+$/);
  if (channel?.[1]) return channel[1];
  return mapOrInstanceId;
}

export function isSameBaseMap(a: string, b: string): boolean {
  return toBaseMapId(a) === toBaseMapId(b);
}

/** Public multiplayer channel: `MAPID_chN` only (never private / PIE rooms). */
export function isPublicChannelInstanceId(instanceId: string | null | undefined): boolean {
  if (!instanceId) return false;
  return /_ch\d+$/.test(instanceId);
}

/** Studio Play-In-Editor room (`studio_pie_{userId}`). */
export function isStudioPieInstanceId(instanceId: string | null | undefined): boolean {
  if (!instanceId) return false;
  return instanceId.startsWith("studio_pie_");
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
