export interface PlayerLocationSnapshot {
  characterId: string;
  mapId: string;
  position: { x: number; y: number; z?: number };
}

/** Persist the current position without sending the rest of the character save. */
export function savePlayerLocationSnapshot(
  snapshot: PlayerLocationSnapshot,
  keepalive = false,
): void {
  if (typeof window === 'undefined' || !snapshot.characterId || !snapshot.mapId) return;
  const position = snapshot.position;
  if (!Number.isFinite(position?.x) || !Number.isFinite(position?.y)) return;

  const payload = JSON.stringify({ ...snapshot, timestamp: Date.now() });
  if (keepalive && typeof navigator.sendBeacon === 'function') {
    const body = new Blob([payload], { type: 'application/json' });
    if (navigator.sendBeacon('/api/character/location', body)) return;
  }

  void fetch('/api/character/location', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive,
  }).catch((error) => {
    console.warn('[PlayerLocation] Location checkpoint failed:', error);
  });
}
