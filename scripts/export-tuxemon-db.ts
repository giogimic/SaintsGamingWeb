import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const TUXEMON_DB_PATH = 'C:/Users/Matth/OneDrive/Desktop/Tuxemon-0.5-rc1/mods/tuxemon/db';
const PUBLIC_DATA_DIR = path.join(process.cwd(), 'public', 'data');

async function exportDatabase() {
  if (!fs.existsSync(PUBLIC_DATA_DIR)) {
    fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
  }

  const collections = ['monster', 'encounter', 'shape', 'technique'];
  const database: Record<string, any> = {};

  for (const collection of collections) {
    const dir = path.join(TUXEMON_DB_PATH, collection);
    if (!fs.existsSync(dir)) {
      console.warn(`Directory not found: ${dir}`);
      continue;
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.yaml'));
    database[collection] = {};

    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      try {
        const parsed = yaml.load(content) as any;
        
        // Handle files with multiple objects in a list vs single object
        if (Array.isArray(parsed)) {
          parsed.forEach(item => {
            if (item.slug) {
              database[collection][item.slug] = item;
            }
          });
        } else if (parsed && parsed.slug) {
          database[collection][parsed.slug] = parsed;
        }
      } catch (err) {
        console.error(`Failed to parse ${file}:`, err);
      }
    }
    
    console.log(`Parsed ${Object.keys(database[collection]).length} items for ${collection}`);
  }

  // Combine and write to public/data/tuxemon_db.json
  const outFile = path.join(PUBLIC_DATA_DIR, 'tuxemon_db.json');
  fs.writeFileSync(outFile, JSON.stringify(database, null, 2));
  console.log(`Exported Tuxemon database to ${outFile}`);
}

exportDatabase().catch(console.error);
