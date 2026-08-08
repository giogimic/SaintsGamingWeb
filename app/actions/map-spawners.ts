'use server';

import { prisma } from '@/web/lib/prisma';
import { auth } from '@/auth';
import { hasPermission, PERMISSION_LEVELS } from '@/web/lib/permissions';

export type MapSpawnerData = {
  id: string;
  name: string;
  entityType: 'spawner';
  x: number;
  y: number;
  monsterPool: string;
  maxPopulation: number;
  wanderRadius: number;
  respawnDelayMs: number;
  aggroRadius: number;
  level: number;
  lootPoolId?: string;
  difficulty: string;
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  if (!hasPermission(session.user.permissionLevel, PERMISSION_LEVELS.ADMIN)) {
    throw new Error('Forbidden');
  }
}

export async function listMapSpawners(mapId: string) {
  try {
    await requireAdmin();
    const map = await prisma.worldMap.findUnique({ where: { id: mapId } });
    if (!map) return { success: false, error: 'Map not found' };

    let npcs: any[] = [];
    try {
      npcs = JSON.parse(map.npcsData);
      if (!Array.isArray(npcs)) npcs = [];
    } catch {
      npcs = [];
    }

    const spawners = npcs.filter((n) => n && n.entityType === 'spawner') as MapSpawnerData[];
    return { success: true, data: spawners };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function placeMapSpawner(data: {
  mapId: string;
  name: string;
  x: number;
  y: number;
  monsterPool: string;
  maxPopulation: number;
  wanderRadius: number;
  respawnDelayMs: number;
  aggroRadius: number;
  level: number;
  lootPoolId?: string;
  difficulty: string;
}) {
  try {
    await requireAdmin();
    const map = await prisma.worldMap.findUnique({ where: { id: data.mapId } });
    if (!map) return { success: false, error: 'Map not found' };

    let npcs: any[] = [];
    try {
      npcs = JSON.parse(map.npcsData);
      if (!Array.isArray(npcs)) npcs = [];
    } catch {
      npcs = [];
    }

    const id = `spawner_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const spawner: MapSpawnerData = {
      id,
      entityType: 'spawner',
      name: data.name,
      x: data.x,
      y: data.y,
      monsterPool: data.monsterPool,
      maxPopulation: data.maxPopulation,
      wanderRadius: data.wanderRadius,
      respawnDelayMs: data.respawnDelayMs,
      aggroRadius: data.aggroRadius,
      level: data.level,
      lootPoolId: data.lootPoolId,
      difficulty: data.difficulty,
    };

    npcs.push(spawner);

    await prisma.worldMap.update({
      where: { id: data.mapId },
      data: { npcsData: JSON.stringify(npcs) },
    });

    return { success: true, spawner, count: npcs.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateMapSpawner(data: {
  mapId: string;
  spawnerId: string;
  name: string;
  x: number;
  y: number;
  monsterPool: string;
  maxPopulation: number;
  wanderRadius: number;
  respawnDelayMs: number;
  aggroRadius: number;
  level: number;
  lootPoolId?: string;
  difficulty: string;
}) {
  try {
    await requireAdmin();
    const map = await prisma.worldMap.findUnique({ where: { id: data.mapId } });
    if (!map) return { success: false, error: 'Map not found' };

    let npcs: any[] = [];
    try {
      npcs = JSON.parse(map.npcsData);
      if (!Array.isArray(npcs)) npcs = [];
    } catch {
      npcs = [];
    }

    const idx = npcs.findIndex((n) => n && n.id === data.spawnerId && n.entityType === 'spawner');
    if (idx === -1) return { success: false, error: 'Spawner not found' };

    const spawner: MapSpawnerData = {
      ...npcs[idx],
      name: data.name,
      x: data.x,
      y: data.y,
      monsterPool: data.monsterPool,
      maxPopulation: data.maxPopulation,
      wanderRadius: data.wanderRadius,
      respawnDelayMs: data.respawnDelayMs,
      aggroRadius: data.aggroRadius,
      level: data.level,
      lootPoolId: data.lootPoolId,
      difficulty: data.difficulty,
    };

    npcs[idx] = spawner;

    await prisma.worldMap.update({
      where: { id: data.mapId },
      data: { npcsData: JSON.stringify(npcs) },
    });

    return { success: true, spawner };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteMapSpawner(data: { mapId: string; spawnerId: string }) {
  try {
    await requireAdmin();
    const map = await prisma.worldMap.findUnique({ where: { id: data.mapId } });
    if (!map) return { success: false, error: 'Map not found' };

    let npcs: any[] = [];
    try {
      npcs = JSON.parse(map.npcsData);
      if (!Array.isArray(npcs)) npcs = [];
    } catch {
      npcs = [];
    }

    const filtered = npcs.filter((n) => !(n && n.id === data.spawnerId && n.entityType === 'spawner'));
    if (filtered.length === npcs.length) return { success: false, error: 'Spawner not found' };

    await prisma.worldMap.update({
      where: { id: data.mapId },
      data: { npcsData: JSON.stringify(filtered) },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
