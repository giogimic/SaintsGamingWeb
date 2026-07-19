'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getRolePrivileges } from '@/lib/permissions';

async function verifyAdmin() {
  const session = await auth();
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return false;
  
  const privs = getRolePrivileges(user.role);
  return privs.canManageGameServers;
}

export async function saveWorldMap(data: {
  id: string;
  name: string;
  gridData: string;
  gatesData: string;
  npcsData: string;
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
    const maps = await prisma.worldMap.findMany();
    return { success: true, data: maps };
  } catch (err) {
    console.error('Fetch maps failed:', err);
    return { success: false, error: 'Internal Server Error', data: [] };
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
