'use server';

import fs from 'fs';
import path from 'path';
import { auth } from '@/auth';

// Helper to check admin status
async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

const SAMP_SERVER_DIR = path.join(process.cwd(), 'samp-server');
const LAUNCHER_CONFIG_PATH = path.join(SAMP_SERVER_DIR, 'launcher.json');

export async function getLauncherConfig() {
  await requireAdmin();
  try {
    if (!fs.existsSync(SAMP_SERVER_DIR)) {
      fs.mkdirSync(SAMP_SERVER_DIR, { recursive: true });
    }
    
    if (fs.existsSync(LAUNCHER_CONFIG_PATH)) {
      const data = fs.readFileSync(LAUNCHER_CONFIG_PATH, 'utf-8');
      const json = JSON.parse(data);
      return { success: true, executable: json.executable || '' };
    }
    return { success: true, executable: '' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function setLauncherConfig(executable: string) {
  await requireAdmin();
  try {
    if (!fs.existsSync(SAMP_SERVER_DIR)) {
      fs.mkdirSync(SAMP_SERVER_DIR, { recursive: true });
    }
    
    const config = { executable: executable.trim() };
    fs.writeFileSync(LAUNCHER_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
