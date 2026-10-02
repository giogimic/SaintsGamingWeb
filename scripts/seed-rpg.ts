import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { prisma } from '../src/web/lib/prisma';
import { ingestAsset } from '../src/web/lib/assetUpload';

if (typeof global.File === 'undefined') {
  global.File = class File extends Blob {
    name: string;
    lastModified: number;
    constructor(fileBits: any[], fileName: string, options?: any) {
      super(fileBits, options);
      this.name = fileName;
      this.lastModified = options?.lastModified || Date.now();
    }
  } as any;
}

const QUATERNIUS_DIR = `C:\\Users\\Matth\\OneDrive\\Desktop\\sg anims`;
const STAGING_DIR = path.join(__dirname, '..', 'public', 'uploads', 'staging');
const SYSTEM_USER_ID = 'system-quaternius';

function runFbx2Gltf(fbxPath: string, glbPath: string) {
  console.log(`Converting FBX -> GLB: ${path.basename(fbxPath)}`);
  try {
    // Assuming fbx2gltf is installed in node_modules/fbx2gltf
    const binPath = path.resolve(__dirname, '..', 'node_modules', 'fbx2gltf', 'bin', 'Windows_NT', 'FBX2glTF.exe');
    execSync(`"${binPath}" -i "${fbxPath}" -o "${glbPath}" -b`, { stdio: 'ignore' });
    return true;
  } catch (err) {
    console.error(`Error converting ${fbxPath}:`, err);
    return false;
  }
}

async function uploadGlb(glbPath: string, options: any) {
  if (!fs.existsSync(glbPath)) return null;

  const buffer = fs.readFileSync(glbPath);
  const file = new File([buffer], path.basename(glbPath), { type: 'model/gltf-binary' });

  const result = await ingestAsset({
    userId: SYSTEM_USER_ID,
    file,
    gameId: 'saints',
    createUsable: true,
    visibility: 'COMMUNITY',
    moderationStatus: 'APPROVED',
    ...options,
  });

  if (!result.success) {
    console.error(`Failed to ingest ${glbPath}:`, result.error);
  } else {
    console.log(`Successfully ingested ${glbPath} as ${result.gameAsset?.id}`);
  }
  return result;
}

function findFbxFiles(dir: string, fileList: string[] = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findFbxFiles(fullPath, fileList);
    } else if (fullPath.endsWith('.fbx')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function processItems() {
  const dir = path.join(QUATERNIUS_DIR, 'Ultimate RPG Pack');
  const files = findFbxFiles(dir);

  for (const fbxPath of files) {
    const filename = path.basename(fbxPath);
    const glbPath = path.join(STAGING_DIR, filename.replace('.fbx', '.glb'));
    const itemName = filename.replace('.fbx', '');
    
    if (runFbx2Gltf(fbxPath, glbPath)) {
      await uploadGlb(glbPath, {
        name: itemName,
        type: 'ITEM',
        tags: ['item', 'prop', 'quaternius', 'rpg'],
        presentation: { mode: '3D' },
      });
    }
  }
}

async function main() {
  await processItems();
  console.log('--- RPG Items Complete ---');
}

main().catch(console.error);
