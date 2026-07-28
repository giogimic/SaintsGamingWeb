import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import pako from 'pako';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TUXEMON_DIR = 'C:\\Users\\Matth\\OneDrive\\Desktop\\Tuxemon-0.5-rc1\\mods\\tuxemon';
const TARGET_MAP_SLUG = process.argv[2] || 'spyder_candy_town';

async function importMap() {
  const mapPath = path.join(TUXEMON_DIR, 'maps', `${TARGET_MAP_SLUG}.tmx`);
  if (!fs.existsSync(mapPath)) {
    console.error(`Map not found: ${mapPath}`);
    process.exit(1);
  }

  console.log(`Parsing TMX: ${mapPath}`);
  const tmxContent = fs.readFileSync(mapPath, 'utf8');
  
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
  });
  
  const xml = parser.parse(tmxContent);
  const mapNode = xml.map;
  
  const width = parseInt(mapNode['@_width'], 10);
  const height = parseInt(mapNode['@_height'], 10);
  const tileSize = parseInt(mapNode['@_tilewidth'], 10);
  
  console.log(`Map Dimensions: ${width}x${height} (TileSize: ${tileSize})`);

  // Parse properties
  const properties: Record<string, string> = {};
  if (mapNode.properties?.property) {
    const props = Array.isArray(mapNode.properties.property) 
      ? mapNode.properties.property 
      : [mapNode.properties.property];
      
    for (const p of props) {
      properties[p['@_name']] = p['@_value'];
    }
  }

  const mapName = properties['slug'] || TARGET_MAP_SLUG;

  // Process Tilesets
  const tilesets = Array.isArray(mapNode.tileset) ? mapNode.tileset : [mapNode.tileset];
  const parsedTilesets = [];
  
  for (const ts of tilesets) {
    if (!ts) continue;
    const firstGid = parseInt(ts['@_firstgid'], 10);
    const source = ts['@_source']; // e.g. "../gfx/tilesets/core_city_and_country.tsx"
    
    // Resolve TSX
    const tsxPath = path.resolve(path.join(TUXEMON_DIR, 'maps'), source);
    if (!fs.existsSync(tsxPath)) {
      console.warn(`Tileset missing: ${tsxPath}`);
      continue;
    }
    
    const tsxContent = fs.readFileSync(tsxPath, 'utf8');
    const tsxXml = parser.parse(tsxContent).tileset;
    
    const imageNode = tsxXml.image;
    const imageSourceRaw = imageNode['@_source']; // e.g. "core_city_and_country.png"
    
    // Copy image to public directory
    const imageSourcePath = path.resolve(path.dirname(tsxPath), imageSourceRaw);
    const destImageName = path.basename(imageSourcePath);
    const destImagePath = path.join(process.cwd(), 'public', 'assets', 'tilesets', destImageName);
    
    if (fs.existsSync(imageSourcePath)) {
      if (!fs.existsSync(destImagePath)) {
        console.log(`Copying tileset image: ${destImageName}`);
        fs.copyFileSync(imageSourcePath, destImagePath);
      }
    } else {
      console.warn(`Tileset image missing: ${imageSourcePath}`);
    }

    parsedTilesets.push({
      firstgid: firstGid,
      imageSource: `/assets/tilesets/${destImageName}`,
      columns: parseInt(tsxXml['@_columns'], 10) || Math.floor(parseInt(imageNode['@_width'], 10) / parseInt(tsxXml['@_tilewidth'], 10)),
      tilewidth: parseInt(tsxXml['@_tilewidth'], 10),
      tileheight: parseInt(tsxXml['@_tileheight'], 10)
    });
  }

  // Parse Tile Layers
  const layers = Array.isArray(mapNode.layer) ? mapNode.layer : [mapNode.layer];
  const tileLayers = [];
  let baseGrid: number[][] = Array.from({ length: height }, () => Array(width).fill(0));
  
  for (const layer of layers) {
    if (!layer || !layer.data) continue;
    
    const encoding = layer.data['@_encoding'];
    const compression = layer.data['@_compression'];
    const textData = layer.data['#text'].trim();
    
    let decodedData: number[] = [];
    
    if (encoding === 'base64' && compression === 'zlib') {
      const buffer = Buffer.from(textData, 'base64');
      const decompressed = pako.inflate(buffer);
      // TMX uses 32-bit integers (4 bytes per tile)
      for (let i = 0; i < decompressed.length; i += 4) {
        let gid = decompressed[i] | (decompressed[i+1] << 8) | (decompressed[i+2] << 16) | (decompressed[i+3] << 24);
        
        // Clear flags (flipping bits etc) - Tuxemon maps often use these
        gid &= ~(0x80000000 | 0x40000000 | 0x20000000);
        decodedData.push(gid);
      }
    } else if (encoding === 'csv') {
      decodedData = textData.split(',').map((x: string) => parseInt(x.trim(), 10));
    }
    
    if (decodedData.length > 0) {
      const grid = [];
      for (let r = 0; r < height; r++) {
        const row = [];
        for (let c = 0; c < width; c++) {
          row.push(decodedData[r * width + c] || 0);
        }
        grid.push(row);
      }
      tileLayers.push({
        name: layer['@_name'],
        grid
      });
      
      // If it's the first layer, populate baseGrid for fallback
      if (tileLayers.length === 1) {
        baseGrid = JSON.parse(JSON.stringify(grid));
      }
    }
  }

  // Process Object Groups (Collisions and Events)
  const objectGroups = Array.isArray(mapNode.objectgroup) ? mapNode.objectgroup : (mapNode.objectgroup ? [mapNode.objectgroup] : []);
  const mapEntities = [];
  
  // Create a separate logic grid for collisions
  const logicGrid = Array.from({ length: height }, () => Array(width).fill(0));
  
  for (const group of objectGroups) {
    if (!group) continue;
    const groupName = group['@_name'];
    const objects = Array.isArray(group.object) ? group.object : (group.object ? [group.object] : []);
    
    if (groupName === 'Collisions') {
      for (const obj of objects) {
        if (!obj) continue;
        const ox = parseFloat(obj['@_x']);
        const oy = parseFloat(obj['@_y']);
        const ow = parseFloat(obj['@_width'] || "16");
        const oh = parseFloat(obj['@_height'] || "16");
        
        // Snap bounding box to 16x16 grid
        const startC = Math.floor(ox / tileSize);
        const startR = Math.floor(oy / tileSize);
        const endC = Math.ceil((ox + ow) / tileSize) - 1;
        const endR = Math.ceil((oy + oh) / tileSize) - 1;
        
        for (let r = startR; r <= endR; r++) {
          for (let c = startC; c <= endC; c++) {
            if (r >= 0 && r < height && c >= 0 && c < width) {
              // 1 is our Solid Wall Logic Tile
              logicGrid[r][c] = 1;
            }
          }
        }
      }
    } else if (groupName === 'Events') {
      for (const obj of objects) {
        if (!obj) continue;
        const ox = parseFloat(obj['@_x']);
        const oy = parseFloat(obj['@_y']);
        const objC = Math.floor(ox / tileSize);
        const objR = Math.floor(oy / tileSize);
        
        const props = Array.isArray(obj.properties?.property) ? obj.properties.property : (obj.properties?.property ? [obj.properties.property] : []);
        
        let targetMap = '';
        let targetX = 6;
        let targetY = 6;
        
        for (const p of props) {
          const val = p['@_value'];
          if (val && val.startsWith('transition_teleport')) {
            // transition_teleport player,spyder_route6.tmx,30,19,0.3
            const parts = val.split(',');
            if (parts.length >= 4) {
              targetMap = parts[1].replace('.tmx', '');
              targetX = parseInt(parts[2], 10);
              targetY = parseInt(parts[3], 10);
            }
          }
        }
        
        if (targetMap) {
          mapEntities.push({
            id: `warp_${objC}_${objR}`,
            name: obj['@_name'] || 'Warp Gate',
            type: 'WARP_GATE',
            position: { x: objC, y: objR },
            mapId: mapName,
            targetMapId: targetMap,
            spawnPoint: { x: targetX, y: targetY }
          });
        }
      }
    }
  }
  
  // Inject the logicGrid as a special layer or update the base structure
  // In our engine, we use activeMap.grid as the visual fallback or the first layer,
  // but we recently created MapLogicTile for logic!
  // Our engine looks at the map.grid for logic blocks when the layer == -2, wait, 
  // actually our engine checks logic based on the tiles on the map grid!
  
  // Wait, in GameCanvasBabylon.tsx:
  // "const logicId = Array.isArray(mapData.grid[r]) ? mapData.grid[r][c] : 0;"
  // This means the `map.grid` IS the logic grid in our new refactor!
  // The visual tiles are rendered exclusively via `map.tileLayers`.
  
  const finalMapData = {
    id: mapName,
    name: mapName,
    gridData: JSON.stringify(logicGrid), // The grid now purely serves as Logic Grid (collision/events)
    tilesetsData: JSON.stringify(parsedTilesets),
    tileLayersData: JSON.stringify(tileLayers),
    gatesData: JSON.stringify(mapEntities),
    npcsData: JSON.stringify([]),
    encountersData: JSON.stringify([])
  };

  console.log(`Saving Map to Database: ${mapName}...`);
  await prisma.worldMap.upsert({
    where: { id: mapName },
    update: finalMapData,
    create: finalMapData
  });
  


  console.log('Import Complete!');
  await prisma.$disconnect();
}

importMap().catch(e => {
  console.error(e);
  process.exit(1);
});
