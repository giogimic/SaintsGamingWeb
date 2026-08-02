/**
 * Campaign map payloads no longer ship in the client/server app bundle.
 *
 * Source of truth: Prisma `WorldMap` table (lazy-loaded via `/api/maps/[slug]`
 * and `loadMap()` in `./maps.ts`).
 *
 * To (re)import the Tuxemon dump into the database:
 *   npx tsx scripts/migrate-campaign-maps-to-db.ts
 *
 * Generated dump (scripts only — do not import from app/):
 *   scripts/data/campaign-maps.generated.ts
 */

/** Empty stub — kept so accidental imports do not pull a 12MB module. */
export const creature_CAMPAIGN_MAPS: Record<string, never> = {};

/** @deprecated Use WorldMap DB / `/api/maps` instead. */
export const TUXEMON_CAMPAIGN_MAPS = creature_CAMPAIGN_MAPS;
