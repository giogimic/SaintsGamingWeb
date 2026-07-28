// lib/game/TuxemonDb.ts

let _dbCache: any = null;
let _fetchPromise: Promise<any> | null = null;

export async function getTuxemonDb() {
  if (_dbCache) return _dbCache;
  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = fetch('/data/tuxemon_db.json')
    .then(res => res.json())
    .then(data => {
      _dbCache = data;
      return data;
    })
    .catch(err => {
      console.error('Failed to load Tuxemon DB:', err);
      return { monster: {}, encounter: {}, shape: {}, technique: {} };
    });

  return _fetchPromise;
}

export async function resolveEncounter(encounterZone: string) {
  const db = await getTuxemonDb();
  const zone = db.encounter?.[encounterZone];
  if (!zone || !zone.monsters || zone.monsters.length === 0) {
    return null;
  }

  // Roll based on encounter_rate weights (simplified)
  // For now, just pick a random monster from the list uniformly
  const entry = zone.monsters[Math.floor(Math.random() * zone.monsters.length)];
  return {
    speciesId: entry.monster,
    minLevel: entry.level_range[0],
    maxLevel: entry.level_range[1]
  };
}
