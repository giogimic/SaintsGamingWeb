import fs from 'fs';
import path from 'path';
import os from 'node:os';
import { prisma } from '../src/web/lib/prisma';
import { ingestAsset } from '../src/web/lib/assetUpload';
import { uploadFile } from '../src/web/lib/upload';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { inspectQuaterniusAnimationBank, inspectQuaterniusRiggedModel } from './lib/quaterniusAnimationMetadata';
import { getQuaterniusOutfitTextureVariants } from '../src/shared/game/quaterniusOutfitTextures';
const convert = require('fbx2gltf');

const SG_ANIMS = process.env.QUATERNIUS_SOURCE_DIR?.trim()
  || path.join(os.homedir(), 'OneDrive', 'Desktop', 'sg anims');
const CHARACTERS_DIR = path.join(SG_ANIMS, 'characters');
const MONSTERS_DIR = path.join(SG_ANIMS, 'monsters');
const ITEMS_DIR = path.join(SG_ANIMS, 'items');
const PUBLIC_QUATERNIUS_DIR = path.join(process.cwd(), 'public', 'models', 'quaternius');
const STAGING_DIR = path.join(process.cwd(), 'public', 'uploads', 'staging');
let activeUserId = 'system-quaternius';

async function getOrCreateSystemUserId(): Promise<string> {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { id: 'system-quaternius' },
        { username: 'quaternius_system' },
        { permissionLevel: { gte: 100 } }
      ]
    },
    select: { id: true }
  });
  if (existing) return existing.id;
  const created = await prisma.user.create({
    data: {
      id: 'system-quaternius',
      displayName: 'Quaternius (System)',
      username: 'quaternius_system',
      email: 'quaternius@saintsgaming.net',
      permissionLevel: 100,
    }
  });
  return created.id;
}

// Configure glTF-transform IO
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

function listFilesRecursive(dirPath: string, predicate: (fileName: string) => boolean): string[] {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) return listFilesRecursive(fullPath, predicate);
    return predicate(entry.name) ? [fullPath] : [];
  });
}

async function main() {
  console.log('Starting Quaternius ingestion...');
  fs.mkdirSync(STAGING_DIR, { recursive: true });
  activeUserId = await getOrCreateSystemUserId();

  // 1. Base Characters (Quaternius Male & Female Base for Playable Archetypes)
  await processBaseCharacters();

  // 2. Hairstyles & Eyebrows (Modular Face/Hair components)
  await processHairstyles();

  // 3. Modular Outfits (Playable & NPC/Monster compatible)
  await processModularOutfits();

  // 4. Assembled outfit sets for one-piece wardrobe selection
  await processAssembledOutfits();

  // 5. Ultimate RPG Pack (Items & Icons)
  await processUltimateRPG();

  // 6. Bestiary Dungeon Monsters (Imp, Puglin)
  await processBestiary();

  // 7. Universal Animations (Vol. 1 & Vol. 2)
  await processAnimationLibrary();

  console.log('Done!');
}

async function ingest(filePath: string, name: string, options: any) {
  if (!fs.existsSync(filePath)) {
    console.warn('  [Skipping] File not found:', filePath);
    return;
  }
  
  const buffer = fs.readFileSync(filePath);
  const file = new File([buffer], path.basename(filePath), { type: 'model/gltf-binary' });

  console.log(`Ingesting: ${name}...`);
  try {
    const res = await ingestAsset({
      userId: activeUserId,
      file,
      gameId: 'saints',
      name,
      createUsable: true,
      visibility: 'COMMUNITY',
      moderationStatus: 'APPROVED',
      ...options,
    });
    if (!res.success) {
      console.error(`  Failed to ingest ${name}:`, res.error);
    } else {
      console.log(`  Success! Asset ID: ${res.sourceAsset?.id}`);
    }
  } catch (err) {
    console.error(`  Error ingesting ${name}:`, err);
  }
}

