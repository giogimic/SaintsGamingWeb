import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { prisma } from '../src/web/lib/prisma';
import { ingestAsset } from '../src/web/lib/assetUpload';

// Polyfill File for Node.js if needed (Node 20+ has it globally, but just in case)
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

async function ensureSystemUser() {
  let user = await prisma.user.findUnique({ where: { id: SYSTEM_USER_ID } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: SYSTEM_USER_ID,
        displayName: 'Quaternius (System)',
        username: 'quaternius_system',
        email: 'quaternius@saintsgaming.net',
        permissionLevel: 100, // Developer/System
      },
    });
  }
  return user;
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function runFbx2Gltf(fbxPath: string, glbPath: string) {
  console.log(`Converting FBX -> GLB: ${path.basename(fbxPath)}`);
  try {
    // Assuming fbx2gltf is installed or available in node_modules
    execSync(`npx fbx2gltf -i "${fbxPath}" -o "${glbPath}" -b`, { stdio: 'ignore' });
    return true;
  } catch (err) {
    console.error(`Error converting ${fbxPath}:`, err);
    return false;
  }
}

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

async function processBaseCharacters() {
  const dir = path.join(QUATERNIUS_DIR, 'Universal Base Characters[Standard]', 'Base Characters', 'Godot - UE');
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.gltf'));
  for (const f of files) {
    const isMale = f.includes('Male');
    const gltfPath = path.join(dir, f);
    const glbPath = path.join(STAGING_DIR, f.replace('.gltf', '.glb'));
    
    if (runGltfTransform(gltfPath, glbPath)) {
      await uploadGlb(glbPath, {
        name: `Quaternius Base ${isMale ? 'Male' : 'Female'}`,
        type: 'CHARACTER',
        tags: ['playable', 'humanoid', 'base-body', 'quaternius', isMale ? 'male' : 'female'],
        isModularComponent: false,
        showInCharacterCreation: true,
        isPlayable: true,
        presentation: {
          mode: '3D',
          character: {
            type: '3D_MODEL',
            isCustomizable: true,
            supportedComponents: ['hair', 'hat', 'clothing', 'arms', 'legs', 'shoes', 'accessory'],
            attachmentPoints: ['right_hand', 'left_hand', 'head', 'back'],
          },
        },
      });
    }
  }
}

async function processItems() {
  const dir = path.join(QUATERNIUS_DIR, 'Ultimate RPG Pack');
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.fbx'));
  for (const f of files) {
    const fbxPath = path.join(dir, f);
    const glbPath = path.join(STAGING_DIR, f.replace('.fbx', '.glb'));
    const itemName = f.replace('.fbx', '');
    
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

async function processBestiary() {
  const dir = path.join(QUATERNIUS_DIR, 'Bestiary - Dungeon Monsters Kit[Standard]', 'Exports', 'GLB (Godot-Unreal)');
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.glb'));
  for (const f of files) {
    const glbPath = path.join(dir, f);
    await uploadGlb(glbPath, {
      name: f.replace('.glb', ''),
      type: 'CREATURE',
      tags: ['monster', 'hostile', 'quaternius', 'bestiary', 'dungeon'],
      presentation: {
        mode: '3D',
        animations: { source: 'embedded' },
      },
    });
  }
}

async function processAnimations() {
  const packs = [
    { dir: path.join(QUATERNIUS_DIR, 'Universal Animation Library[Standard]', 'Unreal-Godot'), name: 'UAL1' },
    { dir: path.join(QUATERNIUS_DIR, 'Universal Animation Library 2[Standard]', 'Unreal-Godot'), name: 'UAL2' },
  ];

  for (const pack of packs) {
    if (!fs.existsSync(pack.dir)) continue;
    const files = fs.readdirSync(pack.dir).filter(f => f.endsWith('.glb'));
    for (const f of files) {
      const glbPath = path.join(pack.dir, f);
      await uploadGlb(glbPath, {
        name: f.replace('.glb', ''),
        type: 'ANIMATION',
        tags: ['animation', 'humanoid', 'quaternius', 'animation-bank'],
        presentation: {
          mode: '3D',
          animations: {
            source: 'embedded',
            targetSkeleton: 'quaternius_universal',
          },
        },
      });
    }
  }
}

async function processModularOutfits() {
  const dir = path.join(QUATERNIUS_DIR, 'Modular Character Outfits - Fantasy[Standard]', 'Exports', 'glTF (Godot-Unreal)', 'Modular Parts');
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.gltf'));
  for (const f of files) {
    const gltfPath = path.join(dir, f);
    const glbPath = path.join(STAGING_DIR, f.replace('.gltf', '.glb'));
    
    // Determine metadata from filename (e.g. Female_Peasant_Arms.gltf)
    const lower = f.toLowerCase();
    const baseBodyType = lower.includes('female') ? 'female' : 'male';
    const variantFamily = lower.includes('peasant') ? 'peasant' : (lower.includes('ranger') ? 'ranger' : 'fantasy');
    
    let componentCategory = 'accessory';
    if (lower.includes('arms')) componentCategory = 'arms';
    if (lower.includes('body')) componentCategory = 'clothing';
    if (lower.includes('feet')) componentCategory = 'shoes';
    if (lower.includes('legs')) componentCategory = 'legs';
    if (lower.includes('head') || lower.includes('hood')) componentCategory = 'hat';
    if (lower.includes('pauldron')) componentCategory = 'accessory';
    
    const hidesComponents = componentCategory === 'hat' ? ['hair'] : [];

    if (runGltfTransform(gltfPath, glbPath)) {
      await uploadGlb(glbPath, {
        name: f.replace('.gltf', ''),
        type: 'MODEL',
        tags: ['modular', 'character-component', 'quaternius', componentCategory],
        isModularComponent: true,
        componentCategory,
        baseBodyType,
        variantFamily,
        hidesComponents,
        presentation: { mode: '3D' },
      });
    }
  }
}

async function main() {
  ensureDir(STAGING_DIR);
  await ensureSystemUser();

  console.log('--- Seeding Quaternius Assets ---');
  await processBaseCharacters();
  await processHairstyles();
  await processModularOutfits();
  await processItems();
  await processBestiary();
  await processAnimations();
  console.log('--- Seeding Complete ---');
}

main().catch(console.error);
