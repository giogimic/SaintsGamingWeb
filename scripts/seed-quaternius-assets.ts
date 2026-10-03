import fs from 'fs';
import path from 'path';
import os from 'node:os';
import { execSync } from 'child_process';
import { prisma } from '../src/web/lib/prisma';
import { ingestAsset } from '../src/web/lib/assetUpload';
import { inspectQuaterniusAnimationBank, inspectQuaterniusRiggedModel } from './lib/quaterniusAnimationMetadata';
import { getQuaterniusOutfitTextureVariants } from '../src/shared/game/quaterniusOutfitTextures';

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

const QUATERNIUS_DIR = process.env.QUATERNIUS_SOURCE_DIR?.trim()
  || path.join(os.homedir(), 'OneDrive', 'Desktop', 'sg anims');
const CHARACTERS_DIR = path.join(QUATERNIUS_DIR, 'characters');
const MONSTERS_DIR = path.join(QUATERNIUS_DIR, 'monsters');
const ITEMS_DIR = path.join(QUATERNIUS_DIR, 'items');
const PUBLIC_QUATERNIUS_DIR = path.join(__dirname, '..', 'public', 'models', 'quaternius');
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

function listFilesRecursive(dirPath: string, predicate: (fileName: string) => boolean): string[] {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) return listFilesRecursive(fullPath, predicate);
    return predicate(entry.name) ? [fullPath] : [];
  });
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
  const bases = [
    { gender: 'female', path: path.join(PUBLIC_QUATERNIUS_DIR, 'quaternius_base_female.glb') },
    { gender: 'male', path: path.join(PUBLIC_QUATERNIUS_DIR, 'quaternius_base_male.glb') },
  ];
  for (const base of bases) {
    if (!fs.existsSync(base.path)) throw new Error(`Prepared Quaternius base is missing: ${base.path}. Run scripts/prepare-quaternius-base-regions.ts first.`);
    const rigPresentation = await inspectQuaterniusRiggedModel(base.path);
    await uploadGlb(base.path, {
      name: `Quaternius Base ${base.gender === 'male' ? 'Male' : 'Female'}`,
      type: 'CHARACTER',
      pack: 'quaternius',
      skeleton: 'quaternius_universal',
      baseBodyType: base.gender,
      tags: ['playable', 'humanoid', 'base-body', 'quaternius', base.gender, 'character_creator'],
      isModularComponent: false,
      showInCharacterCreation: true,
      isPlayable: true,
      presentation: {
        ...rigPresentation,
        character: {
          type: '3D_MODEL',
          isCustomizable: true,
          supportedComponents: ['hair', 'hat', 'face', 'clothing', 'arms', 'legs', 'shoes', 'accessory'],
          attachmentPoints: ['right_hand', 'left_hand', 'head', 'back'],
        },
      },
    });
  }
}

