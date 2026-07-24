import fs from 'fs';
import path from 'path';

const ASSETS_DIR = path.join(process.cwd(), 'public', 'tuxemon-assets');

function generateSQL() {
  const categories = fs.readdirSync(ASSETS_DIR);
  let sql = 'DELETE FROM GameAsset;\n';
  
  for (const category of categories) {
    const catPath = path.join(ASSETS_DIR, category);
    if (!fs.statSync(catPath).isDirectory()) continue;
    
    const scanDir = (dir: string, subCat: string = '') => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        if (fs.statSync(itemPath).isDirectory()) {
          scanDir(itemPath, item);
        } else if (item.endsWith('.png')) {
          const relativePath = '/tuxemon-assets/' + path.relative(ASSETS_DIR, itemPath).replace(/\\/g, '/');
          const name = item.replace('.png', '').replace(/_/g, ' ').replace(/-/g, ' ').replace(/'/g, "''");
          
          const cuid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          
          sql += `INSERT INTO GameAsset (id, name, category, subCategory, filePath, width, height, createdAt) VALUES ('${cuid}', '${name}', '${category}', ${subCat ? `'${subCat}'` : 'NULL'}, '${relativePath}', 16, 16, NOW());\n`;
        }
      }
    };
    
    scanDir(catPath);
  }
  
  fs.writeFileSync('seed-assets.sql', sql);
  console.log("SQL generated: seed-assets.sql");
}

generateSQL();