async function processAnimationLibrary() {
  console.log('--- Processing Animation Library ---');
  const packs = [
    { dir: path.join(CHARACTERS_DIR, 'Universal Animation Library[Standard]', 'Unreal-Godot'), label: 'Universal Animation Library 1' },
    { dir: path.join(CHARACTERS_DIR, 'Universal Animation Library 2[Standard]', 'Unreal-Godot'), label: 'Universal Animation Library 2' },
  ];
  for (const pack of packs) {
    if (!fs.existsSync(pack.dir)) throw new Error(`Animation pack folder not found: ${pack.dir}`);
    const files = fs.readdirSync(pack.dir).filter((file) => /^UAL[12]_Standard(?:_RM)?\.glb$/i.test(file));
    for (const file of files) {
      const filePath = path.join(pack.dir, file);
      const presentation = await inspectQuaterniusAnimationBank(filePath);
      const volume = /^UAL2/i.test(file) ? 'Vol. 2' : 'Vol. 1';
      const rootMotion = /_RM\.glb$/i.test(file);
      await ingest(filePath, `Quaternius Universal Animations ${volume}${rootMotion ? ' (Root Motion)' : ''}`, {
        type: 'ANIMATION',
        pack: 'quaternius',
        skeleton: 'quaternius_universal',
        tags: ['animation', 'humanoid', 'quaternius', 'animation-bank', 'rig:quaternius_universal', rootMotion ? 'root-motion' : 'in-place'],
        presentation: { ...presentation, animationProfileId: `quaternius_${/^UAL2/i.test(file) ? '2_' : ''}native${rootMotion ? '_rm' : ''}` },
      });
    }
  }
}

async function processBestiary() {
  console.log('--- Processing Bestiary ---');
  const basePath = path.join(MONSTERS_DIR, 'Bestiary - Dungeon Monsters Kit[Standard]', 'Exports', 'GLB (Godot-Unreal)');
  if (!fs.existsSync(basePath)) throw new Error(`Bestiary export folder not found: ${basePath}`);
  const files = fs.readdirSync(basePath).filter(f => f.endsWith('.glb'));

  for (const f of files) {
    const name = f.replace('.glb', '');
    const filePath = path.join(basePath, f);
    const presentation = await inspectQuaterniusRiggedModel(filePath);
    const rigFamilyTag = String(presentation.rigAnalysis?.family || 'CUSTOM').toLowerCase().replace(/_/g, '-');
    await ingest(
      filePath,
      name,
      {
        type: 'CREATURE',
        pack: 'quaternius',
        skeleton: 'creature_custom',
        tags: ['monster', 'hostile', 'quaternius', 'bestiary', 'dungeon', `rig:${rigFamilyTag}`],
        presentation,
      }
    );
  }
}

async function processModularOutfits() {
  console.log('--- Processing Modular Outfits ---');
  const basePath = path.join(CHARACTERS_DIR, 'Modular Character Outfits - Fantasy[Standard]', 'Exports', 'glTF (Godot-Unreal)', 'Modular Parts');
  if (!fs.existsSync(basePath)) throw new Error(`Modular outfit parts folder not found: ${basePath}`);
  const files = fs.readdirSync(basePath).filter(f => f.endsWith('.gltf'));

  for (const f of files) {
    const name = f.replace('.gltf', '');
    const inPath = path.join(basePath, f);
    const outPath = path.join(STAGING_DIR, name + '.glb');
    
    if (!fs.existsSync(outPath)) {
      console.log(`  Converting ${f} to GLB...`);
      try {
        const document = await io.read(inPath);
        await io.write(outPath, document);
      } catch (err) {
        console.error(`  Failed to convert ${f}:`, err);
        continue;
      }
    }

    let cat = 'clothing';
    if (name.includes('_Arms')) cat = 'arms';
    if (name.includes('_Feet')) cat = 'shoes';
    if (name.includes('_Legs')) cat = 'legs';
    if (name.includes('_Hood')) cat = 'hat';
    if (name.includes('_Pauldron')) cat = 'accessory';

    const isMale = name.includes('Male_');
    const variant = name.includes('Peasant') ? 'peasant' : 'ranger';

    await ingest(
      outPath,
      name,
      {
        type: 'MODEL',
        pack: 'quaternius',
        skeleton: 'quaternius_universal',
        tags: ['modular', 'character-component', 'quaternius', cat, variant, 'playable_outfit', 'npc_outfit', 'creature_outfit'],
        isModularComponent: true,
        componentCategory: cat,
        baseBodyType: isMale ? 'male' : 'female',
        variantFamily: variant,
        showInCharacterCreation: true,
        textureVariants: getQuaterniusOutfitTextureVariants(variant),
        presentation: { mode: '3D' },
        hidesComponents: /_head_hood/i.test(name) ? ['hair'] : [],
      }
    );
  }
}

