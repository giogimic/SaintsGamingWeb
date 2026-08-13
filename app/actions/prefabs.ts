'use server';

import { prisma } from '@/web/lib/prisma';
import { auth } from '@/auth';
import { hasPermission, PERMISSION_LEVELS } from '@/web/lib/permissions';
import type { MapPrefab } from '@prisma/client';

export type PrefabTileData = {
  layerOffset: number;
  r: number;
  c: number;
  tileId: number;
};

export type PrefabLogicData = {
  r: number;
  c: number;
  tileId: number;
};

export async function listPrefabs(search?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    if (!hasPermission(session.user.permissionLevel, PERMISSION_LEVELS.ADMIN)) {
      throw new Error('Forbidden');
    }

    const where = search
      ? { name: { contains: search } }
      : {};

    const prefabs = await prisma.mapPrefab.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return { success: true, data: prefabs as MapPrefab[] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function savePrefab(data: {
  name: string;
  category: string;
  width: number;
  height: number;
  visualData: PrefabTileData[];
  logicData: PrefabLogicData[];
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    if (!hasPermission(session.user.permissionLevel, PERMISSION_LEVELS.ADMIN)) {
      throw new Error('Forbidden');
    }

    const prefab = await prisma.mapPrefab.create({
      data: {
        authorId: session.user.id,
        name: data.name,
        category: data.category,
        width: data.width,
        height: data.height,
        visualData: JSON.stringify(data.visualData),
        logicData: JSON.stringify(data.logicData),
      },
    });

    return { success: true, prefab };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deletePrefab(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    if (!hasPermission(session.user.permissionLevel, PERMISSION_LEVELS.ADMIN)) {
      throw new Error('Forbidden');
    }

    await prisma.mapPrefab.delete({
      where: { id },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function seedBasicPrefabs() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    if (!hasPermission(session.user.permissionLevel, PERMISSION_LEVELS.ADMIN)) {
      throw new Error('Forbidden');
    }

    const starters = [
      {
        name: 'Starter Tree',
        category: 'Environment',
        width: 1,
        height: 2,
        visualData: [
          { layerOffset: 0, r: 0, c: 0, tileId: 19 },
          { layerOffset: 0, r: 1, c: 0, tileId: 27 },
        ],
        logicData: [{ r: 1, c: 0, tileId: 1 }],
      },
      {
        name: 'Wooden Fence',
        category: 'Structures',
        width: 1,
        height: 1,
        visualData: [{ layerOffset: 0, r: 0, c: 0, tileId: 35 }],
        logicData: [{ r: 0, c: 0, tileId: 1 }],
      },
      {
        name: 'Warp Door Stub',
        category: 'Logic',
        width: 1,
        height: 1,
        visualData: [{ layerOffset: 0, r: 0, c: 0, tileId: 42 }],
        logicData: [{ r: 0, c: 0, tileId: 4 }],
      },
      {
        name: 'Stone Wall',
        category: 'Structures',
        width: 1,
        height: 1,
        visualData: [{ layerOffset: 0, r: 0, c: 0, tileId: 44 }],
        logicData: [{ r: 0, c: 0, tileId: 1 }],
      },
    ];

    for (const p of starters) {
      await prisma.mapPrefab.create({
        data: {
          authorId: session.user.id,
          name: p.name,
          category: p.category,
          width: p.width,
          height: p.height,
          visualData: JSON.stringify(p.visualData),
          logicData: JSON.stringify(p.logicData),
        },
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
