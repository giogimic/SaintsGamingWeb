'use server';

import { auth } from '@/auth';
import { prisma } from '@/web/lib/prisma';
import { PERMISSION_LEVELS } from '@/web/lib/permissions';

async function verifyAdmin() {
  const session = await auth();
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return false;
  
  return user.permissionLevel >= PERMISSION_LEVELS.ADMIN;
}

export async function checkAdminPermission() {
  return await verifyAdmin();
}

export async function saveWorldMap(data: {
  id: string;
  name: string;
  gridData: string;
  gatesData: string;
  npcsData: string;
  encountersData: string;
  tileLayersData: string;
  tilesetsData: string;
}) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) return { success: false, error: 'Unauthorized' };

    const existing = await prisma.worldMap.findUnique({ where: { id: data.id } });
    
    if (existing) {
      await prisma.worldMap.update({
        where: { id: data.id },
        data: {
          name: data.name,
          gridData: data.gridData,
          gatesData: data.gatesData,
          npcsData: data.npcsData,
          encountersData: data.encountersData,
          tileLayersData: data.tileLayersData,
          tilesetsData: data.tilesetsData,
          version: existing.version + 1
        }
      });
    } else {
      await prisma.worldMap.create({
        data: {
          id: data.id,
          name: data.name,
          gridData: data.gridData,
          gatesData: data.gatesData,
          npcsData: data.npcsData,
          encountersData: data.encountersData,
          tileLayersData: data.tileLayersData,
          tilesetsData: data.tilesetsData,
          version: 1
        }
      });
    }

    return { success: true };
  } catch (err) {
    console.error('Save map failed:', err);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function fetchAllMaps() {
  try {
    const maps = await prisma.worldMap.findMany({
      select: {
        id: true,
        name: true
      }
    });
    return { success: true, data: maps };
  } catch (err) {
    console.error('Fetch maps failed:', err);
    return { success: false, error: 'Internal Server Error', data: [] };
  }
}


export async function fetchMapById(mapId: string) {
  try {
    const map = await prisma.worldMap.findUnique({ where: { id: mapId } });
    if (!map) return { success: false, error: 'Not found' };
    return { success: true, data: map };
  } catch (err) {
    console.error('Fetch map failed:', err);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function fetchGamePlayers() {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) return { success: false, error: 'Unauthorized', data: [] };

    const players = await prisma.gameCharacter.findMany({
      include: {
        user: { select: { username: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
    return { success: true, data: players };
  } catch (err) {
    console.error('Fetch players failed:', err);
    return { success: false, error: 'Internal Server Error', data: [] };
  }
}

export async function adminGivePlayerItem(characterId: string, itemId: string, amount: number) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) return { success: false, error: 'Unauthorized' };

    const character = await prisma.gameCharacter.findUnique({
      where: { id: characterId }
    });

    if (!character || !character.stateData) {
      return { success: false, error: 'Character not found or corrupt' };
    }

    const state = JSON.parse(character.stateData);
    if (!state.inventory) state.inventory = {};
    
    // Inject Item
    if (!state.inventory[itemId]) {
      state.inventory[itemId] = amount;
    } else {
      state.inventory[itemId] += amount;
    }

    await prisma.gameCharacter.update({
      where: { id: characterId },
      data: { stateData: JSON.stringify(state) }
    });

    return { success: true };
  } catch (err) {
    console.error('Admin give item failed:', err);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function adminResetPlayerPosition(characterId: string, targetMapId: string = "DEMO_SANDBOX", x: number = 8, y: number = 8) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) return { success: false, error: 'Unauthorized' };

    const character = await prisma.gameCharacter.findUnique({
      where: { id: characterId }
    });

    if (!character || !character.stateData) {
      return { success: false, error: 'Character not found' };
    }

    const state = JSON.parse(character.stateData);
    state.mapId = targetMapId;
    state.x = x;
    state.y = y;

    await prisma.gameCharacter.update({
      where: { id: characterId },
      data: {
        mapId: targetMapId,
        x,
        y,
        stateData: JSON.stringify(state)
      }
    });

    return { success: true };
  } catch (err) {
    console.error('Reset player position failed:', err);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function adminAdjustPlayerGold(characterId: string, deltaGold: number) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) return { success: false, error: 'Unauthorized' };

    const character = await prisma.gameCharacter.findUnique({
      where: { id: characterId }
    });

    if (!character || !character.stateData) {
      return { success: false, error: 'Character not found' };
    }

    const state = JSON.parse(character.stateData);
    state.gold = Math.max(0, (state.gold || 0) + deltaGold);

    await prisma.gameCharacter.update({
      where: { id: characterId },
      data: { stateData: JSON.stringify(state) }
    });

    return { success: true, newGold: state.gold };
  } catch (err) {
    console.error('Adjust player gold failed:', err);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function adminDeleteGameCharacter(characterId: string) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) return { success: false, error: 'Unauthorized' };

    await prisma.gameCharacter.delete({
      where: { id: characterId }
    });

    return { success: true };
  } catch (err) {
    console.error('Delete game character failed:', err);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function fetchWorldMapsDetailed() {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) return { success: false, error: 'Unauthorized', data: [] };

    const maps = await prisma.worldMap.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        version: true,
        updatedAt: true,
        gatesData: true,
        npcsData: true,
        encountersData: true,
        tileLayersData: true,
        tilesetsData: true,
      }
    });

    const parsed = maps.map(m => {
      let gateCount = 0;
      let npcCount = 0;
      let encounterCount = 0;
      try { gateCount = (JSON.parse(m.gatesData || '[]')).length; } catch {}
      try { npcCount = (JSON.parse(m.npcsData || '[]')).length; } catch {}
      try { encounterCount = (JSON.parse(m.encountersData || '[]')).length; } catch {}

      return {
        id: m.id,
        name: m.name,
        version: m.version,
        updatedAt: m.updatedAt,
        gateCount,
        npcCount,
        encounterCount,
        hasTilesets: Boolean(m.tilesetsData && m.tilesetsData.length > 5),
      };
    });

    return { success: true, data: parsed };
  } catch (err) {
    console.error('Fetch detailed maps failed:', err);
    return { success: false, error: 'Internal Server Error', data: [] };
  }
}

