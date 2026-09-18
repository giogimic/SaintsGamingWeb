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

import { getLauncherConfig } from './launcher';

export async function startSampServer() {
  await requireAdmin();
  const manager = SampManager.getInstance();
  
  if (manager.isRunning()) {
    return { success: false, error: 'Server is already running.' };
  }
  
  try {
    const launcherCfg = await getLauncherConfig();
    const customExecutable = launcherCfg.executable || undefined;
    await manager.startServer(customExecutable);
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
        let files = Object.entries(zip.files);

        // Detect single wrapper directory (e.g. GitHub downloads)
        const rootSegments = new Set(files.filter(([rel]) => rel.includes('/')).map(([rel]) => rel.split('/')[0]));
        let prefixToStrip = "";
        
        // If every file is inside a single root folder, strip it
        const allPaths = files.map(([rel]) => rel);
        if (rootSegments.size === 1) {
          const rootDir = Array.from(rootSegments)[0];
          const hasFilesOutsideRoot = allPaths.some(p => p !== rootDir && p !== rootDir + '/' && !p.startsWith(rootDir + '/'));
          if (!hasFilesOutsideRoot) {
            prefixToStrip = rootDir + '/';
          }
        }

        for (const [relativePath, file] of files) {
          let finalPath = relativePath;
          if (prefixToStrip && finalPath.startsWith(prefixToStrip)) {
            finalPath = finalPath.slice(prefixToStrip.length);
          }
          if (!finalPath) continue; // Skip the root dir entry itself

          const fullPath = path.join(targetDir, finalPath);
          if (file.dir) {
            if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
          } else {
            const content = await file.async('nodebuffer');
            const dirname = path.dirname(fullPath);
            if (!fs.existsSync(dirname)) fs.mkdirSync(dirname, { recursive: true });
            fs.writeFileSync(fullPath, content);
            // Fix permissions for Linux executables
            if (finalPath.includes('samp03svr') || finalPath.includes('announce') || finalPath.includes('omp-server')) {
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

// ─── FILE BROWSER ACTIONS ──────────────────────────────────────────────────

const SAMP_SERVER_DIR = path.join(process.cwd(), 'samp-server');

function getSafePath(subPath: string) {
  const safePath = path.normalize(path.join(SAMP_SERVER_DIR, subPath));
  if (!safePath.startsWith(SAMP_SERVER_DIR)) {
    throw new Error('Invalid path');
  }
  return safePath;
}

export async function listServerFiles(dirPath: string = '') {
  await requireAdmin();
  try {
    const targetDir = getSafePath(dirPath);
    if (!fs.existsSync(targetDir)) {
      return { success: true, files: [] };
    }
    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    const files = entries.map(dirent => {
      const fullPath = path.join(targetDir, dirent.name);
      let size = 0;
      let updatedAt = new Date();
      try {
        const stats = fs.statSync(fullPath);
        size = stats.size;
        updatedAt = stats.mtime;
      } catch (e) {}
      
      return {
        name: dirent.name,
        isDirectory: dirent.isDirectory(),
        size,
        updatedAt,
      };
    }).sort((a, b) => {
      if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
      return a.isDirectory ? -1 : 1;
    });
    return { success: true, files };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function readServerFile(filePath: string) {
  await requireAdmin();
  try {
    const targetFile = getSafePath(filePath);
    if (!fs.existsSync(targetFile)) return { success: false, error: 'File not found' };
    
    // Quick check to avoid reading huge binaries
    const stats = fs.statSync(targetFile);
    if (stats.size > 5 * 1024 * 1024) {
      return { success: false, error: 'File is too large to read in browser (max 5MB)' };
    }
    
    const content = fs.readFileSync(targetFile, 'utf-8');
    return { success: true, content };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function writeServerFile(filePath: string, content: string) {
  await requireAdmin();
  try {
    const targetFile = getSafePath(filePath);
    const dir = path.dirname(targetFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(targetFile, content, 'utf-8');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteServerItem(filePath: string) {
  await requireAdmin();
  try {
    const targetFile = getSafePath(filePath);
    if (fs.existsSync(targetFile)) {
      fs.rmSync(targetFile, { recursive: true, force: true });
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function renameServerItem(oldPath: string, newPath: string) {
  await requireAdmin();
  try {
    const safeOldPath = getSafePath(oldPath);
    const safeNewPath = getSafePath(newPath);
    fs.renameSync(safeOldPath, safeNewPath);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function uploadServerFile(dirPath: string, formData: FormData) {
  await requireAdmin();
  try {
    const file = formData.get('file') as File;
    if (!file) return { success: false, error: 'No file provided' };
    
    const targetDir = getSafePath(dirPath);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    
    const filePath = path.join(targetDir, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

import { prisma } from '@/web/lib/prisma';

export async function executeSqlFile(filePath: string) {
  await requireAdmin();
  try {
    const targetFile = getSafePath(filePath);
    if (!fs.existsSync(targetFile)) return { success: false, error: 'File not found' };
    
    const content = fs.readFileSync(targetFile, 'utf-8');
    
    // Split by ; followed by optional whitespace and newline
    const statements = content.split(/;\s*$/m).filter(s => s.trim().length > 0);
    
    let successCount = 0;
    for (const stmt of statements) {
      if (stmt.trim()) {
        try {
          await prisma.$executeRawUnsafe(stmt.trim());
          successCount++;
        } catch (e: any) {
          // Log but continue, because SQL dumps often have duplicates or missing drops
          console.error(`[SQL Error]: ${e.message.split('\n')[0]}`);
        }
      }
    }
    
    return { success: true, executedCount: successCount, totalCount: statements.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function executeSqlFolder(dirPath: string) {
  await requireAdmin();
  try {
    const targetDir = getSafePath(dirPath);
    if (!fs.existsSync(targetDir)) return { success: false, error: 'Directory not found' };
    
    const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.sql')).sort();
    
    let totalExecuted = 0;
    const results = [];
    
    for (const file of files) {
      const res = await executeSqlFile(path.join(dirPath, file));
      if (res.success) {
        totalExecuted += res.executedCount || 0;
        results.push({ file, success: true, count: res.executedCount });
      } else {
        results.push({ file, success: false, error: res.error });
      }
    }
    
    return { success: true, totalExecuted, details: results };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function unzipServerArchive(filePath: string) {
  await requireAdmin();
  try {
    const targetFile = getSafePath(filePath);
    if (!fs.existsSync(targetFile)) return { success: false, error: 'File not found' };
    
    const targetDir = path.dirname(targetFile);
    const isWindows = process.platform === 'win32';
    
    if (filePath.endsWith('.tar.gz')) {
      await execAsync(`tar -xzf "${targetFile}" -C "${targetDir}"`);
    } else if (filePath.endsWith('.zip')) {
      if (isWindows) {
        await execAsync(`tar -xf "${targetFile}" -C "${targetDir}"`);
      } else {
        const JSZip = (await import('jszip')).default;
        const zipData = fs.readFileSync(targetFile);
        const zip = await JSZip.loadAsync(zipData);
        let files = Object.entries(zip.files);

        for (const [relativePath, file] of files) {
          const fullPath = path.join(targetDir, relativePath);
          if (file.dir) {
            if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
          } else {
            const content = await file.async('nodebuffer');
            const dirname = path.dirname(fullPath);
            if (!fs.existsSync(dirname)) fs.mkdirSync(dirname, { recursive: true });
            fs.writeFileSync(fullPath, content);
          }
        }
      }
    } else {
      return { success: false, error: 'Unsupported archive format. Must be .zip or .tar.gz' };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
