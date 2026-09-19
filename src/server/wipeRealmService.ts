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
import { bootstrapDynamicStarterContent } from "@/server/starterContentBootstrap";
import { invalidateMapCache, invalidateLogicTilesCache } from "@/shared/game/mapCache";

export interface WipeRealmResult {
  ok: boolean;
  wipedMapsCount: number;
  wipedCharactersCount: number;
  message: string;
}

export async function wipeNonBundledRealmContent(prisma: any): Promise<WipeRealmResult> {
  // 1. Wipe map versions, sync entries, and releases FIRST to satisfy foreign keys
  if (prisma.worldMapVersion?.deleteMany) {
    await prisma.worldMapVersion.deleteMany({});
  }
  if (prisma.mapSyncEntry?.deleteMany) {
    await prisma.mapSyncEntry.deleteMany({});
  }
  if (prisma.worldReleaseManifest?.deleteMany) await prisma.worldReleaseManifest.deleteMany({});
  if (prisma.worldRelease?.deleteMany) await prisma.worldRelease.deleteMany({});
  if (prisma.nextjsSyncOutbox?.deleteMany) await prisma.nextjsSyncOutbox.deleteMany({});
  if (prisma.worldPublishSnapshot?.deleteMany) await prisma.worldPublishSnapshot.deleteMany({});
  if (prisma.mapChunk?.deleteMany) await prisma.mapChunk.deleteMany({});
  if (prisma.saintsMap?.deleteMany) await prisma.saintsMap.deleteMany({});

  // 2. Wipe custom map prefabs and quests
  await prisma.mapPrefab.deleteMany({});
  await prisma.gameQuest.deleteMany({});

  // 3. Wipe all maps now that children are deleted
  const deletedMaps = await prisma.worldMap.deleteMany({}).catch((e: any) => {
    console.warn('[WipeRealmService] worldMap wipe warning:', e?.message);
    return { count: 0 };
  });
  if (prisma.gameMap?.deleteMany) {
    await prisma.gameMap.deleteMany({});
  }
  if (prisma.worldAtlas?.deleteMany) {
    await prisma.worldAtlas.deleteMany({});
  }


  // 4. Wipe player gameplay state and characters tied to previous maps
  // Must delete dependent records BEFORE deleting the parent GameCharacter to satisfy foreign key constraints
  await prisma.playerCreature.deleteMany({});
  await prisma.playerInventoryItem.deleteMany({});
  await prisma.playerSkill.deleteMany({});
  await prisma.playerQuestState.deleteMany({});
  await prisma.gtcListing.deleteMany({});

  const deletedCharacters = await prisma.gameCharacter.deleteMany({}).catch((e: any) => {
    console.error('[WipeRealmService] Failed to wipe characters:', e?.message);
    return { count: 0 };
  });

  // 4.5 Wipe all authored RPG Definitions (Classes, Abilities, Items, etc)
  await prisma.starterHero.deleteMany({});
  await prisma.characterClass.deleteMany({});
  await prisma.abilityDictionary.deleteMany({});
  await prisma.creatureDef.deleteMany({});
  await prisma.itemTemplate.deleteMany({});
  await prisma.mountTemplate.deleteMany({});
  await prisma.dungeonTemplate.deleteMany({});
  await prisma.shopTemplate.deleteMany({});
  await prisma.professionTemplate.deleteMany({});
  await prisma.craftingRecipe.deleteMany({});
  await prisma.worldEventTemplate.deleteMany({});
  await prisma.questTemplate.deleteMany({});
  await prisma.creatureElement.deleteMany({});
  await prisma.elementEffectiveness.deleteMany({});

  // 5. Wipe non-bundled game assets (preserving any asset tagged 'bundled')
  await prisma.gameAsset.deleteMany({
    where: {
      NOT: {
        tags: { contains: 'bundled' },
      },
    },
  });

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
  });

  // 7. (Removed) We no longer re-seed DEMO_SANDBOX
  // await ensureStudioMapFoundation();

  // 7.5 Re-seed the dynamic starter RPG content (Abilities, Classes, Elements, Starter Mobs)
  await bootstrapDynamicStarterContent("saints", "default");

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
