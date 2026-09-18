import { NextResponse } from 'next/server';
import { prisma } from '@/web/lib/prisma';
import { auth } from '@/auth';
import { getSystemSetupStatus, SETUP_SETTING_KEYS } from '@/shared/game/setup/setupDetection';
import { DEFAULT_STUDIO_TILESETS, DEFAULT_STUDIO_GROUND_GID } from '@/shared/game/studioTilesetBootstrap';
import { MapSyncService } from '@/server/mapSyncService';
import { DEFAULT_PLAYABLE_CLASSES } from '@/shared/game/classCatalog';
import { classDataToDb } from '@/shared/game/classDefMap';
import { DEMO_LOGIC_TILES } from '@/shared/game/setup/logicTilesSeed';
import { bootstrapDynamicStarterContent } from '@/server/starterContentBootstrap';
import { SetupLogger } from '@/server/diagnostics/SetupLogger';

export const dynamic = 'force-dynamic';

export interface InitializeGamePayload {
  initializationId?: string;
  bootstrapRevisionId?: string;
  game: {
    name: string;
    description?: string;
    genre?: string;
    style?: string;
    defaultCameraMode?: string;
    defaultBlockSizePx?: number;
  };
  characters: Array<{
    slug: string;
    name: string;
    classId: string;
    assetProfileId?: string;
    spriteKey?: string;
    spriteBundleId?: string | null;
    flavor?: string;
    tag?: string;
    tagColor?: string;
  }>;
  creatures?: Array<{
    slug: string;
    name: string;
    typePrimary: string;
    typeSecondary?: string;
    spriteOverworld: string;
    spriteBattle?: string;
    baseHp?: number;
    physicalPower?: number;
    physicalDefense?: number;
    abilityPower?: number;
    abilityDefense?: number;
    flavor?: string;
  }>;
  environment: {
    defaultGroundGid?: number;
    defaultBlockSizePx?: number;
    foundationMaterial?: string;
    atmospherePreset?: string;
  };
  startingMap: {
    id: string;
    name: string;
    widthChunks?: number;
    depthChunks?: number;
    heightChunks?: number;
    width?: number;
    height?: number;
    blockSizePx?: number;
    foundationMaterial?: string;
    mapType?: 'TILE' | 'VOXEL' | 'FRACTAL';
    spawnPoint: { x: number; y: number; z?: number };
    grid?: number[][];
    tileLayers?: Array<{ name: string; grid: number[][] }>;
    tilesetAsset?: any;
    gates?: Array<{
      id: string;
      name: string;
      category?: string;
      position: { x: number; y: number; z?: number };
      targetMapId?: string;
      targetPosition?: { x: number; y: number; z?: number };
      interactPrompt?: string;
    }>;
  };
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 });
    }

    const status = await getSystemSetupStatus(prisma);
    const user = session?.user as any;
    const isAdmin = user && (user.permissionLevel >= 80 || user.role === 'ADMIN');
    const allowed = status.userCount === 0 || isAdmin || (status.isFreshInstall && status.userCount <= 1);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin privileges required to initialize game' },
        { status: 403 }
      );
    }

    const body: InitializeGamePayload = await req.json();
    const initializationId = body.initializationId || 'init_unknown';
    const logger = new SetupLogger(initializationId);

    // 1. Validate Game Identity
    const gameName = body?.game?.name?.trim();
    if (!gameName) {
      return NextResponse.json({ error: 'Game Name is required' }, { status: 400 });
    }
    const gameDesc = body?.game?.description?.trim() || `${gameName} - Created with Saints Studio`;
    const gameGenre = body?.game?.genre?.trim() || 'CREATURE_MMO';
    const gameStyle = body?.game?.style?.trim() || 'SAINTS_HYBRID';
    const gameCamera = body?.game?.defaultCameraMode?.trim() || 'DYNAMIC';
    const blockSizePx = Number(body?.game?.defaultBlockSizePx || body?.environment?.defaultBlockSizePx || 64);

    // 2. Validate Characters (Minimum 1 Required)
    const dbHeroesCount = await prisma.starterHero.count({
      where: { isActive: true }
    });
    if ((!Array.isArray(body?.characters) || body.characters.length === 0) && dbHeroesCount === 0) {
      return NextResponse.json({ error: 'At least one playable character (Archetype) is required' }, { status: 400 });
    }

    // 3. Build Starting 3D Voxel World Document
    const map = body?.startingMap || ({} as any);
    const mapId = map.id?.trim() || 'STARTING_MEADOW';
    const mapName = map.name?.trim() || 'Starting Realm';
    const widthChunks = Math.max(1, map.widthChunks || Math.ceil((map.width || 32) / 32));
    const depthChunks = Math.max(1, map.depthChunks || Math.ceil((map.height || 32) / 32));
    const mapWidth = widthChunks * 32;
    const mapHeight = depthChunks * 32;
    const spawnX = typeof map.spawnPoint?.x === 'number' ? map.spawnPoint.x : Math.floor(mapWidth / 2);
    const spawnY = typeof map.spawnPoint?.y === 'number' ? map.spawnPoint.y : Math.floor(mapHeight / 2);

    if (!body.bootstrapRevisionId) {
      return NextResponse.json({ error: 'Missing bootstrapRevisionId' }, { status: 400 });
    }

    // 3. Resolve Bootstrap Revision
    logger.log({ stageName: '08. Validate Bootstrap', stageCode: 'validate_bootstrap', status: 'RUNNING', message: 'Validating bootstrap revision' });
    const revision = await prisma.worldBootstrapRevision.findUnique({
      where: { id: body.bootstrapRevisionId },
      include: { regions: true }
    });

    if (!revision || revision.status !== 'COMPLETED') {
      logger.log({ stageName: '08. Validate Bootstrap', stageCode: 'validate_bootstrap', status: 'FAILED', message: 'Invalid or incomplete bootstrap revision' });
      return NextResponse.json({ error: 'Invalid or incomplete bootstrap revision', events: logger.getEvents() }, { status: 400 });
    }
    logger.log({ stageName: '08. Validate Bootstrap', stageCode: 'validate_bootstrap', status: 'COMPLETED', message: 'Bootstrap revision valid' });

    logger.log({ stageName: '09. Compile WorldRelease', stageCode: 'compile_release', status: 'SKIPPED', message: 'Setup bypasses explicit release compilation (direct deployment)' });
    logger.log({ stageName: '10. Publish Release', stageCode: 'publish_release', status: 'SKIPPED', message: 'Implicitly published via atomic transaction' });
    logger.log({ stageName: '11. Deploy Release', stageCode: 'deploy_release', status: 'RUNNING', message: 'Deploying working world directly to database' });

    // Attempt to load the active WorldRelease to get the true spawn point
    let finalSpawnMapId = mapId;
    let finalSpawnX = spawnX;
    let finalSpawnY = spawnY;
    let finalSpawnZ = 16;
    
    const activeProject = await prisma.worldProject.findUnique({
      where: { slug: 'saints' }
    });
    if (activeProject?.activeVersion) {
      const activeVersionStr = `v1.0.${activeProject.activeVersion}`;
      const release = await prisma.worldRelease.findUnique({
        where: { projectId_version: { projectId: 'saints', version: activeVersionStr } }
      });
      if (release) {
        try {
          const manifest = JSON.parse(release.manifestData);
          if (manifest.world) {
            finalSpawnMapId = manifest.world.spawnMap || finalSpawnMapId;
            finalSpawnX = typeof manifest.world.spawnX === 'number' ? manifest.world.spawnX : finalSpawnX;
            finalSpawnY = typeof manifest.world.spawnY === 'number' ? manifest.world.spawnY : finalSpawnY;
            finalSpawnZ = typeof manifest.world.spawnZ === 'number' ? manifest.world.spawnZ : finalSpawnZ;
          }
        } catch (e) {
          console.error("Failed to parse release manifest for spawn extraction", e);
        }
      }
    }

    const userGates = Array.isArray(map.gates) && map.gates.length > 0
      ? map.gates.map((g: any, idx: number) => ({
          id: g.id?.trim() || (idx === 0 ? 'spawn' : `gate_${idx}`),
          name: g.name?.trim() || (idx === 0 ? 'Player Spawn' : `Gateway ${idx}`),
          category: g.category || (idx === 0 ? 'SPAWN' : 'WARP'),
          position: {
            x: typeof g.position?.x === 'number' ? g.position.x : finalSpawnX,
            y: typeof g.position?.y === 'number' ? g.position.y : finalSpawnY,
            z: typeof g.position?.z === 'number' ? g.position.z : finalSpawnZ,
          },
          targetMapId: g.targetMapId?.trim() || undefined,
          targetPosition: g.targetPosition || undefined,
          interactPrompt: g.interactPrompt?.trim() || undefined,
        }))
      : [
          {
            id: 'spawn',
            name: 'Player Spawn',
            category: 'SPAWN',
            position: { x: finalSpawnX, y: finalSpawnY, z: finalSpawnZ },
          },
        ];

    const gatesPayload = {
      spawnPoint: { x: finalSpawnX, y: finalSpawnY, z: finalSpawnZ },
      gates: userGates,
    };

    // 4. Atomic Transaction Persistence
    const resolvedVersion = await prisma.$transaction(async (tx) => {
      // 4a. Update / Create GameConfig
      const gameConfig = await tx.gameConfig.upsert({
        where: { slug: 'saints' },
        create: {
          slug: 'saints',
          name: gameName,
          description: gameDesc,
          isActive: true,
          combatFormula: gameStyle === 'TURN_BASED' ? 'turn-based' : 'saints-standard',
          defaultSpawnGateId: 'spawn',
        },
        update: {
          name: gameName,
          description: gameDesc,
          isActive: true,
          combatFormula: gameStyle === 'TURN_BASED' ? 'turn-based' : 'saints-standard',
          defaultSpawnGateId: 'spawn',
        },
      });

      // 4a2. Upsert WorldProject
      const worldProject = await tx.worldProject.upsert({
        where: { slug: 'saints' },
        create: {
          slug: 'saints',
          gameId: gameConfig.id,
          name: gameName,
          description: gameDesc,
        },
        update: {
          name: gameName,
          description: gameDesc,
          gameId: gameConfig.id,
        },
      });

      // 4b. Seed Character Classes
      for (const classDef of DEFAULT_PLAYABLE_CLASSES) {
        const payload = classDataToDb(classDef, gameConfig.id);
        await tx.characterClass.upsert({
          where: { gameId_slug: { gameId: gameConfig.id, slug: classDef.slug } },
          create: payload,
          update: payload,
        });
      }

      // 4c. Upsert Starter Heroes (only if explicitly provided during setup — no hardcoded defaults)
      const charList = (Array.isArray(body.characters) && body.characters.length > 0)
        ? body.characters
        : [];

      for (let i = 0; i < charList.length; i++) {
        const char = charList[i];
        const assetProfileId = char.assetProfileId || (char as any).spriteKey || 'evil-berserker-bloodaxe-male';
        const heroSlug = char.slug || `hero_${i + 1}`;
        await tx.starterHero.upsert({
          where: { slug: heroSlug },
          create: {
            slug: heroSlug,
            gameId: 'saints',
            name: char.name.trim(),
            classId: char.classId || 'WARRIOR',
            assetProfileId,
            assetBundleId: (char as any).spriteBundleId || (char as any).assetBundleId || null,
            flavor: char.flavor?.trim() || `${char.name} the ${char.classId || 'Adventurer'}`,
            tag: char.tag || (i === 0 ? 'Primary' : 'Hero'),
            tagColor: char.tagColor || '#38bdf8',
            sortOrder: i + 1,
            isActive: true,
            startingMap: finalSpawnMapId,
            startingX: finalSpawnX,
            startingY: finalSpawnY,
            startingInventory: (char as any).startingInventory || '{"patch_kit":5}',
          },
          update: {
            name: char.name.trim(),
            classId: char.classId || 'WARRIOR',
            assetProfileId,
            assetBundleId: (char as any).spriteBundleId || (char as any).assetBundleId || null,
            flavor: char.flavor?.trim() || `${char.name} the ${char.classId || 'Adventurer'}`,
            tag: char.tag || (i === 0 ? 'Primary' : 'Hero'),
            tagColor: char.tagColor || '#38bdf8',
            sortOrder: i + 1,
            isActive: true,
            startingMap: finalSpawnMapId,
            startingX: finalSpawnX,
            startingY: finalSpawnY,
          },
        });
      }

      // 4c. Upsert Creatures (if any provided)
      if (Array.isArray(body.creatures)) {
        for (let i = 0; i < body.creatures.length; i++) {
          const c = body.creatures[i];
          if (!c.slug?.trim() || !c.name?.trim()) continue;
          await tx.creatureDef.upsert({
            where: { slug: c.slug },
            create: {
              slug: c.slug,
              gameId: 'saints',
              name: c.name.trim(),
              dexNumber: i + 1,
              typePrimary: c.typePrimary || 'Solar',
              typeSecondary: c.typeSecondary || 'None',
              spriteOverworld: c.spriteOverworld || 'monster/battle/agnite-sheet',
              spriteBattle: c.spriteBattle || null,
              baseHp: c.baseHp || 100,
              physicalPower: c.physicalPower || 12,
              physicalDefense: c.physicalDefense || 10,
              abilityPower: c.abilityPower || 10,
              abilityDefense: c.abilityDefense || 10,
              combatTempo: 100,
              catchRate: 1.0,
              starterLevel: 5,
              flavor: c.flavor || `A wild companion in ${gameName}`,
              isStarter: i === 0,
              isWildSpawn: true,
              isActive: true,
              sortOrder: i + 1,
            },
            update: {
              name: c.name.trim(),
              typePrimary: c.typePrimary || 'Solar',
              typeSecondary: c.typeSecondary || 'None',
              spriteOverworld: c.spriteOverworld || 'monster/battle/agnite-sheet',
              spriteBattle: c.spriteBattle || null,
              baseHp: c.baseHp || 100,
              physicalPower: c.physicalPower || 12,
              physicalDefense: c.physicalDefense || 10,
              abilityPower: c.abilityPower || 10,
              abilityDefense: c.abilityDefense || 10,
              flavor: c.flavor || `A wild companion in ${gameName}`,
              isStarter: i === 0,
              isWildSpawn: true,
              isActive: true,
            },
          });
        }
      }

      // 4d. Upsert Starting WorldMap & GameMap
      const is3D = map.mapType === 'VOXEL' || map.mapType === 'FRACTAL';
      const initialLogicGrid = is3D ? [] : Array.from({ length: mapHeight }, () => Array(mapWidth).fill(0));
      const initialTileLayers = is3D ? [] : [
        {
          name: 'Ground',
          grid: Array.from({ length: mapHeight }, () => Array(mapWidth).fill(DEFAULT_STUDIO_GROUND_GID || 17)),
        },
      ];

      const existingWorld = await tx.worldMap.findUnique({
        where: { id: mapId }
      });

      let nextVersion = 1;

      if (existingWorld) {
        nextVersion = existingWorld.version + 1;
      }

      const upsertedWorldMap = await tx.worldMap.upsert({
        where: { id: mapId },
        create: {
          id: mapId,
          projectId: worldProject.id,
          name: mapName,
          gridData: JSON.stringify(initialLogicGrid),
          gatesData: JSON.stringify(gatesPayload),
          encountersData: JSON.stringify([]),
          entitiesData: JSON.stringify([]),
          freeformLayersData: JSON.stringify([]),
          version: 1,
          mapType: map.mapType || 'VOXEL',
        },
        update: {
          name: mapName,
          projectId: worldProject.id,
          gatesData: JSON.stringify(gatesPayload),
          gridData: JSON.stringify(initialLogicGrid),
          freeformLayersData: JSON.stringify([]),
          version: { increment: 1 },
          mapType: map.mapType || 'VOXEL',
        }
      });

      await tx.gameMap.upsert({
        where: { id: mapId },
        create: {
          id: mapId,
          name: mapName,
          width: mapWidth,
          height: mapHeight,
          tilesetData: JSON.stringify(initialLogicGrid),
          gates: JSON.stringify(gatesPayload),
          encounters: JSON.stringify([]),
        },
        update: {
          name: mapName,
          width: mapWidth,
          height: mapHeight,
          tilesetData: JSON.stringify(initialLogicGrid),
          gates: JSON.stringify(gatesPayload),
        },
      });

      // 4d2. Setup Parity (Section 19): Adopt the Procedural Generation Pipeline
      // The Setup Route must use the same underlying systems as Studio.
      // We take the artifacts generated by the Setup Worker and map them into the Working World Atlas.
      if (revision?.regions && revision.regions.length > 0) {
        for (const r of revision.regions) {
          await tx.worldRegion.upsert({
            where: {
              mapId_regionX_regionZ: {
                mapId: mapId,
                regionX: r.regionX,
                regionZ: r.regionZ,
              },
            },
            create: {
              mapId: mapId,
              regionX: r.regionX,
              regionZ: r.regionZ,
              status: 'COMPLETED',
              artifactChecksum: r.artifactChecksum,
            },
            update: {
              status: 'COMPLETED',
              artifactChecksum: r.artifactChecksum,
            },
          });
        }
      }

      // 4e. Upsert Durable Game Settings
      const settingsToUpsert = [
        { key: SETUP_SETTING_KEYS.GAME_INITIALIZED, value: 'true' },
        { key: SETUP_SETTING_KEYS.GAME_INITIALIZED_AT, value: new Date().toISOString() },
        { key: SETUP_SETTING_KEYS.GAME_NAME, value: gameName },
        { key: SETUP_SETTING_KEYS.GAME_DESCRIPTION, value: gameDesc },
        { key: SETUP_SETTING_KEYS.GAME_GENRE, value: gameGenre },
        { key: SETUP_SETTING_KEYS.GAME_STYLE, value: gameStyle },
        { key: SETUP_SETTING_KEYS.GAME_CAMERA, value: gameCamera },
        { key: SETUP_SETTING_KEYS.DEFAULT_MAP_ID, value: mapId },
        { key: 'DEFAULT_SPAWN_X', value: String(spawnX) },
        { key: 'DEFAULT_SPAWN_Y', value: String(spawnY) },
        { key: 'DEFAULT_SPAWN_Z', value: String(map.spawnPoint?.z ?? 16) },
        { key: 'DEFAULT_BLOCK_SIZE_PX', value: String(blockSizePx) },
        // Legacy keys for backward compatibility
        { key: SETUP_SETTING_KEYS.SETUP_COMPLETED, value: 'true' },
        { key: SETUP_SETTING_KEYS.SETUP_COMPLETED_AT, value: new Date().toISOString() },
        { key: SETUP_SETTING_KEYS.REALM_NAME, value: gameName },
        { key: SETUP_SETTING_KEYS.REALM_DESCRIPTION, value: gameDesc },
      ];

      for (const item of settingsToUpsert) {
        await tx.siteSetting.upsert({
          where: { key: item.key },
          create: { key: item.key, value: item.value },
          update: { value: item.value },
        });
      }

      // 4f. Seed essential logic tiles for Studio brush palette
      for (const tile of DEMO_LOGIC_TILES) {
        await tx.mapLogicTile.upsert({
          where: { id: tile.id },
          create: {
            id: tile.id,
            name: tile.name,
            color: tile.color,
            isSolid: tile.isSolid,
            interactable: tile.interactable,
            onInteractAction: tile.onInteractAction,
            onInteractPayload: tile.onInteractPayload,
            onStepAction: tile.onStepAction,
            onStepPayload: tile.onStepPayload,
          },
          update: {
            name: tile.name,
            color: tile.color,
            isSolid: tile.isSolid,
            interactable: tile.interactable,
            onInteractAction: tile.onInteractAction,
            onInteractPayload: tile.onInteractPayload,
            onStepAction: tile.onStepAction,
            onStepPayload: tile.onStepPayload,
          },
        });
      }


      return nextVersion;
    });

    // 5. Seed Dynamic Starter Content (Abilities, Items, Mounts, Dungeons)
    await bootstrapDynamicStarterContent('saints', 'default');

    logger.log({ stageName: '09. Compile WorldRelease', stageCode: 'compile_release', status: 'RUNNING', message: 'Compiling monolithic release' });
    const { compileWorldRelease } = await import('@/app/actions/studio/compiler/WorldCompiler');
    const { releaseInfo } = await compileWorldRelease('saints', `${gameName} - Initial Release`, 'Auto-generated during initial setup.');
    
    // Demote old LIVE releases
    await prisma.worldRelease.updateMany({
      where: { projectId: 'saints', status: 'LIVE' },
      data: { status: 'PUBLISHED' }
    });
    // Set to LIVE
    await prisma.worldRelease.update({
      where: { id: releaseInfo.releaseId },
      data: { status: 'LIVE' }
    });
    logger.log({ stageName: '09. Compile WorldRelease', stageCode: 'compile_release', status: 'COMPLETED', message: 'Compiled monolithic release', metadata: { releaseId: releaseInfo.releaseId } });

    logger.log({ stageName: '11. Deploy Release', stageCode: 'deploy_release', status: 'COMPLETED', message: 'Deployment successful', metadata: { worldMapId: mapId } });

    logger.log({ stageName: '12. Notify Go Runtime', stageCode: 'notify_go', status: 'RUNNING', message: 'Notifying Go MMO' });
    // 6. Notify Go MMO realtime server of new starting voxel map
    await MapSyncService.enqueue({
      mapId,
      version: resolvedVersion,
      userId: 'system',
      eagerPush: true,
    });
    logger.log({ stageName: '12. Notify Go Runtime', stageCode: 'notify_go', status: 'COMPLETED', message: 'Go MMO notified via MapSyncService' });

    logger.log({ stageName: '13. Ready', stageCode: 'ready', status: 'COMPLETED', message: 'Initialization complete' });

    return NextResponse.json({
      success: true,
      gameName,
      defaultMapId: mapId,
      message: `3D Voxel Game '${gameName}' initialized successfully!`,
      targetUrl: '/lobby',
      events: logger.getEvents()
    });
  } catch (error: any) {
    console.error('[api/setup/initialize-game] Initialization failed:', error);
    // Use a logger if possible, but we don't have it in catch scope easily unless we hoisted it, but we did hoist it!
    // Wait, let's just return the error.
    return NextResponse.json(
      { error: error.message || 'Failed to initialize game', events: [] },
      { status: 500 }
    );
  }
}

