/**
 * Build Tile Registry
 * 
 * Parses all .tsx files (Tiled XML format) from public/tuxemon-assets/tilesets/
 * and populates the TileRegistry database with tile definitions.
 * 
 * Each .tsx file defines:
 * - Tile IDs and their pixel coordinates in the sprite sheet
 * - Collision properties
 * - Animation frames
 * - Tile properties (terrain type, environment, etc.)
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { parseStringPromise } from 'xml2js';

const prisma = new PrismaClient();
const TILESETS_DIR = path.join(process.cwd(), 'tuxemon-data');

// Category mapping based on tileset filename
const CATEGORY_MAP: Record<string, string> = {
  'core_outdoor': 'outdoor_grass',
  'core_city_and_country': 'city_road',
  'core_buildings': 'city_building',
  'core_indoor_floors': 'indoor_floor',
  'core_indoor_walls': 'indoor_wall',
  'core_indoor_stairs': 'indoor_stairs',
  'core_outdoor_nature': 'outdoor_tree',
  'core_outdoor_water': 'outdoor_water',
  'core_set_pieces': 'objects',
  'Cave_Tiles': 'cave_floor',
  'Terrain_by': 'terrain_snow',
  'KelvinShadewing_Terrain': 'terrain_desert',
  'furniture': 'indoor_furniture',
  'Furniture_and_Fittings': 'indoor_furniture',
  'kitchen': 'indoor_furniture',
  'couch': 'indoor_furniture',
  'doors': 'city_building',
  'signs': 'objects',
  'items': 'objects',
  'ladders': 'indoor_stairs',
  'stairs': 'indoor_stairs',
  'plants': 'outdoor_tree',
  'Vegetation_and_Outdoor_Fittings': 'outdoor_tree',
  'Waterfall_by_George': 'outdoor_water',
  'Sand_n_water': 'outdoor_water',
  'oceanset_outside': 'outdoor_water',
  'factory': 'special',
  'Office_interiors': 'indoor_floor',
  'gothicvania': 'special',
  'Colored_ceilings': 'indoor_wall',
  'floorandwalls': 'indoor_wall',
  'Interior_Tiles': 'indoor_floor',
  'Interior_Walls': 'indoor_wall',
  'Interior_Floors': 'indoor_floor',
  'Objects_by_ArMM1998': 'objects',
  'Outdoor_Tiles': 'city_road',
  'Outdoor_odds_and_ends': 'outdoor_rock',
  'Set_Pieces_by_Kelvin': 'objects',
  'Terrain_by_George': 'terrain_snow',
  'Tiles_packed': 'outdoor_grass',
  'Tileset': 'outdoor_grass',
  'Tilesets_16x16': 'outdoor_grass',
  'Updated_ground_tiles': 'outdoor_grass',
  'PastTheFuture_Grass_Sand_Snow': 'terrain_snow',
  'mountain': 'outdoor_rock',
  'buildings': 'city_building',
  'MK_buildings': 'city_building',
  'KelvinShadewing_Buildings': 'city_building',
};

// Terrain type mapping
const TERRAIN_MAP: Record<string, string> = {
  'grass': 'grass',
  'outdoor_grass': 'grass',
  'dirt': 'dirt',
  'path': 'dirt',
  'road': 'stone',
  'sidewalk': 'stone',
  'water': 'water',
  'ocean': 'water',
  'river': 'water',
  'waterfall': 'water',
  'sand': 'sand',
  'beach': 'sand',
  'snow': 'snow',
  'ice': 'ice',
  'stone': 'stone',
  'rock': 'stone',
  'cave': 'stone',
  'wood': 'wood',
  'floor': 'wood',
  'carpet': 'wood',
  'lava': 'lava',
  'tree': 'wood',
  'bush': 'grass',
  'flower': 'grass',
  'tall_grass': 'tall_grass',
};

interface TileDefinition {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: Record<string, any>;
  animation?: Array<{ tileid: number; duration: number }>;
}

interface TilesetDefinition {
  name: string;
  tilewidth: number;
  tileheight: number;
  image: string;
  imagewidth: number;
  imageheight: number;
  tilecount: number;
  columns: number;
  tiles: TileDefinition[];
}

async function parseTsxFile(filePath: string): Promise<TilesetDefinition | null> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = await parseStringPromise(content, { explicitArray: false });
    
    const tileset = parsed.tileset;
    if (!tileset) return null;

    const name = tileset.$.name || path.basename(filePath, '.tsx');
    const tilewidth = parseInt(tileset.$.tilewidth || '16');
    const tileheight = parseInt(tileset.$.tileheight || '16');
    const tilecount = parseInt(tileset.$.tilecount || '0');
    const columns = parseInt(tileset.$.columns || '0');

    const image = tileset.image?.$?.source || '';
    const imagewidth = parseInt(tileset.image?.$.width || '0');
    const imageheight = parseInt(tileset.image?.$.height || '0');

    const tiles: TileDefinition[] = [];

    // Parse individual tiles
    if (tileset.tile) {
      const tileArray = Array.isArray(tileset.tile) ? tileset.tile : [tileset.tile];
      
      for (const tile of tileArray) {
        const tileId = parseInt(tile.$.id);
        
        // Calculate pixel coordinates
        const x = (tileId % columns) * tilewidth;
        const y = Math.floor(tileId / columns) * tileheight;

        const tileDef: TileDefinition = {
          id: tileId,
          x,
          y,
          width: tilewidth,
          height: tileheight,
        };

        // Parse properties
        if (tile.properties?.property) {
          const props = Array.isArray(tile.properties.property) 
            ? tile.properties.property 
            : [tile.properties.property];
          
          tileDef.properties = {};
          for (const prop of props) {
            tileDef.properties[prop.$.name] = prop.$.value;
          }
        }

        // Parse animation
        if (tile.animation?.frame) {
          const frames = Array.isArray(tile.animation.frame) 
            ? tile.animation.frame 
            : [tile.animation.frame];
          
          tileDef.animation = frames.map((f: any) => ({
            tileid: parseInt(f.$.tileid),
            duration: parseInt(f.$.duration),
          }));
        }

        tiles.push(tileDef);
      }
    }

    return {
      name,
      tilewidth,
      tileheight,
      image,
      imagewidth,
      imageheight,
      tilecount,
      columns,
      tiles,
    };
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return null;
  }
}

function determineCategory(tilesetName: string, tileProps?: Record<string, any>): string {
  // Check tile properties first
  if (tileProps?.terrain) {
    return TERRAIN_MAP[tileProps.terrain.toLowerCase()] || 'outdoor_grass';
  }
  if (tileProps?.collidable === 'true') {
    return 'collision';
  }

  // Fall back to tileset name mapping
  for (const [key, category] of Object.entries(CATEGORY_MAP)) {
    if (tilesetName.toLowerCase().includes(key.toLowerCase())) {
      return category;
    }
  }

  return 'outdoor_grass'; // default
}

function determineTerrainType(category: string, tileProps?: Record<string, any>): string {
  if (tileProps?.terrain) {
    return tileProps.terrain.toLowerCase();
  }
  return TERRAIN_MAP[category] || 'grass';
}

async function buildRegistry() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Building Tile Registry                        ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // Find all .xml files (Tiled tileset definitions)
  const tsxFiles = fs.readdirSync(TILESETS_DIR)
    .filter(f => f.endsWith('.xml'))
    .map(f => path.join(TILESETS_DIR, f));

  console.log(`Found ${tsxFiles.length} .xml files\n`);

  let totalTiles = 0;
  let globalTileId = 1; // Start from 1 (0 = void/empty)

  for (const tsxFile of tsxFiles) {
    const tileset = await parseTsxFile(tsxFile);
    if (!tileset) continue;

    console.log(`Processing: ${tileset.name}`);
    console.log(`  Image: ${tileset.image}`);
    console.log(`  Tiles: ${tileset.tilecount}`);
    console.log(`  Size: ${tileset.imagewidth}x${tileset.imageheight}`);

    const tilesetPath = `/tuxemon-assets/tilesets/${tileset.image}`;
    const baseCategory = determineCategory(tileset.name);

    for (const tile of tileset.tiles) {
      const category = determineCategory(tileset.name, tile.properties);
      const terrainType = determineTerrainType(category, tile.properties);
      const isCollidable = tile.properties?.collidable === 'true' || 
                           tile.properties?.collision === 'true';
      const isAnimated = tile.animation && tile.animation.length > 0;
      const encounterRate = category === 'outdoor_grass' && 
                            tile.properties?.encounter === 'true' ? 0.05 : null;

      await prisma.tileRegistry.upsert({
        where: { tileId: globalTileId },
        update: {
          tilesetName: tileset.name,
          tilesetPath,
          srcX: tile.x,
          srcY: tile.y,
          width: tile.width,
          height: tile.height,
          name: tile.properties?.name || `${tileset.name}_${tile.id}`,
          category,
          terrainType,
          isCollidable,
          isAnimated,
          animationFrames: tile.animation ? JSON.stringify(tile.animation) : null,
          encounterRate,
          environment: tile.properties?.environment || null,
          sortOrder: globalTileId,
        },
        create: {
          tileId: globalTileId,
          tilesetName: tileset.name,
          tilesetPath,
          srcX: tile.x,
          srcY: tile.y,
          width: tile.width,
          height: tile.height,
          name: tile.properties?.name || `${tileset.name}_${tile.id}`,
          category,
          terrainType,
          isCollidable,
          isAnimated,
          animationFrames: tile.animation ? JSON.stringify(tile.animation) : null,
          encounterRate,
          environment: tile.properties?.environment || null,
          sortOrder: globalTileId,
        },
      });

      globalTileId++;
      totalTiles++;
    }

    console.log(`  ✓ Registered ${tileset.tiles.length} tiles\n`);
  }

  console.log('═══════════════════════════════════════════════════');
  console.log(`✓ Total tiles registered: ${totalTiles}`);
  console.log(`✓ Tile ID range: 1-${globalTileId - 1}`);
  console.log('═══════════════════════════════════════════════════\n');

  // Print category breakdown
  const categories = await prisma.tileRegistry.groupBy({
    by: ['category'],
    _count: { category: true },
  });

  console.log('Category breakdown:');
  for (const cat of categories) {
    console.log(`  ${cat.category}: ${cat._count.category} tiles`);
  }
}

async function main() {
  try {
    await buildRegistry();
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();