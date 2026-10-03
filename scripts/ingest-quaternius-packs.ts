import fs from 'fs';
import path from 'path';
import { prisma } from '../src/web/lib/prisma';
import { ingestAsset } from '../src/web/lib/assetUpload';
import { uploadFile } from '../src/web/lib/upload';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const convert = require('fbx2gltf');

const SG_ANIMS = 'C:\\Users\\Matth\\OneDrive\\Desktop\\sg anims';
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

async function main() {
  console.log('Starting Quaternius ingestion...');
  activeUserId = await getOrCreateSystemUserId();

  // 1. Base Characters (Quaternius Male & Female Base for Playable Archetypes)
  await processBaseCharacters();

  // 2. Hairstyles & Eyebrows (Modular Face/Hair components)
  await processHairstyles();

  // 3. Modular Outfits (Playable & NPC/Monster compatible)
  await processModularOutfits();

  // 4. Ultimate RPG Pack (Items & Icons)
  await processUltimateRPG();

  // 5. Bestiary Dungeon Monsters (Imp, Puglin)
  await processBestiary();

  // 6. Universal Animations (Vol. 1 & Vol. 2)
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
  const basePath = path.join(SG_ANIMS, 'Universal Animation Library[Standard]', 'Unreal-Godot');
  
  await ingest(
    path.join(basePath, 'UAL1_Standard.glb'),
    'Quaternius Universal Animations Vol. 1',
    {
      type: 'ANIMATION',
      tags: ['animation', 'humanoid', 'quaternius', 'animation-bank'],
      presentation: {
        mode: '3D',
        animations: {
          source: 'embedded',
          targetSkeleton: 'quaternius_universal',
        },
      },
    }
  );

  const basePath2 = path.join(SG_ANIMS, 'Universal Animation Library 2[Standard]', 'Unreal-Godot');
  await ingest(
    path.join(basePath2, 'UAL2_Standard.glb'),
    'Quaternius Universal Animations Vol. 2',
    {
      type: 'ANIMATION',
      tags: ['animation', 'humanoid', 'quaternius', 'animation-bank'],
      presentation: {
        mode: '3D',
        animations: {
          source: 'embedded',
          targetSkeleton: 'quaternius_universal',
        },
      },
    }
  );
}

async function processBestiary() {
  console.log('--- Processing Bestiary ---');
  const basePath = path.join(SG_ANIMS, 'Bestiary - Dungeon Monsters Kit[Standard]', 'Exports', 'GLB (Godot-Unreal)');
  
  if (!fs.existsSync(basePath)) return;
  const files = fs.readdirSync(basePath).filter(f => f.endsWith('.glb'));

  for (const f of files) {
    const name = f.replace('.glb', '');
    await ingest(
      path.join(basePath, f),
      name,
      {
        type: 'CREATURE',
        tags: ['monster', 'hostile', 'quaternius', 'bestiary', 'dungeon'],
        presentation: {
          mode: '3D',
          animations: { source: 'embedded' },
        },
      }
    );
  }
}

async function processModularOutfits() {
  console.log('--- Processing Modular Outfits ---');
  const basePath = path.join(SG_ANIMS, 'Modular Character Outfits - Fantasy[Standard]', 'Exports', 'glTF (Godot-Unreal)', 'Modular Parts');
  
  if (!fs.existsSync(basePath)) return;
  const files = fs.readdirSync(basePath).filter(f => f.endsWith('.gltf'));

  for (const f of files) {
    const name = f.replace('.gltf', '');
    const inPath = path.join(basePath, f);
    const outPath = path.join(basePath, name + '.glb');
    
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
        tags: ['modular', 'character-component', 'quaternius', cat, variant, 'playable_outfit', 'npc_outfit', 'creature_outfit'],
        isModularComponent: true,
        componentCategory: cat,
        baseBodyType: isMale ? 'male' : 'female',
        variantFamily: variant,
        presentation: { mode: '3D' },
        hidesComponents: cat === 'hat' ? ['hair'] : [],
      }
    );
  }
}