async function processAssembledOutfits() {
  const sourceDir = path.join(CHARACTERS_DIR, 'Modular Character Outfits - Fantasy[Standard]', 'Exports', 'glTF (Godot-Unreal)', 'Outfits');
  if (!fs.existsSync(sourceDir)) throw new Error(`Assembled outfit folder not found: ${sourceDir}`);
  const outfits = [
    { file: 'Female_Peasant.gltf', baseBodyType: 'female', variantFamily: 'peasant' },
    { file: 'Female_Ranger.gltf', baseBodyType: 'female', variantFamily: 'ranger' },
    { file: 'Male_Peasant.gltf', baseBodyType: 'male', variantFamily: 'peasant' },
    { file: 'Male_Ranger.gltf', baseBodyType: 'male', variantFamily: 'ranger' },
  ];

  for (const outfit of outfits) {
    const sourcePath = path.join(sourceDir, outfit.file);
    if (!fs.existsSync(sourcePath)) throw new Error(`Expected assembled outfit is missing: ${sourcePath}`);
    const outputName = `${path.basename(outfit.file, '.gltf').replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()}_outfit.glb`;
    const outputPath = path.join(STAGING_DIR, outputName);
    const document = await io.read(sourcePath);
    await io.write(outputPath, document);
    const presentation = await inspectQuaterniusRiggedModel(outputPath);
    if (presentation.rigAnalysis?.family !== 'HUMANOID_BIPED') {
      throw new Error(`${outfit.file} did not preserve a compatible humanoid rig.`);
    }

    await ingest(outputPath, `${outfit.baseBodyType === 'male' ? 'Male' : 'Female'} ${outfit.variantFamily} Outfit`, {
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

async function processHairstyles() {
  console.log('--- Processing Hairstyles & Eyebrows ---');
  const basePath = path.join(CHARACTERS_DIR, 'Universal Base Characters[Standard]', 'Hairstyles', 'Rigged to Head Bone', 'glTF (Godot -Unreal)');
  if (!fs.existsSync(basePath)) throw new Error(`Hairstyle export folder not found: ${basePath}`);

  const files = fs.readdirSync(basePath).filter((f) => f.endsWith('.gltf'));
  for (const f of files) {
    const name = f.replace('.gltf', '');
    const inPath = path.join(basePath, f);
    const outPath = path.join(STAGING_DIR, name + '.glb');

    if (!fs.existsSync(outPath)) {
      console.log(`  Converting ${f} to GLB...`);
      try {
        const document = await io.read(inPath);
        await io.write(outPath, document);
      } catch (err) {
        console.error(`  Failed to convert ${f}:`, err);
        continue;
      }
    }

    const lower = name.toLowerCase();
    const isEyebrow = lower.includes('eyebrow');
    const isBeard = lower.includes('beard');
    const cat = isBeard ? 'beard' : isEyebrow ? 'face' : 'hair';

    await ingest(
      outPath,
      name,
      {
        type: 'MODEL',
        pack: 'quaternius',
        skeleton: 'quaternius_universal',
        tags: ['modular', 'character-component', 'quaternius', cat, isEyebrow ? 'eyebrow' : (isBeard ? 'facial-hair' : 'hairstyle')],
        isModularComponent: true,
        componentCategory: cat,
        baseBodyType: 'unspecified',
        showInCharacterCreation: true,
        hidesComponents: [],
        presentation: { mode: '3D' },
      }
    );
  }
}

async function processBaseCharacters() {
  console.log('--- Processing Base Characters ---');
  const bases = [
    { gender: 'female', path: path.join(PUBLIC_QUATERNIUS_DIR, 'quaternius_base_female.glb') },
    { gender: 'male', path: path.join(PUBLIC_QUATERNIUS_DIR, 'quaternius_base_male.glb') },
  ];
  for (const base of bases) {
    if (!fs.existsSync(base.path)) throw new Error(`Prepared Quaternius base is missing: ${base.path}. Run scripts/prepare-quaternius-base-regions.ts first.`);
    const isMale = base.gender === 'male';
    const presentation = await inspectQuaterniusRiggedModel(base.path);
    await ingest(base.path, `Quaternius ${base.gender} base`, {
      type: 'CHARACTER',
      pack: 'quaternius',
      skeleton: 'quaternius_universal',
      baseBodyType: base.gender,
      tags: ['playable', 'humanoid', 'base-body', 'quaternius', base.gender, 'character_creator', 'archetype_base'],
      isPlayable: true,
      showInCharacterCreation: true,
      presentation: {
        ...presentation,
        character: {
          type: '3D_MODEL',
          isCustomizable: true,
          supportedComponents: ['hair', 'face', 'clothing', 'arms', 'legs', 'shoes', 'accessory', 'hat'],
          attachmentPoints: ['right_hand', 'left_hand', 'head', 'back'],
        },
      },
    });
  }
}

async function processUltimateRPG() {
  console.log('--- Processing Ultimate RPG Pack ---');
  const basePath = path.join(ITEMS_DIR, 'Ultimate RPG Pack');
  const fbxFiles = listFilesRecursive(basePath, (fileName) => fileName.toLowerCase().endsWith('.fbx'));
  const iconFiles = listFilesRecursive(basePath, (fileName) => fileName.toLowerCase().endsWith('.png'));
  if (fbxFiles.length === 0) throw new Error(`No RPG item FBX files found under ${basePath}`);

  for (const inPath of fbxFiles) {
    const name = path.basename(inPath, path.extname(inPath));
    const relativeName = path.relative(basePath, inPath).replace(/[\\/]/g, '-').replace(/\.fbx$/i, '');
    const outPath = path.join(STAGING_DIR, `${relativeName}.glb`);
    
    if (!fs.existsSync(outPath)) {
      console.log(`  Converting ${f} to GLB...`);
      try {
        await convert(inPath, outPath, ['--binary']);
      } catch (err) {
        console.error(`  Failed to convert ${f}:`, err);
        continue;
      }
    }

    let portraitUrl: string | undefined = undefined;
    const iconPath = iconFiles.find((candidate) => path.basename(candidate).toLowerCase() === `${name.toLowerCase()}.png`);
    if (iconPath) {
        const matchingIcon = path.basename(iconPath);
        const iconBuffer = fs.readFileSync(iconPath);
        const iconFile = new File([iconBuffer], matchingIcon, { type: 'image/png' });
        try {
          const iconRes = await uploadFile(iconFile);
          if (iconRes.url) {
            portraitUrl = iconRes.url;
          }
        } catch (e) {
          console.error(`  Failed to upload icon for ${name}:`, e);
        }
    }

    await ingest(
      outPath,
      name,
      {
        type: 'ITEM',
        pack: 'quaternius',
        tags: ['item', 'prop', 'quaternius', 'rpg'],
        presentation: { mode: '3D', portraitUrl },
      }
    );
  }
}

main().catch(console.error);
