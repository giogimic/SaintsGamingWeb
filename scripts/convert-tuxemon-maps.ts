/**
 * Convert Tuxemon Maps
 * 
 * Converts Tuxemon's .tmx map files to our WorldMap format
 * 
 * Source: C:\Users\Matth\OneDrive\Desktop\Tuxemon-0.5-rc1\mods\tuxemon\maps\
 * Destination: Database (WorldMap model)
 */

import fs from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TUXEMON_MAPS_DIR = 'C:\\Users\\Matth\\OneDrive\\Desktop\\Tuxemon-0.5-rc1\\mods\\tuxemon\\maps';

interface TmxMap {
  name: string;
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: Array<{
    name: string;
    data: number[];
    opacity: number;
    visible: boolean;
  }>;
  objectGroups?: Array<{
    name: string;
    objects: Array<{
      id: number;
      name: string;
      type: string;
      x: number;
      y: number;
      width: number;
      height: number;
      properties?: Array<{ name: string; value: string }>;
    }>;
  }>;
}

async function parseTmxFile(filePath: string): Promise<TmxMap | null> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = await parseStringPromise(content, { explicitArray: false });
    
    const map = parsed.map;
    if (!map) return null;

    const name = path.basename(filePath, '.tmx');
    const width = parseInt(map.$.width);
    const height = parseInt(map.$.height);
    const tilewidth = parseInt(map.$.tilewidth);
    const tileheight = parseInt(map.$.tileheight);

    const layers: TmxMap['layers'] = [];
    const objectGroups: TmxMap['objectGroups'] = [];

    // Parse layers
    if (map.layer) {
      const layerArray = Array.isArray(map.layer) ? map.layer : [map.layer];
      
      for (const layer of layerArray) {
        const layerName = layer.$.name;
        const layerWidth = parseInt(layer.$.width);
        const layerHeight = parseInt(layer.$.height);
        const opacity = parseFloat(layer.$.opacity || '1');
        const visible = layer.$.visible !== '0';

        // Parse tile data (CSV format)
        let data: number[] = [];
        if (layer.data) {
          const dataStr = typeof layer.data === 'string' 
            ? layer.data 
            : layer.data._ || layer.data;
          
          if (typeof dataStr === 'string') {
            data = dataStr
              .trim()
              .split(',')
              .map((s: string) => parseInt(s.trim()))
              .filter((n: number) => !isNaN(n));
          }
        }

        layers.push({
          name: layerName,
          data,
          opacity,
          visible,
        });
      }
    }

    // Parse object groups
    if (map.objectgroup) {
      const groupArray = Array.isArray(map.objectgroup) ? map.objectgroup : [map.objectgroup];
      
      for (const group of groupArray) {
        const groupName = group.$.name;
    const objects: Array<{
      id: number;
      name: string;
      type: string;
      x: number;
      y: number;
      width: number;
      height: number;
      properties?: Array<{ name: string; value: string }>;
    }> = [];

        if (group.object) {
          const objArray = Array.isArray(group.object) ? group.object : [group.object];
          
          for (const obj of objArray) {
            const objData: any = {
              id: parseInt(obj.$.id),
              name: obj.$.name || '',
              type: obj.$.type || '',
              x: parseFloat(obj.$.x),
              y: parseFloat(obj.$.y),
              width: parseFloat(obj.$.width || '0'),
              height: parseFloat(obj.$.height || '0'),
            };

            // Parse properties
            if (obj.properties?.property) {
              const props = Array.isArray(obj.properties.property)
                ? obj.properties.property
                : [obj.properties.property];
              
              objData.properties = props.map((p: any) => ({
                name: p.$.name,
                value: p.$.value,
              }));
            }

            objects.push(objData);
          }
        }

        objectGroups.push({
          name: groupName,
          objects,
        });
      }
    }

    return {
      name,
      width,
      height,
      tilewidth,
      tileheight,
      layers,
      objectGroups,
    };
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return null;
  }
}

function convertTo2DGrid(data: number[], width: number, height: number): number[][] {
  const grid: number[][] = [];
  
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      row.push(data[index] || 0);
    }
    grid.push(row);
  }
  
  return grid;
}

function extractCollisionLayer(tmxMap: TmxMap): boolean[][] {
  // Find collision layer (usually named "Collision" or "collision")
  const collisionLayer = tmxMap.layers.find(l => 
    l.name.toLowerCase().includes('collision')
  );

  if (!collisionLayer) {
    // Return empty collision grid
    return Array(tmxMap.height).fill(null).map(() => 
      Array(tmxMap.width).fill(false)
    );
  }

  const grid = convertTo2DGrid(collisionLayer.data, tmxMap.width, tmxMap.height);
  
  // Convert to boolean (any non-zero tile = collision)
  return grid.map(row => row.map(tile => tile > 0));
}