async function processItems() {
  const dir = path.join(ITEMS_DIR, 'Ultimate RPG Pack');
  if (!fs.existsSync(dir)) throw new Error(`Ultimate RPG Pack folder not found: ${dir}`);

  const files = listFilesRecursive(dir, (fileName) => fileName.toLowerCase().endsWith('.fbx'));
  for (const fbxPath of files) {
    const relativeName = path.relative(dir, fbxPath).replace(/\\/g, '-').replace(/\//g, '-').replace(/\.fbx$/i, '');
    const itemName = path.basename(fbxPath, path.extname(fbxPath));
    const glbPath = path.join(STAGING_DIR, `${relativeName}.glb`);
    
    if (runFbx2Gltf(fbxPath, glbPath)) {
      await uploadGlb(glbPath, {
        name: itemName,
        type: 'ITEM',
        pack: 'quaternius',
        tags: ['item', 'prop', 'quaternius', 'rpg'],
        presentation: { mode: '3D' },
      });
    }
  }
}

async function processHairstyles() {
  const dir = path.join(CHARACTERS_DIR, 'Universal Base Characters[Standard]', 'Hairstyles', 'Rigged to Head Bone', 'glTF (Godot -Unreal)');
  if (!fs.existsSync(dir)) {
    throw new Error(`Hairstyles export folder not found: ${dir}`);
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.gltf'));
  for (const f of files) {
    const gltfPath = path.join(dir, f);
    const glbPath = path.join(STAGING_DIR, f.replace('.gltf', '.glb'));
    
    if (runGltfTransform(gltfPath, glbPath)) {
      const lower = path.basename(f, '.gltf').toLowerCase();
      const category = lower.includes('eyebrow') ? 'face' : lower.includes('beard') ? 'beard' : 'hair';
      await uploadGlb(glbPath, {
        name: f.replace('.gltf', ''),
        type: 'MODEL',
        pack: 'quaternius',
        skeleton: 'quaternius_universal',
        tags: ['modular', 'character-component', 'quaternius', category],
        isModularComponent: true,
        componentCategory: category,
        baseBodyType: 'unspecified',
        showInCharacterCreation: true,
        presentation: { mode: '3D' },
      });
    }
  }
}

async function processBestiary() {
  const dir = path.join(MONSTERS_DIR, 'Bestiary - Dungeon Monsters Kit[Standard]', 'Exports', 'GLB (Godot-Unreal)');
  if (!fs.existsSync(dir)) throw new Error(`Bestiary export folder not found: ${dir}`);

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.glb'));
  for (const f of files) {
    const glbPath = path.join(dir, f);
    const presentation = await inspectQuaterniusRiggedModel(glbPath);
    await uploadGlb(glbPath, {
      name: f.replace('.glb', ''),
      type: 'CREATURE',
      pack: 'quaternius',
      skeleton: 'creature_custom',
      tags: ['monster', 'hostile', 'quaternius', 'bestiary', 'dungeon', `rig:${String(presentation.rigAnalysis?.family || 'custom').toLowerCase().replace(/_/g, '-')}`],
      presentation,
    });
  }
}

async function processAnimations() {
  const packs = [
    { dir: path.join(CHARACTERS_DIR, 'Universal Animation Library[Standard]', 'Unreal-Godot') },
    { dir: path.join(CHARACTERS_DIR, 'Universal Animation Library 2[Standard]', 'Unreal-Godot') },
  ];

  for (const pack of packs) {
    if (!fs.existsSync(pack.dir)) throw new Error(`Animation pack folder not found: ${pack.dir}`);
    const files = fs.readdirSync(pack.dir).filter(f => /^UAL[12]_Standard(?:_RM)?\.glb$/i.test(f));
    for (const f of files) {
      const glbPath = path.join(pack.dir, f);
      const presentation = await inspectQuaterniusAnimationBank(glbPath);
      const volume = /^UAL2/i.test(f) ? 'Vol. 2' : 'Vol. 1';
      const rootMotion = /_RM\.glb$/i.test(f);
      await uploadGlb(glbPath, {
        name: `Quaternius Universal Animations ${volume}${rootMotion ? ' (Root Motion)' : ''}`,
        type: 'ANIMATION',
        pack: 'quaternius',
        skeleton: 'quaternius_universal',
        tags: ['animation', 'humanoid', 'quaternius', 'animation-bank', 'rig:quaternius_universal', rootMotion ? 'root-motion' : 'in-place'],
        presentation: { ...presentation, animationProfileId: `quaternius_${/^UAL2/i.test(f) ? '2_' : ''}native${rootMotion ? '_rm' : ''}` },
      });
    }
  }
}

async function processModularOutfits() {
  const dir = path.join(CHARACTERS_DIR, 'Modular Character Outfits - Fantasy[Standard]', 'Exports', 'glTF (Godot-Unreal)', 'Modular Parts');
  if (!fs.existsSync(dir)) throw new Error(`Modular outfit parts folder not found: ${dir}`);

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
    
    const hidesComponents = /_head_hood/i.test(lower) ? ['hair'] : [];
    const textureVariants = getQuaterniusOutfitTextureVariants(variantFamily);

    if (runGltfTransform(gltfPath, glbPath)) {
      await uploadGlb(glbPath, {
        name: f.replace('.gltf', ''),
        type: 'MODEL',
        pack: 'quaternius',
        skeleton: 'quaternius_universal',
        tags: ['modular', 'character-component', 'quaternius', componentCategory],
        isModularComponent: true,
        componentCategory,
        baseBodyType,
        variantFamily,
        hidesComponents,
        showInCharacterCreation: true,
        textureVariants,
        presentation: { mode: '3D' },
      });
    }
  }
}

async function processAssembledOutfits() {
  const sourceDir = path.join(CHARACTERS_DIR, 'Modular Character Outfits - Fantasy[Standard]', 'Exports', 'glTF (Godot-Unreal)', 'Outfits');
  if (!fs.existsSync(sourceDir)) throw new Error(`Assembled outfit folder not found: ${sourceDir}`);
  const outfits = [
    { sourceName: 'Male_Peasant', baseBodyType: 'male', variantFamily: 'peasant' },
    { sourceName: 'Female_Peasant', baseBodyType: 'female', variantFamily: 'peasant' },
    { sourceName: 'Male_Ranger', baseBodyType: 'male', variantFamily: 'ranger' },
    { sourceName: 'Female_Ranger', baseBodyType: 'female', variantFamily: 'ranger' },
  ];

  for (const outfit of outfits) {
    const sourcePath = path.join(sourceDir, `${outfit.sourceName}.gltf`);
    if (!fs.existsSync(sourcePath)) throw new Error(`Expected assembled outfit is missing: ${sourcePath}`);
    const filePath = path.join(STAGING_DIR, `${outfit.sourceName.toLowerCase()}_outfit.glb`);
    if (!runGltfTransform(sourcePath, filePath)) throw new Error(`Could not convert assembled outfit: ${sourcePath}`);
    const presentation = await inspectQuaterniusRiggedModel(filePath);
    if (presentation.rigAnalysis?.family !== 'HUMANOID_BIPED') throw new Error(`${outfit.sourceName} outfit has no compatible humanoid rig.`);
    await uploadGlb(filePath, {
      name: `${outfit.baseBodyType === 'male' ? 'Male' : 'Female'} ${outfit.variantFamily} Outfit`,
      type: 'MODEL',
      pack: 'quaternius',
      skeleton: 'quaternius_universal',
      tags: ['modular', 'character-component', 'quaternius', 'clothing', 'playable_outfit', 'complete-outfit', outfit.baseBodyType, outfit.variantFamily],
      isModularComponent: true,
      componentCategory: 'clothing',
      baseBodyType: outfit.baseBodyType,
      variantFamily: outfit.variantFamily,
      hidesComponents: ['clothing', 'arms', 'legs', 'shoes'],
      showInCharacterCreation: true,
      isPlayable: false,
      textureVariants: getQuaterniusOutfitTextureVariants(outfit.variantFamily),
      presentation,
    });
  }
}

async function main() {
  ensureDir(STAGING_DIR);
  await ensureSystemUser();

  console.log('--- Seeding Quaternius Assets ---');
  await processBaseCharacters();
  await processHairstyles();
  await processModularOutfits();
  await processAssembledOutfits();
  await processItems();
  await processBestiary();
  await processAnimations();
  console.log('--- Seeding Complete ---');
}

main().catch(console.error);
