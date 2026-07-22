'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createGameCharacter(data: {
  name: string;
  spriteId: string;
  classId: string;
  initialState: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const character = await prisma.gameCharacter.create({
      data: {
        userId: session.user.id,
        name: data.name,
        spriteId: data.spriteId,
        classId: data.classId,
        stateData: data.initialState,
      }
    });

    revalidatePath(`/user/[username]`);
    return { success: true, character };
  } catch (error) {
    console.error('Failed to create character:', error);
    return { success: false, error: 'Failed to create character' };
  }
}

export async function saveGameState(characterId: string, stateData: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.gameCharacter.update({
      where: { 
        id: characterId,
        userId: session.user.id // Security check
      },
      data: { stateData }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to save game state:', error);
    return { success: false, error: 'Failed to save game state' };
  }
}

export async function loadGameCharacter(characterId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized', data: null };
    }

    const save = await prisma.gameCharacter.findUnique({
      where: { 
        id: characterId,
        userId: session.user.id
      }
    });

    return { success: true, data: save || null };
  } catch (error) {
    console.error('Failed to load game character:', error);
    return { success: false, error: 'Failed to load game character', data: null };
  }
}

export async function getUserCharacters() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized', data: [] };
    }

    const characters = await prisma.gameCharacter.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' }
    });

    return { success: true, data: characters };
  } catch (error) {
    console.error('Failed to load characters:', error);
    return { success: false, error: 'Failed to load characters', data: [] };
  }
}

export async function deleteGameCharacter(characterId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.gameCharacter.delete({
      where: {
        id: characterId,
        userId: session.user.id
      }
    });

    revalidatePath('/profile');
    revalidatePath('/lobby');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete character:', error);
    return { success: false, error: 'Failed to delete character' };
  }
}

export async function unlockGameAchievement(badgeId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const userId = session.user.id;

    // Check if they already have it
    const existing = await prisma.userAchievement.findUnique({
      where: {
        userId_badgeId: {
          userId,
          badgeId
        }
      }
    });

    if (existing) {
      return { success: true, alreadyUnlocked: true };
    }

    await prisma.userAchievement.create({
      data: {
        userId,
        badgeId,
        isPinned: false
      }
    });

    // Optional: grant some platform XP or Coins
    await prisma.user.update({
      where: { id: userId },
      data: {
        coins: { increment: 50 },
        xp: { increment: 100 }
      }
    });

    revalidatePath('/profile/[username]'); // Revalidate profile to show new badge
    return { success: true, alreadyUnlocked: false };
  } catch (error) {
    console.error('Failed to unlock achievement:', error);
    return { success: false, error: 'Failed to unlock achievement' };
  }
}

export async function pinBeastToProfile(beastId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { pinnedBeastId: beastId }
    });

    revalidatePath('/profile/[username]');
    return { success: true };
  } catch (error) {
    console.error('Failed to pin beast:', error);
    return { success: false, error: 'Failed to pin beast' };
  }
}
