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

function runGltfTransform(gltfPath: string, glbPath: string) {
  console.log(`Copying glTF -> GLB: ${path.basename(gltfPath)}`);
  try {
    execSync(`npx @gltf-transform/cli copy "${gltfPath}" "${glbPath}"`, { stdio: 'ignore' });
    return true;
  } catch (err) {
    console.error(`Error processing ${gltfPath}:`, err);
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

async function processHairstyles() {
  const dir = path.join(QUATERNIUS_DIR, 'Universal Base Characters[Standard]', 'Hairstyles', 'Rigged to Head Bone', 'glTF (Godot -Unreal)');
  if (!fs.existsSync(dir)) {
    console.warn(`Hairstyles dir not found: ${dir}`);
    return;
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.gltf'));
  for (const f of files) {
    const gltfPath = path.join(dir, f);
    const glbPath = path.join(STAGING_DIR, f.replace('.gltf', '.glb'));
    
    if (runGltfTransform(gltfPath, glbPath)) {
      await uploadGlb(glbPath, {
        name: f.replace('.gltf', ''),
        type: 'MODEL',
        tags: ['modular', 'character-component', 'quaternius', 'hair'],
        isModularComponent: true,
        componentCategory: 'hair',
        baseBodyType: 'unspecified',
        presentation: { mode: '3D' },
      });
    }
  }
}

async function main() {
  await processHairstyles();
  console.log('--- Hairstyles Complete ---');
}

main().catch(console.error);
