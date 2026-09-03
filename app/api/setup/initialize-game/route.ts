import { NextResponse } from 'next/server';
import { prisma } from '@/web/lib/prisma';
import { auth } from '@/auth';
import { getSystemSetupStatus, SETUP_SETTING_KEYS } from '@/shared/game/setup/setupDetection';
import { generateDefaultWorldDoc, type VoxelWorldDocV3 } from '@/shared/game/voxel/VoxelWorldDoc';
import { DEFAULT_STUDIO_TILESETS, DEFAULT_STUDIO_GROUND_GID } from '@/shared/game/studioTilesetBootstrap';
import { notifyGoMapSynced } from '@/server/goMmoNotify';
import { DEFAULT_STARTER_HERO_PRESETS } from '@/shared/game/starterHeroCatalog';
import { DEFAULT_PLAYABLE_CLASSES } from '@/shared/game/classCatalog';
import { classDataToDb } from '@/shared/game/classDefMap';

export const dynamic = 'force-dynamic';

export interface InitializeGamePayload {
  game: {
    name: string;
    description?: string;
    genre?: string;
    style?: string;
    camera?: string;
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
    spawnPoint: { x: number; y: number; z?: number };
    voxelDoc?: VoxelWorldDocV3;
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

    // 1. Validate Game Identity
    const gameName = body?.game?.name?.trim();
    if (!gameName) {
      return NextResponse.json({ error: 'Game Name is required' }, { status: 400 });
    }
    const gameDesc = body?.game?.description?.trim() || `${gameName} - Created with Saints Studio`;
    const gameGenre = body?.game?.genre?.trim() || 'CREATURE_MMO';
    const gameStyle = body?.game?.style?.trim() || 'SAINTS_HYBRID';
    const gameCamera = body?.game?.camera?.trim() || 'ISOMETRIC_25D';
    const blockSizePx = Number(body?.game?.defaultBlockSizePx || body?.environment?.defaultBlockSizePx || 64);

    // 2. Validate Characters (Minimum 1 Required)
    if (!Array.isArray(body?.characters) || body.characters.length === 0) {
      return NextResponse.json({ error: 'At least one player character is required' }, { status: 400 });
    }

    // 3. Build Starting 3D Voxel World Document
    const map = body?.startingMap || ({} as any);
    const mapId = map.id?.trim() || 'STARTING_MEADOW';
    const mapName = map.name?.trim() || 'Starting Realm';
    const widthChunks = Math.max(1, map.widthChunks || Math.ceil((map.width || 32) / 16));
    const depthChunks = Math.max(1, map.depthChunks || Math.ceil((map.height || 32) / 16));
    const mapWidth = widthChunks * 16;
    const mapHeight = depthChunks * 16;
    const spawnX = typeof map.spawnPoint?.x === 'number' ? map.spawnPoint.x : Math.floor(mapWidth / 2);
    const spawnY = typeof map.spawnPoint?.y === 'number' ? map.spawnPoint.y : Math.floor(mapHeight / 2);

    let voxelDoc: VoxelWorldDocV3;
    if (map.voxelDoc && map.voxelDoc.formatVersion === 3) {
      voxelDoc = map.voxelDoc;
    } else {
      voxelDoc = generateDefaultWorldDoc(widthChunks, depthChunks, blockSizePx);
      voxelDoc.id = mapId;
      voxelDoc.name = mapName;
    }

    const serializedVoxelDoc = JSON.stringify(voxelDoc);

    const userGates = Array.isArray(map.gates) && map.gates.length > 0
      ? map.gates.map((g: any, idx: number) => ({
          id: g.id?.trim() || (idx === 0 ? 'spawn' : `gate_${idx}`),
          name: g.name?.trim() || (idx === 0 ? 'Player Spawn' : `Gateway ${idx}`),
          category: g.category || (idx === 0 ? 'SPAWN' : 'WARP'),
          position: {
            x: typeof g.position?.x === 'number' ? g.position.x : spawnX,
            y: typeof g.position?.y === 'number' ? g.position.y : spawnY,
            z: typeof g.position?.z === 'number' ? g.position.z : 16,
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
            position: { x: spawnX, y: spawnY, z: 16 },
          },
        ];

    const gatesPayload = {
      spawnPoint: { x: spawnX, y: spawnY },
      gates: userGates,
    };

    // 4. Atomic Transaction Persistence
    await prisma.$transaction(async (tx) => {
      // 4a. Update / Create GameConfig
      const gameConfig = await tx.gameConfig.upsert({
        where: { slug: 'saints' },
        create: {
          slug: 'saints',
          name: gameName,
          description: gameDesc,
          isActive: true,
          combatFormula: gameStyle === 'TURN_BASED' ? 'turn-based' : 'saints-standard',
        },
        update: {
          name: gameName,
          description: gameDesc,
          isActive: true,
          combatFormula: gameStyle === 'TURN_BASED' ? 'turn-based' : 'saints-standard',
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

      // 4c. Upsert Starter Heroes
      const charList = (Array.isArray(body.characters) && body.characters.length > 0)
        ? body.characters
        : DEFAULT_STARTER_HERO_PRESETS;

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
            startingMap: mapId,
            startingX: spawnX,
            startingY: spawnY,
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
            startingMap: mapId,
            startingX: spawnX,
            startingY: spawnY,
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
      const initialLogicGrid = Array.from({ length: mapHeight }, () => Array(mapWidth).fill(0));
      const initialTileLayers = [
        {
          name: 'Ground',
          grid: Array.from({ length: mapHeight }, () => Array(mapWidth).fill(DEFAULT_STUDIO_GROUND_GID || 17)),
        },
      ];

      await tx.worldMap.upsert({
        where: { id: mapId },
        create: {
          id: mapId,
          gameId: 'saints',
          name: mapName,
          gridData: JSON.stringify(initialLogicGrid),
          gatesData: JSON.stringify(gatesPayload),
          npcsData: JSON.stringify([]),
          encountersData: JSON.stringify([]),
          entitiesData: JSON.stringify([]),
          tileLayersData: JSON.stringify(initialTileLayers),
          freeformLayersData: JSON.stringify([
            {
              id: 'voxel_world_doc',
              name: 'Voxel World Model',
              type: 'voxel',
              voxelDoc: voxelDoc,
            },
          ]),
          tilesetsData: JSON.stringify(DEFAULT_STUDIO_TILESETS),
          version: 1,
        },
        update: {
          name: mapName,
          gameId: 'saints',
          gatesData: JSON.stringify(gatesPayload),
          gridData: JSON.stringify(initialLogicGrid),
          tileLayersData: JSON.stringify(initialTileLayers),
          freeformLayersData: JSON.stringify([
            {
              id: 'voxel_world_doc',
              name: 'Voxel World Model',
              type: 'voxel',
              voxelDoc: voxelDoc,
            },
          ]),
          tilesetsData: JSON.stringify(DEFAULT_STUDIO_TILESETS),
          version: { increment: 1 },
        },
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
          npcs: JSON.stringify([]),
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
    });

    // 5. Notify Go MMO realtime server of new starting voxel map
    void notifyGoMapSynced({
      id: mapId,
      name: mapName,
      gridData: voxelDoc,
      npcsData: [],
      tileLayersData: [],
      tilesetsData: [],
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      gameName,
      defaultMapId: mapId,
      message: `3D Voxel Game '${gameName}' initialized successfully!`,
      targetUrl: '/lobby',
    });
  } catch (error: any) {
    console.error('[api/setup/initialize-game] Initialization failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize game' },
      { status: 500 }
    );
  }
}
