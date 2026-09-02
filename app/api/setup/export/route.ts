import { NextResponse } from 'next/server';
import { prisma } from '@/web/lib/prisma';
import { auth } from '@/auth';
import { generateDefaultWorldDoc, type VoxelWorldDocV3 } from '@/shared/game/voxel/VoxelWorldDoc';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;
    const isAdmin = user && (user.permissionLevel >= 80 || user.role === 'ADMIN');

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required to export game packages' }, { status: 403 });
    }

    // 1. Fetch all site settings
    const settings = await prisma.siteSetting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    // 2. Fetch maps and ensure voxel documents
    const worldMaps = await prisma.worldMap.findMany();
    const exportedMaps = worldMaps.map((m: any) => {
      let voxelDoc: VoxelWorldDocV3 | null = null;
      if (m.tileLayersData) {
        try {
          const parsed = typeof m.tileLayersData === 'string' ? JSON.parse(m.tileLayersData) : m.tileLayersData;
          if (parsed?.formatVersion === 3) {
            voxelDoc = parsed;
          } else if (parsed?.voxelDoc?.formatVersion === 3) {
            voxelDoc = parsed.voxelDoc;
          }
        } catch {
          // ignore parse error
        }
      }

      if (!voxelDoc) {
        voxelDoc = generateDefaultWorldDoc(2, 2, Number(settingsMap['DEFAULT_BLOCK_SIZE_PX']) || 64);
        voxelDoc.id = m.id;
        voxelDoc.name = m.name;
      }

      let spawnX = 16;
      let spawnY = 16;
      if (m.gatesData) {
        try {
          const gates = typeof m.gatesData === 'string' ? JSON.parse(m.gatesData) : m.gatesData;
          if (gates?.spawnPoint) {
            spawnX = gates.spawnPoint.x;
            spawnY = gates.spawnPoint.y;
          }
        } catch {
          // ignore
        }
      }

      return {
        id: m.id,
        name: m.name,
        spawnX,
        spawnY,
        voxelDoc,
      };
    });

    // 3. Fetch starter heroes
    const starterHeroes = await prisma.starterHero.findMany();

    // 4. Fetch creatures
    const creatures = await prisma.creatureDef.findMany();

    // 5. Fetch quests & loot tables
    const quests = await (prisma as any).questDef?.findMany().catch(() => []);
    const lootTables = await (prisma as any).lootTable?.findMany().catch(() => []);

    const exportBundle = {
      format: 'saints-game-package',
      formatVersion: 3,
      exportedAt: new Date().toISOString(),
      game: {
        name: settingsMap['GAME_NAME'] || 'Saints Game',
        description: settingsMap['GAME_DESCRIPTION'] || '2.5D Voxel MMO',
        genre: settingsMap['GAME_GENRE'] || 'CREATURE_MMO',
        style: settingsMap['GAME_STYLE'] || 'SAINTS_HYBRID',
        camera: settingsMap['GAME_CAMERA'] || 'ISOMETRIC_25D',
        defaultBlockSizePx: Number(settingsMap['DEFAULT_BLOCK_SIZE_PX']) || 64,
        defaultMapId: settingsMap['DEFAULT_MAP_ID'] || 'STARTING_MEADOW',
      },
      settings: settingsMap,
      maps: exportedMaps,
      starterHeroes,
      creatures,
      quests,
      lootTables,
    };

    const fileName = `saints-game-package-${Date.now()}.saints.json`;

    return new Response(JSON.stringify(exportBundle, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('[api/setup/export] Failed to export game package:', error);
    return NextResponse.json({ error: error.message || 'Failed to export game package' }, { status: 500 });
  }
}