function extractNPCs(tmxMap: TmxMap): any[] {
  const npcs: any[] = [];

  for (const group of tmxMap.objectGroups || []) {
    if (group.name.toLowerCase().includes('npc') || 
        group.name.toLowerCase().includes('entity')) {
      
      for (const obj of group.objects) {
        if (obj.type === 'NPC' || obj.type === 'npc') {
          const props = obj.properties || [];
          
          npcs.push({
            id: `npc_${obj.id}`,
            name: obj.name || 'NPC',
            spriteKey: props.find(p => p.name === 'sprite')?.value || 'villager_1',
            x: Math.floor(obj.x / tmxMap.tilewidth),
            y: Math.floor(obj.y / tmxMap.tileheight),
            direction: props.find(p => p.name === 'direction')?.value || 'down',
            dialogue: props.find(p => p.name === 'dialogue')?.value?.split('|') || ['Hello!'],
            isTrainer: props.find(p => p.name === 'trainer')?.value === 'true',
          });
        }
      }
    }
  }

  return npcs;
}

function extractGates(tmxMap: TmxMap): any[] {
  const gates: any[] = [];

  for (const group of tmxMap.objectGroups || []) {
    if (group.name.toLowerCase().includes('gate') || 
        group.name.toLowerCase().includes('warp') ||
        group.name.toLowerCase().includes('transition')) {
      
      for (const obj of group.objects) {
        const props = obj.properties || [];
        
        gates.push({
          x: Math.floor(obj.x / tmxMap.tilewidth),
          y: Math.floor(obj.y / tmxMap.tileheight),
          width: Math.max(1, Math.floor(obj.width / tmxMap.tilewidth)),
          height: Math.max(1, Math.floor(obj.height / tmxMap.tileheight)),
          targetMap: props.find(p => p.name === 'map')?.value || '',
          targetX: parseInt(props.find(p => p.name === 'x')?.value || '0'),
          targetY: parseInt(props.find(p => p.name === 'y')?.value || '0'),
        });
      }
    }
  }

  return gates;
}

async function convertMaps() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Converting Tuxemon Maps                       ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // Find all .tmx files
  const tmxFiles = fs.readdirSync(TUXEMON_MAPS_DIR)
    .filter(f => f.endsWith('.tmx'))
    .map(f => path.join(TUXEMON_MAPS_DIR, f));

  console.log(`Found ${tmxFiles.length} .tmx files\n`);

  let converted = 0;
  let skipped = 0;

  for (const tmxFile of tmxFiles) {
    const tmxMap = await parseTmxFile(tmxFile);
    if (!tmxMap) {
      console.log(`✗ Failed to parse: ${path.basename(tmxFile)}`);
      skipped++;
      continue;
    }

    console.log(`Processing: ${tmxMap.name}`);
    console.log(`  Size: ${tmxMap.width}x${tmxMap.height}`);
    console.log(`  Layers: ${tmxMap.layers.length}`);

    // Get the main tile layer (usually first layer)
    const mainLayer = tmxMap.layers.find(l => l.visible && l.data.length > 0);
    if (!mainLayer) {
      console.log(`  ⚠ No valid tile layer found, skipping`);
      skipped++;
      continue;
    }

    // Convert to 2D grid
    const grid = convertTo2DGrid(mainLayer.data, tmxMap.width, tmxMap.height);
    const collision = extractCollisionLayer(tmxMap);
    const npcs = extractNPCs(tmxMap);
    const gates = extractGates(tmxMap);

    console.log(`  NPCs: ${npcs.length}`);
    console.log(`  Gates: ${gates.length}`);

    // Save to database
    const mapId = tmxMap.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    
    await prisma.worldMap.upsert({
      where: { id: mapId },
      update: {
        name: tmxMap.name,
        gridData: JSON.stringify(grid),
        gatesData: JSON.stringify(gates),
        npcsData: JSON.stringify(npcs),
        version: { increment: 1 },
      },
      create: {
        id: mapId,
        name: tmxMap.name,
        gridData: JSON.stringify(grid),
        gatesData: JSON.stringify(gates),
        npcsData: JSON.stringify(npcs),
      },
    });

    // Also save to TuxemonMap with collision data
    await prisma.tuxemonMap.upsert({
      where: { slug: tmxMap.name },
      update: {
        name: tmxMap.name,
        width: tmxMap.width,
        height: tmxMap.height,
        tileSize: tmxMap.tilewidth,
        tilesetData: JSON.stringify(grid),
        collisionData: JSON.stringify(collision),
        npcData: JSON.stringify(npcs),
        triggerData: JSON.stringify(gates),
        version: { increment: 1 },
      },
      create: {
        slug: tmxMap.name,
        name: tmxMap.name,
        width: tmxMap.width,
        height: tmxMap.height,
        tileSize: tmxMap.tilewidth,
        tilesetData: JSON.stringify(grid),
        collisionData: JSON.stringify(collision),
        npcData: JSON.stringify(npcs),
        triggerData: JSON.stringify(gates),
      },
    });

    console.log(`  ✓ Saved as ${mapId}\n`);
    converted++;
  }

  console.log('═══════════════════════════════════════════════════');
  console.log(`✓ Converted: ${converted} maps`);
  console.log(`✗ Skipped: ${skipped} maps`);
  console.log('═══════════════════════════════════════════════════');
}

async function main() {
  try {
    await convertMaps();
  } catch (error) {
    console.error('Conversion failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();