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
      let stripFlags = "";
      try {
        const { stdout } = await execAsync(`tar -tzf "${tempFile}"`);
        const lines = stdout.split('\n').filter((l: string) => l.trim().length > 0);
        const rootSegments = new Set(lines.map((l: string) => l.split('/')[0]));
        if (rootSegments.size === 1) {
          stripFlags = "--strip-components=1";
        }
      } catch (e) {}
      await execAsync(`tar -xzf "${tempFile}" -C "${targetDir}" ${stripFlags}`);
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

    // Post-extraction fix for open.mp / sa-mp putting things in subfolders
    for (const subDir of ['Server', 'samp03']) {
      const subPath = path.join(targetDir, subDir);
      if (fs.existsSync(subPath) && fs.statSync(subPath).isDirectory()) {
        try {
          const items = fs.readdirSync(subPath);
          for (const item of items) {
            const oldPath = path.join(subPath, item);
            const newPath = path.join(targetDir, item);
            // Replace if it exists
            if (fs.existsSync(newPath)) fs.rmSync(newPath, { recursive: true, force: true });
            fs.renameSync(oldPath, newPath);
          }
          fs.rmdirSync(subPath);
        } catch(e) {
          console.error("Failed to move items from " + subDir, e);
        }
      }
    }
    
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

// ─── GIT DEPLOYMENT ACTIONS ────────────────────────────────────────────────

export async function getDeployKey() {
  await requireAdmin();
  const targetDir = path.join(process.cwd(), 'samp-server');
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const keyPath = path.join(targetDir, 'samp-deploy-key');
  const pubPath = `${keyPath}.pub`;

  try {
    if (!fs.existsSync(keyPath)) {
      // Generate ed25519 key without passphrase. Fix for Windows command escaping
      const emptyPassphrase = process.platform === 'win32' ? '\'""\'' : '""';
      await execAsync(`ssh-keygen -t ed25519 -f "${keyPath}" -N ${emptyPassphrase} -C "saints-web-manager"`);
    }
    
    if (fs.existsSync(pubPath)) {
      const pubKey = fs.readFileSync(pubPath, 'utf-8');
      return { success: true, publicKey: pubKey.trim() };
    }
    return { success: false, error: 'Public key not found after generation' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getGitRemoteUrl() {
  await requireAdmin();
  const targetDir = path.join(process.cwd(), 'samp-server');
  try {
    const { stdout } = await execAsync(`git config --get remote.origin.url`, { cwd: targetDir });
    return { success: true, url: stdout.trim() };
  } catch {
    return { success: true, url: '' };
  }
}

export async function syncGitDeploy(repoUrl: string) {
  await requireAdmin();
  const manager = SampManager.getInstance();
  
  if (manager.isRunning()) {
    return { success: false, error: 'Cannot sync git repository while the server is running.' };
  }

  if (!repoUrl || !repoUrl.includes('git')) {
    return { success: false, error: 'Invalid Git repository URL provided.' };
  }

  const targetDir = path.join(process.cwd(), 'samp-server');
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const keyPath = path.join(targetDir, 'samp-deploy-key');
  if (!fs.existsSync(keyPath)) {
    return { success: false, error: 'Deploy key not found. Please generate one first.' };
  }

  const isWindows = process.platform === 'win32';
  // On Windows, the path needs to be properly escaped for the ssh command
  const sshCmd = `ssh -i "${isWindows ? keyPath.replace(/\\/g, '/') : keyPath}" -o StrictHostKeyChecking=no`;
  const env = { ...process.env, GIT_SSH_COMMAND: sshCmd };

  try {
    const isRepo = fs.existsSync(path.join(targetDir, '.git'));

    if (!isRepo) {
      // Initialize, set remote, and pull instead of clone to handle non-empty dirs (like the deploy key itself)
      await execAsync(`git init`, { cwd: targetDir, env });
      await execAsync(`git remote add origin "${repoUrl}"`, { cwd: targetDir, env });
    } else {
      // Check if remote matches, if not update it
      const { stdout: remoteUrl } = await execAsync(`git config --get remote.origin.url`, { cwd: targetDir, env }).catch(() => ({ stdout: '' }));
      if (remoteUrl.trim() !== repoUrl) {
        await execAsync(`git remote set-url origin "${repoUrl}"`, { cwd: targetDir, env }).catch(async () => {
          await execAsync(`git remote add origin "${repoUrl}"`, { cwd: targetDir, env });
        });
      }
    }

    // Try to ensure the private key has correct permissions on linux
    if (!isWindows) {
      try { await execAsync(`chmod 600 "${keyPath}"`); } catch (e) {}
    }

    // Fetch all branches
    await execAsync(`git fetch origin`, { cwd: targetDir, env });
    
    // Determine the default branch dynamically (main or master)
    const { stdout: remoteHead } = await execAsync(`git remote show origin | grep "HEAD branch" | cut -d ":" -f 2`, { cwd: targetDir, env }).catch(() => ({ stdout: ' main' }));
    const defaultBranch = remoteHead.trim() || 'main';

    // Reset to the remote's default branch
    await execAsync(`git reset --hard origin/${defaultBranch}`, { cwd: targetDir, env });

    // Auto-chmod scripts and binaries on Linux
    if (!isWindows) {
      try {
        await execAsync(`find . -type f -name "*.sh" -exec chmod +x {} +`, { cwd: targetDir });
        await execAsync(`chmod +x omp-server samp03svr announce 2>/dev/null || true`, { cwd: targetDir });
      } catch (e) {}
    }

    return { success: true };
  } catch (error: any) {
    const errorMsg = error.stderr || error.message || 'Unknown error';
    return { success: false, error: errorMsg };
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
    
    // Auto-chmod scripts and binaries on Linux
    if (process.platform !== 'win32' && (targetFile.endsWith('.sh') || targetFile.includes('samp03svr') || targetFile.includes('omp-server') || targetFile.includes('announce'))) {
      try { fs.chmodSync(targetFile, 0o755); } catch (e) {}
    }
    
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
      let stripFlags = "";
      try {
        const { stdout } = await execAsync(`tar -tzf "${targetFile}"`);
        const lines = stdout.split('\n').filter((l: string) => l.trim().length > 0);
        const rootSegments = new Set(lines.map((l: string) => l.split('/')[0]));
        if (rootSegments.size === 1) {
          stripFlags = "--strip-components=1";
        }
      } catch (e) {}
      await execAsync(`tar -xzf "${targetFile}" -C "${targetDir}" ${stripFlags}`);
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
            
            // Fix permissions for Linux executables
            if (process.platform !== 'win32' && (relativePath.endsWith('.sh') || relativePath.includes('samp03svr') || relativePath.includes('announce') || relativePath.includes('omp-server'))) {
              try { fs.chmodSync(fullPath, 0o755); } catch (e) {}
            }
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
