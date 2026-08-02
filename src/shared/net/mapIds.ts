/**
 * Map definition vs shard/instance helpers.
 * Public shards look like `SAINTS_VILLAGE_ch1`; private like `BASE_<accountId>`.
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
