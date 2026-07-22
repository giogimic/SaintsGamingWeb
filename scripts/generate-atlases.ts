/**
 * Generate Texture Atlases for WebGL Rendering
 * 
 * This script combines individual tileset images into texture atlases
 * to reduce draw calls and improve WebGL rendering performance.
 * 
 * Output: public/tuxemon-assets/atlases/
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ASSETS_DIR = path.join(process.cwd(), 'public', 'tuxemon-assets');
const ATLAS_DIR = path.join(ASSETS_DIR, 'atlases');
const TILESETS_DIR = path.join(ASSETS_DIR, 'tilesets');
const NPC_DIR = path.join(ASSETS_DIR, 'npc');
const MONSTER_DIR = path.join(ASSETS_DIR, 'monster');
const ITEMS_DIR = path.join(ASSETS_DIR, 'items');

interface AtlasFrame {
  filename: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AtlasData {
  filename: string;
  width: number;
  height: number;
  frames: AtlasFrame[];
}

// Category mappings for tilesets
const TILESET_CATEGORIES: Record<string, string[]> = {
  outdoor: ['core_outdoor', 'core_outdoor_nature', 'core_outdoor_water'],
  indoor: ['core_indoor_floors', 'core_indoor_walls', 'core_indoor_stairs'],
  buildings: ['core_buildings', 'core_city_and_country'],
  cave: ['Cave_Tiles'],
  terrain: ['Terrain_by', 'KelvinShadewing_Terrain'],
};

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function generateTilesetAtlases() {
  console.log('Generating tileset atlases...');
  
  for (const [category, patterns] of Object.entries(TILESET_CATEGORIES)) {
    const frames: AtlasFrame[] = [];
    const images: Buffer[] = [];
    
    // Find matching tilesets
    const tilesetFiles = fs.readdirSync(TILESETS_DIR)
      .filter(f => f.endsWith('.png'))
      .filter(f => patterns.some(p => f.includes(p)));
    
    let currentX = 0;
    let currentY = 0;
    let maxHeight = 0;
    const atlasWidth = 2048; // Standard atlas width
    
    for (const file of tilesetFiles) {
      const filePath = path.join(TILESETS_DIR, file);
      const image = sharp(filePath);
      const metadata = await image.metadata();
      
      if (!metadata.width || !metadata.height) continue;
      
      // Check if we need to wrap to next row
      if (currentX + metadata.width > atlasWidth) {
        currentX = 0;
        currentY += maxHeight;
        maxHeight = 0;
      }
      
      frames.push({
        filename: file,
        x: currentX,
        y: currentY,
        width: metadata.width,
        height: metadata.height,
      });
      
      const buffer = await image.toBuffer();
      images.push(buffer);
      
      currentX += metadata.width;
      maxHeight = Math.max(maxHeight, metadata.height);
    }
    
    // Create composite atlas
    const atlasHeight = currentY + maxHeight;
    const composites = frames.map((frame, i) => ({
      input: images[i],
      left: frame.x,
      top: frame.y,
    }));
    
    const atlasPath = path.join(ATLAS_DIR, `tilesets_${category}.png`);
    await sharp({
      create: {
        width: atlasWidth,
        height: atlasHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(composites)
      .png()
      .toFile(atlasPath);
    
    // Save atlas metadata
    const atlasData: AtlasData = {
      filename: `tilesets_${category}.png`,
      width: atlasWidth,
      height: atlasHeight,
      frames,
    };
    
    const metaPath = path.join(ATLAS_DIR, `tilesets_${category}.json`);
    fs.writeFileSync(metaPath, JSON.stringify(atlasData, null, 2));
    
    console.log(`  ✓ Generated ${category} atlas: ${frames.length} tilesets`);
  }
}

async function generateNPCAtlas() {
  console.log('Generating NPC atlas...');
  
  const frames: AtlasFrame[] = [];
  const npcFiles = fs.readdirSync(NPC_DIR).filter(f => f.endsWith('.png'));
  
  let currentX = 0;
  let currentY = 0;
  let maxHeight = 0;
  const atlasWidth = 2048;
  const composites: any[] = [];
  
  for (const file of npcFiles) {
    const filePath = path.join(NPC_DIR, file);
    const image = sharp(filePath);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) continue;
    
    if (currentX + metadata.width > atlasWidth) {
      currentX = 0;
      currentY += maxHeight;
      maxHeight = 0;
    }
    
    frames.push({
      filename: file,
      x: currentX,
      y: currentY,
      width: metadata.width,
      height: metadata.height,
    });
    
    composites.push({
      input: filePath,
      left: currentX,
      top: currentY,
    });
    
    currentX += metadata.width;
    maxHeight = Math.max(maxHeight, metadata.height);
  }
  
  const atlasHeight = currentY + maxHeight;
  const atlasPath = path.join(ATLAS_DIR, 'npc_atlas.png');
  
  await sharp({
    create: {
      width: atlasWidth,
      height: atlasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(atlasPath);
  
  const atlasData: AtlasData = {
    filename: 'npc_atlas.png',
    width: atlasWidth,
    height: atlasHeight,
    frames,
  };
  
  const metaPath = path.join(ATLAS_DIR, 'npc_atlas.json');
  fs.writeFileSync(metaPath, JSON.stringify(atlasData, null, 2));
  
  console.log(`  ✓ Generated NPC atlas: ${frames.length} sprites`);
}

async function generateItemAtlas() {
  console.log('Generating item atlas...');
  
  const frames: AtlasFrame[] = [];
  const itemFiles = fs.readdirSync(ITEMS_DIR).filter(f => f.endsWith('.png'));
  
  let currentX = 0;
  let currentY = 0;
  let maxHeight = 0;
  const atlasWidth = 1024; // Smaller atlas for items
  const composites: any[] = [];
  
  for (const file of itemFiles) {
    const filePath = path.join(ITEMS_DIR, file);
    const image = sharp(filePath);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) continue;
    
    if (currentX + metadata.width > atlasWidth) {
      currentX = 0;
      currentY += maxHeight;
      maxHeight = 0;
    }
    
    frames.push({
      filename: file,
      x: currentX,
      y: currentY,
      width: metadata.width,
      height: metadata.height,
    });
    
    composites.push({
      input: filePath,
      left: currentX,
      top: currentY,
    });
    
    currentX += metadata.width;
    maxHeight = Math.max(maxHeight, metadata.height);
  }
  
  const atlasHeight = currentY + maxHeight;
  const atlasPath = path.join(ATLAS_DIR, 'item_atlas.png');
  
  await sharp({
    create: {
      width: atlasWidth,
      height: atlasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(atlasPath);
  
  const atlasData: AtlasData = {
    filename: 'item_atlas.png',
    width: atlasWidth,
    height: atlasHeight,
    frames,
  };
  
  const metaPath = path.join(ATLAS_DIR, 'item_atlas.json');
  fs.writeFileSync(metaPath, JSON.stringify(atlasData, null, 2));
  
  console.log(`  ✓ Generated item atlas: ${frames.length} items`);
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Generating Texture Atlases for WebGL          ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
  
  await ensureDir(ATLAS_DIR);
  
  await generateTilesetAtlases();
  await generateNPCAtlas();
  await generateItemAtlas();
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('✓ Atlas generation complete!');
  console.log('═══════════════════════════════════════════════════');
}

main().catch(console.error);