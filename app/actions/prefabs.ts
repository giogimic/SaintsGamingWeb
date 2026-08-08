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
