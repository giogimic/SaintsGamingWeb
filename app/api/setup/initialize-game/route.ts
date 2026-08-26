import { NextResponse } from 'next/server';
import { prisma } from '@/web/lib/prisma';
import { auth } from '@/auth';
import { getSystemSetupStatus, SETUP_SETTING_KEYS } from '@/shared/game/setup/setupDetection';
import { buildDefaultGroundLayer, DEFAULT_STUDIO_TILESETS } from '@/shared/game/studioTilesetBootstrap';
import { notifyGoMapSynced } from '@/server/goMmoNotify';

export const dynamic = 'force-dynamic';

export interface InitializeGamePayload {
  game: {
    name: string;
    description?: string;
    genre?: string;
    style?: string;
    camera?: string;
  };
  characters: Array<{
    slug: string;
    name: string;
    classId: string;
    assetProfileId: string;
    assetBundleId?: string | null;
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
    defaultGroundGid: number;
  };
  startingMap: {
    id: string;
    name: string;
    width: number;
    height: number;
    grid: number[][];
    tileLayers?: Array<{ name: string; grid: number[][] }>;
    spawnPoint: { x: number; y: number };
    tilesetAsset?: any;
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

    // 2. Validate Characters (Minimum 1 Required)
    if (!Array.isArray(body?.characters) || body.characters.length === 0) {
      return NextResponse.json({ error: 'At least one player character is required' }, { status: 400 });
    }

    for (const char of body.characters) {
      if (!char.name?.trim() || !char.slug?.trim() || !char.assetProfileId?.trim()) {
        return NextResponse.json(
          { error: `Invalid character configuration for '${char.name || 'Unnamed'}'` },
          { status: 400 }
        );
      }
      const asset = await prisma.gameAsset.findUnique({ where: { id: char.assetProfileId } });
      if (!asset) {
        return NextResponse.json(
          { error: `Strict Validation Failed: Canonical Asset ID '${char.assetProfileId}' not found in library.` },
          { status: 400 }
        );
      }
    }

    // Validate Creatures
    if (Array.isArray(body.creatures)) {
      for (const c of body.creatures) {
        if (!c.slug?.trim() || !c.name?.trim() || !c.spriteOverworld?.trim()) continue;
        const asset = await prisma.gameAsset.findUnique({ where: { id: c.spriteOverworld } });
        if (!asset) {
          return NextResponse.json(
            { error: `Strict Validation Failed: Canonical Asset ID '${c.spriteOverworld}' not found for creature '${c.name}'.` },
            { status: 400 }
          );
        }
      }
    }

    // 3. Validate Starting Map & Spawn
    const map = body?.startingMap;
    if (!map || !map.id?.trim() || !map.name?.trim()) {
      return NextResponse.json({ error: 'Starting map definition is required' }, { status: 400 });
    }

    const mapId = map.id.trim().toUpperCase().replace(/\s+/g, '_');
    const mapWidth = Math.max(8, Math.min(128, map.width || 24));
    const mapHeight = Math.max(8, Math.min(128, map.height || 24));

    const spawnX = typeof map.spawnPoint?.x === 'number' ? Math.floor(map.spawnPoint.x) : Math.floor(mapWidth / 2);
    const spawnY = typeof map.spawnPoint?.y === 'number' ? Math.floor(map.spawnPoint.y) : Math.floor(mapHeight / 2);

    if (spawnX < 0 || spawnX >= mapWidth || spawnY < 0 || spawnY >= mapHeight) {
      return NextResponse.json(
        { error: `Player spawn point (${spawnX}, ${spawnY}) must be inside map bounds (${mapWidth}x${mapHeight})` },
        { status: 400 }
      );
    }

    const defaultGid = Number.isFinite(body?.environment?.defaultGroundGid)
      ? body.environment.defaultGroundGid
      : 17;

    // Build or sanitize grid and visual tile layers
    const logicGrid = Array.isArray(map.grid) && map.grid.length === mapHeight
      ? map.grid
      : Array.from({ length: mapHeight }, (_, r) =>
          Array.from({ length: mapWidth }, (_, c) =>
            r === 0 || r === mapHeight - 1 || c === 0 || c === mapWidth - 1 ? 1 : 0
          )
        );

    const tileLayers = Array.isArray(map.tileLayers) && map.tileLayers.length > 0
      ? map.tileLayers
      : [buildDefaultGroundLayer(logicGrid, defaultGid)];

    const gatesPayload = {
      spawnPoint: { x: spawnX, y: spawnY },
      gates: [
        {
          id: 'spawn',
          name: 'Player Spawn',
          category: 'SPAWN',
          position: { x: spawnX, y: spawnY },
        },
      ],
    };

    // 4. Atomic Transaction Persistence
    await prisma.$transaction(async (tx) => {
      // 4a. Update / Create GameConfig
      await tx.gameConfig.upsert({
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

      // 4b. Upsert Starter Heroes
      for (let i = 0; i < body.characters.length; i++) {
        const char = body.characters[i];
        await tx.starterHero.upsert({
          where: { slug: char.slug },
          create: {
            slug: char.slug,
            gameId: 'saints',
            name: char.name.trim(),
            classId: char.classId || 'WARRIOR',
            assetProfileId: char.assetProfileId,
            assetBundleId: char.assetBundleId || null,
            flavor: char.flavor?.trim() || `${char.name} the ${char.classId || 'Adventurer'}`,
            tag: char.tag || (i === 0 ? 'Primary' : 'Hero'),
            tagColor: char.tagColor || '#38bdf8',
            sortOrder: i + 1,
            isActive: true,
            startingMap: mapId,
            startingX: spawnX,
            startingY: spawnY,
            startingInventory: '{"capture_script":10,"patch_kit":5}',
          },
          update: {
            name: char.name.trim(),
            classId: char.classId || 'WARRIOR',
            assetProfileId: char.assetProfileId,
            assetBundleId: char.assetBundleId || null,
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

      const tilesetsDataPayload = map.tilesetAsset
        ? [
            {
              firstgid: 1,
              imageSource: map.tilesetAsset.source,
              columns: Math.floor(640 / (Number(map.tilesetAsset.metadata?.tilewidth) || 32)),
              tilewidth: Number(map.tilesetAsset.metadata?.tilewidth || 32),
              tileheight: Number(map.tilesetAsset.metadata?.tileheight || 32),
            },
          ]
        : DEFAULT_STUDIO_TILESETS;

      // 4d. Upsert Starting WorldMap & GameMap
      await tx.worldMap.upsert({
        where: { id: mapId },
        create: {
          id: mapId,
          gameId: 'saints',
          name: map.name.trim(),
          gridData: JSON.stringify(logicGrid),
          gatesData: JSON.stringify(gatesPayload),
          npcsData: JSON.stringify([]),
          encountersData: JSON.stringify([]),
          entitiesData: JSON.stringify([]),
          tileLayersData: JSON.stringify(tileLayers),
          tilesetsData: JSON.stringify(tilesetsDataPayload),
          version: 1,
        },
        update: {
          name: map.name.trim(),
          gameId: 'saints',
          gridData: JSON.stringify(logicGrid),
          gatesData: JSON.stringify(gatesPayload),
          tileLayersData: JSON.stringify(tileLayers),
          tilesetsData: JSON.stringify(tilesetsDataPayload),
          version: { increment: 1 },
        },
      });

      await tx.gameMap.upsert({
        where: { id: mapId },
        create: {
          id: mapId,
          name: map.name.trim(),
          width: mapWidth,
          height: mapHeight,
          tilesetData: JSON.stringify(logicGrid),
          gates: JSON.stringify(gatesPayload),
          npcs: JSON.stringify([]),
          encounters: JSON.stringify([]),
        },
        update: {
          name: map.name.trim(),
          width: mapWidth,
          height: mapHeight,
          tilesetData: JSON.stringify(logicGrid),
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
        { key: SETUP_SETTING_KEYS.DEFAULT_GROUND_GID, value: String(defaultGid) },
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

    // 5. Notify Go MMO realtime server of new starting map
    void notifyGoMapSynced({
      id: mapId,
      name: map.name.trim(),
      gridData: logicGrid,
      npcsData: [],
      tileLayersData: tileLayers,
      tilesetsData: DEFAULT_STUDIO_TILESETS,
    });

    return NextResponse.json({
      success: true,
      gameName,
      defaultMapId: mapId,
      message: `Game '${gameName}' initialized successfully!`,
      targetUrl: '/studio',
    });
  } catch (error: any) {
    console.error('[api/setup/initialize-game] Initialization failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize game' },
      { status: 500 }
    );
  }
}