async function processHairstyles() {
  console.log('--- Processing Hairstyles & Eyebrows ---');
  const basePath = path.join(SG_ANIMS, 'Universal Base Characters[Standard]', 'Hairstyles', 'Rigged to Head Bone', 'glTF (Godot -Unreal)');
  if (!fs.existsSync(basePath)) return;

  const files = fs.readdirSync(basePath).filter((f) => f.endsWith('.gltf'));
  for (const f of files) {
    const name = f.replace('.gltf', '');
    const inPath = path.join(basePath, f);
    const outPath = path.join(basePath, name + '.glb');

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
        tags: ['modular', 'character-component', 'quaternius', cat, isEyebrow ? 'eyebrow' : (isBeard ? 'facial-hair' : 'hairstyle')],
        isModularComponent: true,
        componentCategory: cat,
        baseBodyType: 'unspecified',
        presentation: { mode: '3D' },
      }
    );
  }
}

async function processBaseCharacters() {
  console.log('--- Processing Base Characters ---');
  const basePath = path.join(SG_ANIMS, 'Universal Base Characters[Standard]', 'Base Characters', 'Godot - UE');
  
  if (!fs.existsSync(basePath)) return;
  const files = ['Superhero_Female_FullBody.gltf', 'Superhero_Male_FullBody.gltf'];

  for (const f of files) {
    const name = f.replace('.gltf', '');
    const inPath = path.join(basePath, f);
    const outPath = path.join(basePath, name + '.glb');
    
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

    const isMale = name.includes('Male');

    await ingest(
      outPath,
      isMale ? 'Quaternius Male Base' : 'Quaternius Female Base',
      {
        type: 'CHARACTER',
        tags: ['playable', 'humanoid', 'base-body', 'quaternius', isMale ? 'male' : 'female', 'character_creator', 'archetype_base'],
        isPlayable: true,
        showInCharacterCreation: true,
        presentation: {
          mode: '3D',
          character: {
            type: '3D_MODEL',
            isCustomizable: true,
            supportedComponents: ['hair', 'face', 'clothing', 'arms', 'legs', 'shoes', 'accessory', 'hat'],
            attachmentPoints: ['right_hand', 'left_hand', 'head', 'back'],
          },
        },
      }
    );
  }
}

async function processUltimateRPG() {
  console.log('--- Processing Ultimate RPG Pack ---');
  const basePath = path.join(SG_ANIMS, 'Ultimate RPG Pack');
  const fbxDir = path.join(basePath, 'FBX-20261002T201805Z-1-001', 'FBX');
  const iconDir = path.join(basePath, 'Icons-20261002T201809Z-1-001', 'Icons');
  
  if (!fs.existsSync(fbxDir)) return;
  const files = fs.readdirSync(fbxDir).filter(f => f.endsWith('.fbx'));

  for (const f of files) {
    const name = f.replace('.fbx', '');
    const inPath = path.join(fbxDir, f);
    const outPath = path.join(fbxDir, name + '.glb');
    
    if (!fs.existsSync(outPath)) {
      console.log(`  Converting ${f} to GLB...`);
      try {
        await convert(inPath, outPath, ['--binary']);
      } catch (err) {
        console.error(`  Failed to convert ${f}:`, err);
        continue;
      }
    }

    // Try to find matching icon
    // FBX might be Sword_big.fbx, icon might be Sword_Big.png (case insensitive matching)
    let portraitUrl: string | undefined = undefined;
    if (fs.existsSync(iconDir)) {
      const icons = fs.readdirSync(iconDir);
      const matchingIcon = icons.find(i => i.toLowerCase() === name.toLowerCase() + '.png');
      if (matchingIcon) {
        const iconPath = path.join(iconDir, matchingIcon);
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
    }

    await ingest(
      outPath,
      name,
      {
        type: 'ITEM',
        tags: ['item', 'prop', 'quaternius', 'rpg'],
        presentation: { mode: '3D', portraitUrl },
      }
    );
  }
}

main().catch(console.error);
