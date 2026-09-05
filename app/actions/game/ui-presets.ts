'use server';

import { auth } from '@/auth';
import { prisma } from '@/web/lib/prisma';
import { hasPermission, PERMISSION_LEVELS } from '@/web/lib/permissions';

export async function setUiPresetAsServerDefault(presetId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true },
    });

    if (!user || !hasPermission(user.permissionLevel, PERMISSION_LEVELS.MODERATOR)) {
      return { success: false, error: 'Forbidden. Requires moderator privileges.' };
    }

    // Verify preset exists
    const preset = await prisma.uiPreset.findUnique({
      where: { id: presetId },
    });

    if (!preset) {
      return { success: false, error: 'Preset not found' };
    }

    // Transaction to unset all others and set this one
    await prisma.$transaction([
      prisma.uiPreset.updateMany({
        where: { isServerDefault: true },
        data: { isServerDefault: false },
      }),
      prisma.uiPreset.update({
        where: { id: presetId },
        data: { isServerDefault: true, isPublic: true },
      }),
    ]);

    return { success: true };
  } catch (error: any) {
    console.error('Error setting UI preset as default:', error);
    return { success: false, error: error.message };
  }
}

export async function getServerDefaultUiPreset() {
  try {
    const preset = await prisma.uiPreset.findFirst({
      where: { isServerDefault: true },
    });
    
    if (!preset) {
      return { success: true, data: null };
    }
    
    return { success: true, data: preset };
  } catch (error: any) {
    console.error('Error fetching server default UI preset:', error);
    return { success: false, error: error.message };
  }
}
