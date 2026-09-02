import { NextResponse } from 'next/server';
import { prisma } from '@/web/lib/prisma';
import { auth } from '@/auth';
import { getSystemSetupStatus, SETUP_SETTING_KEYS } from '@/shared/game/setup/setupDetection';
import { importStarterPackToDb, AVAILABLE_STARTER_PACKS } from '@/shared/game/setup/prepackagedPacks';
import { generateDefaultWorldDoc, type VoxelWorldDocV3 } from '@/shared/game/voxel/VoxelWorldDoc';
import { notifyGoMapSynced } from '@/server/goMmoNotify';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 });
    }

    const status = await getSystemSetupStatus(prisma);
    const user = session?.user as any;
    const isAdmin = user && (user.permissionLevel >= 80 || user.role === 'ADMIN');
    
    // Allow import if no users exist, or if user is admin, or if single user in fresh install
    const allowed = status.userCount === 0 || isAdmin || (status.isFreshInstall && status.userCount <= 1);
    if (!allowed) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required to import world packages' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    // Mode A: User uploaded custom .saints.json package
    if (body?.packageData || body?.maps || body?.format === 'saints-game-package') {
      const pkg = body.packageData || body;
      let importedMaps = 0;
      let importedHeroes = 0;
      let importedCreatures = 0;

      // 1. Import Maps & convert to VoxelWorldDocV3
      if (Array.isArray(pkg.maps)) {
        for (const m of pkg.maps) {
          const mapId = m.id || `map_${Date.now()}`;
          const mapName = m.name || 'Imported Realm';
          const width = Number(m.width) || 32;
          const height = Number(m.height) || 32;
          const spawnX = Number(m.spawnX ?? m.spawnPoint?.x ?? 16);
          const spawnY = Number(m.spawnY ?? m.spawnPoint?.y ?? 16);

          let voxelDoc: VoxelWorldDocV3 = m.voxelDoc;
          if (!voxelDoc || voxelDoc.formatVersion !== 3) {
            const widthChunks = Math.max(1, Math.ceil(width / 16));
            const depthChunks = Math.max(1, Math.ceil(height / 16));
            voxelDoc = generateDefaultWorldDoc(widthChunks, depthChunks, pkg.game?.defaultBlockSizePx || 64);
            voxelDoc.id = mapId;
            voxelDoc.name = mapName;
          }

          const serializedData = JSON.stringify(voxelDoc);
          const gatesPayload = {
            spawnPoint: { x: spawnX, y: spawnY },
            gates: [{ id: 'spawn', name: 'Spawn', category: 'SPAWN', position: { x: spawnX, y: spawnY } }],
          };

          await prisma.worldMap.upsert({
            where: { id: mapId },
            create: {
              id: mapId,
              name: mapName,
              gameId: 'saints',
              gridData: JSON.stringify([]),
              gatesData: JSON.stringify(gatesPayload),
              npcsData: JSON.stringify([]),
              encountersData: JSON.stringify([]),
              entitiesData: JSON.stringify([]),
              tileLayersData: serializedData,
              tilesetsData: JSON.stringify([]),
              version: 1,
            },
            update: {
              name: mapName,
              gameId: 'saints',
              gatesData: JSON.stringify(gatesPayload),
              tileLayersData: serializedData,
              version: { increment: 1 },
            },
          });

          await prisma.gameMap.upsert({
            where: { id: mapId },
            create: {
              id: mapId,
              name: mapName,
              width,
              height,
              tilesetData: serializedData,
              gates: JSON.stringify(gatesPayload),
              npcs: JSON.stringify([]),
              encounters: JSON.stringify([]),
            },
            update: {
              name: mapName,
              width,
              height,
              tilesetData: serializedData,
              gates: JSON.stringify(gatesPayload),
            },
          });

          await notifyGoMapSynced({
            id: mapId,
            name: mapName,
            gridData: voxelDoc,
            npcsData: [],
            tileLayersData: [],
            tilesetsData: [],
          }).catch(() => {});
          importedMaps++;
        }
      }

      // 2. Import Starter Heroes
      if (Array.isArray(pkg.starterHeroes)) {
        for (const h of pkg.starterHeroes) {
          const slug = h.slug || `hero_${Date.now()}`;
          await prisma.starterHero.upsert({
            where: { slug },
            create: {
              slug,
              name: h.name || 'Hero',
              classId: h.classId || 'WARRIOR',
              assetProfileId: h.assetProfileId || h.spriteKey || 'evil-berserker-bloodaxe-male',
              assetBundleId: h.assetBundleId || null,
              flavor: h.flavor || '',
              tag: h.tag || 'Hero',
              tagColor: h.tagColor || '#f87171',
            },
            update: {
              name: h.name || 'Hero',
              classId: h.classId || 'WARRIOR',
              assetProfileId: h.assetProfileId || h.spriteKey || 'evil-berserker-bloodaxe-male',
              flavor: h.flavor || '',
              tag: h.tag || 'Hero',
              tagColor: h.tagColor || '#f87171',
            },
          }).catch((e: any) => console.warn(`[Import] Hero skip:`, e.message));
          importedHeroes++;
        }
      }

      // 3. Import Creatures
      if (Array.isArray(pkg.creatures)) {
        for (const c of pkg.creatures) {
          const slug = c.slug || `creature_${Date.now()}`;
          await prisma.creatureDef.upsert({
            where: { slug },
            create: {
              slug,
              name: c.name || 'Creature',
              typePrimary: c.typePrimary || 'Solar',
              typeSecondary: c.typeSecondary || null,
              spriteOverworld: c.spriteOverworld || 'monster/battle/agnite-sheet',
              spriteBattle: c.spriteBattle || c.spriteOverworld || 'monster/battle/agnite-sheet',
              baseHp: c.baseHp || 100,
              physicalPower: c.physicalPower || 10,
              physicalDefense: c.physicalDefense || 10,
              abilityPower: c.abilityPower || 10,
              abilityDefense: c.abilityDefense || 10,
              flavor: c.flavor || '',
            },
            update: {
              name: c.name || 'Creature',
              typePrimary: c.typePrimary || 'Solar',
              typeSecondary: c.typeSecondary || null,
              spriteOverworld: c.spriteOverworld || 'monster/battle/agnite-sheet',
              spriteBattle: c.spriteBattle || c.spriteOverworld || 'monster/battle/agnite-sheet',
              flavor: c.flavor || '',
            },
          }).catch((e: any) => console.warn(`[Import] Creature skip:`, e.message));
          importedCreatures++;
        }
      }

      // 4. Update Game Identity Settings
      if (pkg.game) {
        const gameSettings = [
          { key: SETUP_SETTING_KEYS.GAME_INITIALIZED, value: 'true' },
          { key: SETUP_SETTING_KEYS.GAME_INITIALIZED_AT, value: new Date().toISOString() },
          { key: SETUP_SETTING_KEYS.GAME_NAME, value: pkg.game.name || 'Saints Game' },
          { key: SETUP_SETTING_KEYS.GAME_DESCRIPTION, value: pkg.game.description || '' },
          { key: SETUP_SETTING_KEYS.GAME_GENRE, value: pkg.game.genre || 'CREATURE_MMO' },
          { key: SETUP_SETTING_KEYS.GAME_STYLE, value: pkg.game.style || 'SAINTS_HYBRID' },
          { key: SETUP_SETTING_KEYS.GAME_CAMERA, value: pkg.game.camera || 'ISOMETRIC_25D' },
          { key: SETUP_SETTING_KEYS.DEFAULT_MAP_ID, value: pkg.game.defaultMapId || (pkg.maps?.[0]?.id ?? 'STARTING_MEADOW') },
        ];

        for (const s of gameSettings) {
          await prisma.siteSetting.upsert({
            where: { key: s.key },
            create: { key: s.key, value: s.value },
            update: { value: s.value },
          });
        }
      }

      return NextResponse.json({
        success: true,
        importedMaps,
        importedHeroes,
        importedCreatures,
        defaultMapId: pkg.game?.defaultMapId || pkg.maps?.[0]?.id || 'STARTING_MEADOW',
        message: `Package successfully migrated and imported: ${importedMaps} 3D Voxel Maps, ${importedHeroes} Heroes, ${importedCreatures} Creatures.`,
      });
    }

    // Mode B: Built-in starter pack
    const packId = body?.packId || 'blank-canvas';
    const validPack = AVAILABLE_STARTER_PACKS.some((p) => p.id === packId);
    if (!validPack) {
      return NextResponse.json({ error: `Invalid pack ID: ${packId}` }, { status: 400 });
    }

    const result = await importStarterPackToDb(prisma, packId);

    return NextResponse.json({
      success: result.success,
      importedMaps: result.importedMaps,
      importedCreatures: result.importedCreatures,
      message: result.message,
    });
  } catch (error: any) {
    console.error('[api/setup/import] Failed to import package:', error);
    return NextResponse.json({ error: error.message || 'Failed to import package' }, { status: 500 });
  }
}
