'use server';

import { SampManager } from '@/server/sampManager';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

// Helper to check admin status
async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // In a real app, check dbUser.permissionLevel here
  return session.user;
}

export async function startSampServer() {
  await requireAdmin();
  const manager = SampManager.getInstance();
  
  if (manager.isRunning()) {
    return { success: false, error: 'Server is already running.' };
  }
  
  try {
    await manager.startServer();
    revalidatePath('/server-manager');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function stopSampServer() {
  await requireAdmin();
  const manager = SampManager.getInstance();
  
  if (!manager.isRunning()) {
    return { success: false, error: 'Server is not running.' };
  }
  
  try {
    manager.stopServer();
    revalidatePath('/server-manager');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendSampRcon(command: string) {
  await requireAdmin();
  const manager = SampManager.getInstance();
  
  if (!command.trim()) return { success: false, error: 'Empty command' };
  
  try {
    const response = await manager.sendRconCommand(command);
    return { success: true, response };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSampStatus() {
  const manager = SampManager.getInstance();
  return { isRunning: manager.isRunning() };
}
