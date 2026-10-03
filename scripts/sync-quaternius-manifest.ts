import fs from 'node:fs';
import path from 'node:path';
import { inspectQuaterniusAnimationBank, inspectQuaterniusRiggedModel } from './lib/quaterniusAnimationMetadata';
import { getQuaterniusOutfitTextureVariants } from '../src/shared/game/quaterniusOutfitTextures';

const root = process.cwd();
const manifestPath = path.join(root, 'prisma', 'quaternius-manifest.json');
const publicRoot = path.join(root, 'public');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as any[];
const byId = new Map(manifest.map((entry) => [entry.id, entry]));

function getMetadata(entry: any): Record<string, any> {
  try {
    return JSON.parse(entry.metadata || '{}');
  } catch {
    return {};
  }
}

function setMetadata(entry: any, metadata: Record<string, any>) {
  entry.metadata = JSON.stringify(metadata);
  if (entry.source) {
    const localFile = path.join(publicRoot, entry.source.replace(/^\/+/, ''));
    if (fs.existsSync(localFile)) entry.fileSize = fs.statSync(localFile).size;
  }
}

function addTags(entry: any, ...tags: string[]) {
  let current: string[] = [];
  try { current = JSON.parse(entry.tags || '[]'); } catch { current = []; }
  entry.tags = JSON.stringify(Array.from(new Set([...current, ...tags])));
}

function addCategories(entry: any, ...categories: string[]) {
  let current: string[] = [];
  try { current = JSON.parse(entry.categories || '[]'); } catch { current = []; }
  entry.categories = JSON.stringify(Array.from(new Set([...current, ...categories])));
}

async function main() {
  for (const entry of manifest) {
    const metadata = getMetadata(entry);
    if (/^quat-(male|female)_(peasant|ranger)_/.test(entry.id)) {
      const family = entry.id.includes('_peasant_') ? 'peasant' : 'ranger';
      const bodyType = entry.id.startsWith('quat-male_') ? 'male' : 'female';
      const category = metadata.componentCategory || metadata.cat;
      metadata.pack = 'quaternius';
      metadata.skeleton = 'quaternius_universal';
      metadata.baseBodyType = bodyType;
      metadata.variantFamily = family;
      metadata.showInCharacterCreation = true;
      metadata.textureVariants = getQuaterniusOutfitTextureVariants(family);
      if (category === 'hat') metadata.hidesComponents = ['hair'];
      addTags(entry, 'quaternius', 'character_creator', 'playable_outfit');
      addCategories(entry, 'modular', 'character-component', category);
      setMetadata(entry, metadata);
      continue;
    }

    if (/^quat-(hair_|eyebrows_)/.test(entry.id)) {
      const category = entry.id.startsWith('quat-eyebrows_') ? 'face'
        : entry.id.includes('beard') ? 'beard'
          : 'hair';
      metadata.pack = 'quaternius';
      metadata.skeleton = 'quaternius_universal';
      metadata.componentCategory = category;
      metadata.baseBodyType = 'unspecified';
      metadata.showInCharacterCreation = true;
      addTags(entry, 'quaternius', 'character_creator', category);
      addCategories(entry, 'modular', 'character-component', category);
      setMetadata(entry, metadata);
      continue;
    }

    if (/^quat-quaternius_base_(male|female)$/.test(entry.id)) {
      metadata.pack = 'quaternius';
      metadata.skeleton = 'quaternius_universal';
      metadata.baseBodyType = entry.id.endsWith('_male') ? 'male' : 'female';
      metadata.showInCharacterCreation = true;
      addTags(entry, 'quaternius', 'character_creator', 'quaternius_universal');
      setMetadata(entry, metadata);
      continue;
    }

    if (entry.type === 'CREATURE' && ['quat-imp', 'quat-puglin'].includes(entry.id)) {
      metadata.pack = 'quaternius';
      metadata.skeleton = 'creature_custom';
      metadata.showInCharacterCreation = false;
      const filePath = path.join(publicRoot, entry.source.replace(/^\/+/, ''));
      if (!fs.existsSync(filePath)) throw new Error(`Creature model file is missing: ${filePath}`);
      metadata.presentation = await inspectQuaterniusRiggedModel(filePath);
      addTags(entry, 'quaternius', 'creature', 'monster');
      setMetadata(entry, metadata);
    }
  }

  for (const suffix of ['ual1_standard', 'ual1_standard_rm', 'ual2_standard', 'ual2_standard_rm']) {
    const entry = byId.get(`quat-${suffix}`);
    if (!entry) throw new Error(`Quaternius manifest is missing animation bank quat-${suffix}`);
    const filePath = path.join(publicRoot, entry.source.replace(/^\/+/, ''));
    if (!fs.existsSync(filePath)) throw new Error(`Animation bank file is missing: ${filePath}`);
    const metadata = getMetadata(entry);
    metadata.pack = 'quaternius';
    metadata.skeleton = 'quaternius_universal';
    metadata.showInCharacterCreation = false;
    metadata.presentation = await inspectQuaterniusAnimationBank(filePath);
    addTags(entry, 'quaternius', 'humanoid', 'animation-bank', 'rig:quaternius_universal');
    addCategories(entry, 'animation', 'humanoid', 'animation-bank');
    setMetadata(entry, metadata);
  }

  // The four assembled GLTF exports are optional one-piece wardrobe convenience items
  // imported from the user's source archive; only the optimized modular pieces are bundled.
  const assembledOutfitIds = new Set([
    'quat-male_peasant_outfit', 'quat-female_peasant_outfit',
    'quat-male_ranger_outfit', 'quat-female_ranger_outfit',
  ]);
  const retainedEntries = manifest.filter((entry) => !assembledOutfitIds.has(entry.id));
  manifest.splice(0, manifest.length, ...retainedEntries);

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Updated ${manifest.length} Quaternius manifest entries with rig, wardrobe, and animation-bank metadata.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
