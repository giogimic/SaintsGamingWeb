'use server';

import { SampManager } from '@/server/sampManager';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import JSZip from 'jszip';

const execAsync = promisify(exec);
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

// ─── FILE MANAGEMENT ACTIONS ───────────────────────────────────────────────

/**
 * Downloads a ZIP or TAR.GZ file from a URL and extracts it into the samp-server directory.
 * We use curl and native tar/unzip so it handles permissions (like +x) natively on both Linux and Windows (tar is in Windows 10+).
 */
export async function downloadAndExtractServer(archiveUrl: string) {
  await requireAdmin();
  const manager = SampManager.getInstance();
  
  if (manager.isRunning()) {
    return { success: false, error: 'Cannot extract files while the server is running.' };
  }

  const targetDir = path.join(process.cwd(), 'samp-server');
  const tempFile = path.join(process.cwd(), `temp_server_dl_${Date.now()}.zip`); // Usually zip

  try {
    // Ensure dir exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Download using native fetch to avoid missing curl in docker
    const res = await fetch(archiveUrl);
    if (!res.ok) throw new Error(`Failed to download: ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(tempFile, Buffer.from(arrayBuffer));

    // Determine type and extract
    // Modern Windows 10+ and Linux both have 'tar'. Windows also has PowerShell Expand-Archive.
    const isWindows = process.platform === 'win32';
    
    if (archiveUrl.endsWith('.tar.gz')) {
      await execAsync(`tar -xzf "${tempFile}" -C "${targetDir}"`);
    } else {
      if (isWindows) {
        // Windows native tar supports zip now!
        await execAsync(`tar -xf "${tempFile}" -C "${targetDir}"`);
      } else {
        // Use JSZip since unzip is not available in minimal docker
        const zipData = fs.readFileSync(tempFile);
        const zip = await JSZip.loadAsync(zipData);
        const files = Object.entries(zip.files);
        for (const [relativePath, file] of files) {
          const fullPath = path.join(targetDir, relativePath);
          if (file.dir) {
            if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
          } else {
            const content = await file.async('nodebuffer');
            const dirname = path.dirname(fullPath);
            if (!fs.existsSync(dirname)) fs.mkdirSync(dirname, { recursive: true });
            fs.writeFileSync(fullPath, content);
            // Fix permissions for Linux executables
            if (relativePath.includes('samp03svr') || relativePath.includes('announce') || relativePath.includes('omp-server')) {
              fs.chmodSync(fullPath, 0o755);
            }
          }
        }
      }
    }

    // Cleanup
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    
    return { success: true };
  } catch (error: any) {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    return { success: false, error: error.message || 'Extraction failed' };
  }
}

/**
 * Automatically fetches the latest open.mp server release for the correct platform,
 * downloads it, and extracts it to /samp-server.
 */
export async function installLatestOMP() {
  await requireAdmin();
  const manager = SampManager.getInstance();
  
  if (manager.isRunning()) {
    return { success: false, error: 'Cannot install open.mp while the server is running.' };
  }

  try {
    // 1. Fetch latest release from open.mp GitHub
    const res = await fetch('https://api.github.com/repos/openmultiplayer/open.mp/releases/latest', {
      headers: { 'User-Agent': 'Saints-Web-UCP' }
    });
    const data = await res.json();
    
    if (!data || !data.assets) {
      return { success: false, error: 'Could not fetch latest release from GitHub.' };
    }

    // 2. Determine platform and find correct asset
    const isWindows = process.platform === 'win32';
    const osKeyword = isWindows ? 'windows' : 'linux';
    
    const asset = data.assets.find((a: any) => 
      a.name.toLowerCase().includes(osKeyword) && 
      !a.name.toLowerCase().includes('scripting') // Ignore scripting packages
    );

    if (!asset) {
      return { success: false, error: `No compatible ${osKeyword} binary found in the latest release.` };
    }

    // 3. Download and extract using our helper
    return await downloadAndExtractServer(asset.browser_download_url);

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
