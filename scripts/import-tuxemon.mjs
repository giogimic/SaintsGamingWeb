import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const MAPS_DIR = 'C:\\Users\\Matth\\OneDrive\\Desktop\\Tuxemon-0.5-rc1\\mods\\tuxemon\\maps';
const CAMPAIGN_MAPS_PATH = path.join(process.cwd(), 'components/the-lobby/data/campaign-maps.ts');

async function run() {
  console.log('Reading campaign-maps.ts...');
  let content = fs.readFileSync(CAMPAIGN_MAPS_PATH, 'utf8');
  
  const exportIndex = content.indexOf('export const TUXEMON_CAMPAIGN_MAPS');
  const startIndex = content.indexOf('{', exportIndex);
  const endIndex = content.lastIndexOf('}');
  
  if (startIndex === -1 || endIndex === -1) {
    throw new Error('Could not find object bounds in campaign-maps.ts');
  }
  
  const jsonStr = content.substring(startIndex, endIndex + 1);
  let maps;
  try {
    maps = JSON.parse(jsonStr);
    console.log(`Parsed ${Object.keys(maps).length} maps from campaign-maps.ts`);
  } catch (e) {
    console.error('Failed to parse campaign-maps.ts as JSON. Evaluating using new Function...');
    maps = (new Function(`return ${jsonStr}`))();
    console.log(`Evaluated ${Object.keys(maps).length} maps via Function eval.`);
  }

  const files = fs.readdirSync(MAPS_DIR);
  let totalNpcsFound = 0;

  for (const file of files) {
    const isTmx = file.endsWith('.tmx');
    const isYaml = file.endsWith('.yaml');
    
    if (!isTmx && !isYaml) continue;
    
    const slug = file.replace(/\.tmx$/, '').replace(/\.yaml$/, '');
    const mapKey = slug.toUpperCase();
    
    if (!maps[mapKey]) {
      continue;
    }
    
    const fileContent = fs.readFileSync(path.join(MAPS_DIR, file), 'utf8');
    
    if (isTmx) {
      if (!maps[mapKey].npcs) maps[mapKey].npcs = [];
    } else if (!maps[mapKey].npcs) {
      maps[mapKey].npcs = [];
    }

    let match;
    
    if (isTmx) {
      const regex = /value="create_npc ([\w_]+),\s*(\d+),\s*(\d+).*?"/g;
      while ((match = regex.exec(fileContent)) !== null) {
        const npcName = match[1];
        const x = parseInt(match[2], 10);
        const y = parseInt(match[3], 10);
        
        if (!maps[mapKey].npcs.find(n => n.id === npcName)) {
          maps[mapKey].npcs.push({
            id: npcName,
            name: npcName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            x,
            y,
            sprite: 'villager_1',
            dialogueKey: 'Hello there!'
          });
          totalNpcsFound++;
        }
      }
    } else if (isYaml) {
      const regex = /- create_npc ([\w_]+),\s*(\d+),\s*(\d+)/g;
      while ((match = regex.exec(fileContent)) !== null) {
        const npcName = match[1];
        const x = parseInt(match[2], 10);
        const y = parseInt(match[3], 10);
        
        if (!maps[mapKey].npcs.find(n => n.id === npcName)) {
          maps[mapKey].npcs.push({
            id: npcName,
            name: npcName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            x,
            y,
            sprite: 'villager_1',
            dialogueKey: 'Hello there!'
          });
          totalNpcsFound++;
        }
      }
    }
  }

  console.log(`Total NPCs extracted and merged: ${totalNpcsFound}`);
  
  const newContent = `// Generated Campaign Maps Data\nimport { GameMapData } from './maps';\n\nexport const TUXEMON_CAMPAIGN_MAPS: Record<string, GameMapData> = ${JSON.stringify(maps, null, 2)};\n`;
  fs.writeFileSync(CAMPAIGN_MAPS_PATH, newContent, 'utf8');
  console.log('Successfully updated campaign-maps.ts');
}

run().catch(console.error);
