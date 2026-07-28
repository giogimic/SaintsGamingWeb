import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import pako from 'pako';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TUXEMON_DIR = 'C:\\Users\\Matth\\OneDrive\\Desktop\\Tuxemon-0.5-rc1\\mods\\tuxemon';

async function importAllMaps() {
  const mapsDir = path.join(TUXEMON_DIR, 'maps');
  const files = fs.readdirSync(mapsDir);
  
  const tmxFiles = files.filter(f => f.endsWith('.tmx'));
  console.log(`Found ${tmxFiles.length} TMX maps to import.`);

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
  });

  let successCount = 0;
  let failCount = 0;

  for (const file of tmxFiles) {
    const mapPath = path.join(mapsDir, file);
    try {
      console.log(`\n--- Importing ${file} ---`);
      const tmxContent = fs.readFileSync(mapPath, 'utf8');
      
      const xml = parser.parse(tmxContent);
      const mapNode = xml.map;
      
      if (!mapNode) {
        console.warn(`Skipping ${file} - Not a valid map format.`);
        failCount++;
        continue;
      }
      
      const width = parseInt(mapNode['@_width'] || "0", 10);
      const height = parseInt(mapNode['@_height'] || "0", 10);
      const tileSize = parseInt(mapNode['@_tilewidth'] || "16", 10);

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

      const mapName = properties['slug'] || file.replace('.tmx', '');

      // Process Tilesets
      const tilesets = Array.isArray(mapNode.tileset) ? mapNode.tileset : (mapNode.tileset ? [mapNode.tileset] : []);
      const parsedTilesets = [];
      
      for (const ts of tilesets) {
        if (!ts) continue;
        const firstGid = parseInt(ts['@_firstgid'], 10);
        const source = ts['@_source'];
        
        if (!source) continue;
        
        const tsxPath = path.resolve(mapsDir, source);
        if (!fs.existsSync(tsxPath)) {
          console.warn(`Tileset missing: ${tsxPath}`);
          continue;
        }
        
        const tsxContent = fs.readFileSync(tsxPath, 'utf8');
        const tsxXml = parser.parse(tsxContent).tileset;
        
        if (!tsxXml || !tsxXml.image) continue;
        const imageNode = tsxXml.image;
        const imageSourceRaw = imageNode['@_source']; 
        
        const imageSourcePath = path.resolve(path.dirname(tsxPath), imageSourceRaw);
        const destImageName = path.basename(imageSourcePath);
        const destImagePath = path.join(process.cwd(), 'public', 'assets', 'tilesets', destImageName);
        
        if (fs.existsSync(imageSourcePath)) {
          if (!fs.existsSync(destImagePath)) {
            fs.copyFileSync(imageSourcePath, destImagePath);
          }
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
      const layers = Array.isArray(mapNode.layer) ? mapNode.layer : (mapNode.layer ? [mapNode.layer] : []);
      const tileLayers = [];
      
      for (const layer of layers) {
        if (!layer || !layer.data) continue;
        
        const encoding = layer.data['@_encoding'];
        const compression = layer.data['@_compression'];
        const textData = layer.data['#text']?.trim();
        
        if (!textData) continue;

        let decodedData: number[] = [];
        
        if (encoding === 'base64' && compression === 'zlib') {
          const buffer = Buffer.from(textData, 'base64');
          const decompressed = pako.inflate(buffer);
          for (let i = 0; i < decompressed.length; i += 4) {
            let gid = decompressed[i] | (decompressed[i+1] << 8) | (decompressed[i+2] << 16) | (decompressed[i+3] << 24);
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
        }
      }

      // Process Object Groups
      const objectGroups = Array.isArray(mapNode.objectgroup) ? mapNode.objectgroup : (mapNode.objectgroup ? [mapNode.objectgroup] : []);
      const mapEntities = [];
      const mapNpcs = [];
      const mapEncounters = [];
      const logicGrid = Array.from({ length: height }, () => Array(width).fill(0));
      
      for (const group of objectGroups) {
        if (!group) continue;
        const groupName = group['@_name'];
        const objects = Array.isArray(group.object) ? group.object : (group.object ? [group.object] : []);
        
        if (groupName === 'Collisions' || groupName === 'collision') {
          for (const obj of objects) {
            if (!obj) continue;
            const ox = parseFloat(obj['@_x']);
            const oy = parseFloat(obj['@_y']);
            const ow = parseFloat(obj['@_width'] || "16");
            const oh = parseFloat(obj['@_height'] || "16");
            
            const startC = Math.floor(ox / tileSize);
            const startR = Math.floor(oy / tileSize);
            const endC = Math.ceil((ox + ow) / tileSize) - 1;
            const endR = Math.ceil((oy + oh) / tileSize) - 1;
            
            for (let r = startR; r <= endR; r++) {
              for (let c = startC; c <= endC; c++) {
                if (r >= 0 && r < height && c >= 0 && c < width) {
                  logicGrid[r][c] = 1;
                }
              }
            }
          }
        } else if (groupName === 'Events' || groupName === 'events') {
          for (const obj of objects) {
            if (!obj) continue;
            const ox = parseFloat(obj['@_x']);
            const oy = parseFloat(obj['@_y']);
            const oWidth = parseFloat(obj['@_width']) || tileSize;
            const oHeight = parseFloat(obj['@_height']) || tileSize;
            
            const objC = Math.floor(ox / tileSize);
            const objR = Math.floor(oy / tileSize);
            const wTiles = Math.max(1, Math.floor(oWidth / tileSize));
            const hTiles = Math.max(1, Math.floor(oHeight / tileSize));
            
            const props = Array.isArray(obj.properties?.property) ? obj.properties.property : (obj.properties?.property ? [obj.properties.property] : []);
            
            let targetMap = '';
            let targetX = 6;
            let targetY = 6;
            let foundWarp = false;
            
            for (const p of props) {
              const val = p['@_value'];
              if (!val) continue;
              if (val.startsWith('transition_teleport')) {
                const parts = val.split(',');
                if (parts.length >= 4) {
                  const mapParts = parts[1].split(' ');
                  targetMap = (mapParts[mapParts.length - 1] || parts[1]).replace('.tmx', '');
                  targetX = parseInt(parts[2], 10);
                  targetY = parseInt(parts[3], 10);
                  foundWarp = true;
                }
              } else if (val.startsWith('create_npc')) {
                // e.g. create_npc spyder_candy_henrik,6,4
                const parts = val.replace('create_npc ', '').split(',');
                if (parts.length >= 3) {
                  const npcId = parts[0].trim();
                  const npcX = parseInt(parts[1], 10);
                  const npcY = parseInt(parts[2], 10);
                  mapNpcs.push({
                    id: npcId,
                    spriteId: 'villager_1', // default placeholder
                    x: npcX,
                    y: npcY,
                    facing: 'DOWN'
                  });
                }
              } else if (val.startsWith('random_encounter')) {
                // e.g. random_encounter spyder_route1,11
                const parts = val.replace('random_encounter ', '').split(',');
                if (parts.length >= 1) {
                  const encounterZone = parts[0].trim();
                  if (!mapEncounters.includes(encounterZone)) {
                    mapEncounters.push(encounterZone);
                  }
                  
                  // Bake the encounter bounding box into the logicGrid as ID 2 (Encounter/Tall Grass)
                  for (let r = objR; r < objR + hTiles && r < height; r++) {
                    for (let c = objC; c < objC + wTiles && c < width; c++) {
                      if (logicGrid[r] && logicGrid[r][c] !== 1) { // Don't overwrite walls
                        logicGrid[r][c] = 2; // Encounter logic ID
                      }
                    }
                  }
                }
              }
            }
            
            if (foundWarp && targetMap) {
              mapEntities.push({
                id: `warp_${mapName}_${objC}_${objR}`,
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
      
      const finalMapData = {
        id: mapName,
        name: mapName,
        gridData: JSON.stringify(logicGrid),
        tilesetsData: JSON.stringify(parsedTilesets),
        tileLayersData: JSON.stringify(tileLayers),
        gatesData: JSON.stringify(mapEntities),
        npcsData: JSON.stringify(mapNpcs),
        encountersData: JSON.stringify(mapEncounters)
      };

      await prisma.worldMap.upsert({
        where: { id: mapName },
        update: finalMapData,
        create: finalMapData
      });

      console.log(`Successfully imported ${mapName}`);
      successCount++;
    } catch (e) {
      console.error(`Failed to import ${file}:`, e);
      failCount++;
    }
  }

  console.log(`\n\nBatch Import Complete!`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  
  await prisma.$disconnect();
}

importAllMaps().catch(e => {
  console.error(e);
  process.exit(1);
});
