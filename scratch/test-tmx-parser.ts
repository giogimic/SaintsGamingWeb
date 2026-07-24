import fs from 'fs';
import zlib from 'zlib';

function parseTmx(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract tilesets
  const tilesets: Array<{ firstgid: number; source: string }> = [];
  const tilesetRegex = /<tileset firstgid="(\d+)" source="([^"]+)"/g;
  let tsMatch;
  while ((tsMatch = tilesetRegex.exec(content)) !== null) {
    tilesets.push({
      firstgid: parseInt(tsMatch[1], 10),
      source: tsMatch[2].replace('../gfx/tilesets/', '')
    });
  }

  // Extract layers
  const layers: Array<{ name: string; gids: number[] }> = [];
  const layerRegex = /<layer [^>]*name="([^"]+)"[^>]*>[\s\S]*?<data encoding="base64" compression="zlib">([\s\S]*?)<\/data>[\s\S]*?<\/layer>/g;
  let lMatch;
  while ((lMatch = layerRegex.exec(content)) !== null) {
    const layerName = lMatch[1];
    const rawData = lMatch[2].trim();
    const buffer = Buffer.from(rawData, 'base64');
    const decompressed = zlib.inflateSync(buffer);
    
    // Decompressed buffer contains 32-bit little-endian uint GIDs
    const gids: number[] = [];
    for (let i = 0; i < decompressed.length; i += 4) {
      gids.push(decompressed.readUInt32LE(i));
    }
    layers.push({ name: layerName, gids });
  }

  // Extract collision objects
  const collisions: Array<{ x: number; y: number; width: number; height: number }> = [];
  const collisionRegex = /<object [^>]*type="collision"[^>]*x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g;
  let cMatch;
  while ((cMatch = collisionRegex.exec(content)) !== null) {
    collisions.push({
      x: parseInt(cMatch[1], 10) / 16,
      y: parseInt(cMatch[2], 10) / 16,
      width: parseInt(cMatch[3], 10) / 16,
      height: parseInt(cMatch[4], 10) / 16
    });
  }

  console.log('Parsed TMX:', {
    tilesets,
    layersCount: layers.length,
    layers: layers.map(l => ({ name: l.name, nonZero: l.gids.filter(g => g > 0).length })),
    collisionsCount: collisions.length,
    collisions
  });
}

parseTmx('C:\\Users\\Matth\\OneDrive\\Desktop\\Tuxemon-0.5-rc1\\mods\\tuxemon\\maps\\player_house_bedroom.tmx');
