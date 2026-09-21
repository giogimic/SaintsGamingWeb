'use server';

import fs from 'fs';
import path from 'path';
import { auth } from '@/auth';
import { SampManager } from '@/server/sampManager';

// Helper to check admin status
async function requireServerManager() {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  if (session.user.role !== 'ADMIN' && session.user.permissionLevel < 3) {
    throw new Error("Unauthorized: Server Manager access required");
  }
  return session.user;
}

const SAMP_SERVER_DIR = path.join(process.cwd(), 'samp-server');
const LAUNCHER_CONFIG_PATH = path.join(SAMP_SERVER_DIR, 'launcher.json');

export async function getLauncherConfig() {
  await requireServerManager();
  try {
    if (!fs.existsSync(SAMP_SERVER_DIR)) {
      fs.mkdirSync(SAMP_SERVER_DIR, { recursive: true });
    }

    const sampManager = SampManager.getInstance();
    const defaultExe = sampManager.detectDefaultExecutable();

    let executable = defaultExe;

    if (fs.existsSync(LAUNCHER_CONFIG_PATH)) {
      try {
        const data = fs.readFileSync(LAUNCHER_CONFIG_PATH, 'utf-8');
        const json = JSON.parse(data);
        if (json.executable && typeof json.executable === 'string' && json.executable.trim() !== '') {
          executable = json.executable.trim();
        }
      } catch {}
    }

    return {
      success: true,
      executable,
      defaultExecutable: defaultExe,
      platform: process.platform,
      isLinux: process.platform !== 'win32',
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function setLauncherConfig(executable: string) {
  await requireServerManager();
  try {
    if (!fs.existsSync(SAMP_SERVER_DIR)) {
      fs.mkdirSync(SAMP_SERVER_DIR, { recursive: true });
    }

    const config = { executable: executable.trim() };
    fs.writeFileSync(LAUNCHER_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');

    return { success: true, executable: executable.trim() };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
