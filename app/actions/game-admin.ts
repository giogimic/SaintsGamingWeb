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
