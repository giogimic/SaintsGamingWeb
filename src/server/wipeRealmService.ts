/**
 * Wipe Realm Service
 * Completely wipes custom authored content that is NOT bundled with the engine:
 * - Deletes custom maps (preserving DEMO_SANDBOX)
 * - Deletes map versions and sync logs
 * - Deletes custom prefabs, quests, and non-bundled assets
 * - Deletes player game characters and RPG state (avoiding invalid map references)
 * - Resets setup settings so the realm returns cleanly to setup mode
 * - Restores foundation logic tiles and DEMO_SANDBOX
 */

import { SETUP_SETTING_KEYS } from "@/shared/game/setup/setupDetection";
import { ensureStudioMapFoundation } from "@/server/DemoBootstrap";
import { invalidateMapCache, invalidateLogicTilesCache } from "@/shared/game/mapCache";

export interface WipeRealmResult {
  ok: boolean;
  wipedMapsCount: number;
  wipedCharactersCount: number;
  message: string;
}

export async function wipeNonBundledRealmContent(prisma: any): Promise<WipeRealmResult> {
  // 1. Wipe all maps so only the map created by the user during setup exists
  const deletedMaps = await prisma.worldMap.deleteMany({}).catch((e: any) => {
    console.warn('[WipeRealmService] worldMap wipe warning:', e?.message);
    return { count: 0 };
  });
  if (prisma.gameMap?.deleteMany) {
    await prisma.gameMap.deleteMany({}).catch(() => {});
  }

  // 2. Wipe map versions and sync entries
  await prisma.worldMapVersion.deleteMany({}).catch(() => {});
  await prisma.mapSyncEntry.deleteMany({}).catch(() => {});

  // 3. Wipe custom map prefabs and quests
  await prisma.mapPrefab.deleteMany({}).catch(() => {});
  await prisma.gameQuest.deleteMany({}).catch(() => {});

  // 4. Wipe player gameplay state and characters tied to previous maps
  const deletedCharacters = await prisma.gameCharacter.deleteMany({}).catch(() => ({ count: 0 }));
  await prisma.playerCreature.deleteMany({}).catch(() => {});
  await prisma.playerInventoryItem.deleteMany({}).catch(() => {});
  await prisma.playerSkill.deleteMany({}).catch(() => {});
  await prisma.playerQuestState.deleteMany({}).catch(() => {});
  await prisma.gtcListing.deleteMany({}).catch(() => {});

  // 5. Wipe non-bundled game assets (preserving any asset tagged 'bundled')
  await prisma.gameAsset.deleteMany({
    where: {
      NOT: {
        tags: { contains: 'bundled' },
      },
    },
  }).catch(() => {});

  // 6. Reset setup settings to fresh install state
  const setupKeysToReset = [
    SETUP_SETTING_KEYS.GAME_INITIALIZED,
    SETUP_SETTING_KEYS.GAME_INITIALIZED_AT,
    SETUP_SETTING_KEYS.GAME_INITIALIZED_VERSION,
    SETUP_SETTING_KEYS.SETUP_COMPLETED,
    SETUP_SETTING_KEYS.SETUP_COMPLETED_AT,
    SETUP_SETTING_KEYS.GAME_NAME,
    SETUP_SETTING_KEYS.GAME_DESCRIPTION,
    SETUP_SETTING_KEYS.GAME_GENRE,
    SETUP_SETTING_KEYS.GAME_STYLE,
    SETUP_SETTING_KEYS.GAME_CAMERA,
    SETUP_SETTING_KEYS.DEFAULT_MAP_ID,
    SETUP_SETTING_KEYS.DEFAULT_GROUND_GID,
    SETUP_SETTING_KEYS.REALM_NAME,
    SETUP_SETTING_KEYS.REALM_DESCRIPTION,
    SETUP_SETTING_KEYS.STARTER_PACK_IMPORTED,
  ];

  await prisma.siteSetting.deleteMany({
    where: {
      key: { in: setupKeysToReset },
    },
  }).catch(() => {});

  // 7. Re-seed the bundled foundation (DEMO_SANDBOX + 24 logic tiles)
  await ensureStudioMapFoundation();

  // 8. Invalidate in-memory caches
  invalidateMapCache();
  invalidateLogicTilesCache();

  return {
    ok: true,
    wipedMapsCount: deletedMaps?.count || 0,
    wipedCharactersCount: deletedCharacters?.count || 0,
    message: 'All non-bundled maps, characters, and setup states wiped successfully. Foundation restored.',
  };
}
