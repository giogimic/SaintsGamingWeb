const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env if present
dotenv.config();

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
if (!fs.existsSync(schemaPath)) {
  console.error(`[!] Prisma schema not found at ${schemaPath}`);
  process.exit(1);
}

let schema = fs.readFileSync(schemaPath, 'utf8');

const dbUrl = process.env.DATABASE_URL || '';
const dbProvider = (process.env.DB_PROVIDER || '').toLowerCase();

const isSqlite = dbUrl.startsWith('file:') || (dbProvider === 'sqlite' && !dbUrl.startsWith('mysql:'));

if (isSqlite) {
  console.log('[*] Preparing Prisma schema for SQLite (file database)...');

  // Switch provider to sqlite
  schema = schema.replace(/provider\s*=\s*"mysql"/g, 'provider = "sqlite"');

  // Strip MySQL-specific @db.Text and @db.LongText modifiers which break SQLite
  schema = schema.replace(/\s*@db\.Text/g, '');
  schema = schema.replace(/\s*@db\.LongText/g, '');

  fs.writeFileSync(schemaPath, schema, 'utf8');
  console.log('[+] Schema successfully adapted for SQLite.');
} else {
  console.log('[*] Preparing Prisma schema for MySQL/MariaDB...');

  // Switch provider to mysql
  schema = schema.replace(/provider\s*=\s*"sqlite"/g, 'provider = "mysql"');

  // Add back @db.LongText and @db.Text where needed
  const longTextCols = ['gridData', 'tileLayersData', 'body', 'atlasData', 'visualData', 'logicData'];
  for (const col of longTextCols) {
    const regex = new RegExp(`^([ \\t]*${col}[ \\t]+String[ \\t]*[^\\n\\/]*?)([ \\t]*\\/\\/.*)?$`, 'gm');
    schema = schema.replace(regex, (match, p1, p2) => {
      if (p1.includes('@db.LongText')) return match;
      if (p1.includes('@db.Text')) return match.replace('@db.Text', '@db.LongText');
      return `${p1.trimEnd()} @db.LongText${p2 || ''}`;
    });
  }

  const textCols = [
    'metadata', 'tags', 'categories', 'customLabels', 'atlasFrame', 'sourceRegion',
    'gatesData', 'npcsData', 'encountersData', 'entitiesData',
    'tilesetsData', 'respawnRulesJson', 'entryRequirements', 'questsData',
    'tilesetData', 'npcs', 'encounters', 'gates', 'description', 'dialogStart',
    'dialogProgress', 'dialogComplete', 'flavor', 'tagline'
  ];
  for (const col of textCols) {
    const regex = new RegExp(`^([ \\t]*${col}[ \\t]+String\\??[ \\t]*[^\\n\\/]*?)([ \\t]*\\/\\/.*)?$`, 'gm');
    schema = schema.replace(regex, (match, p1, p2) => {
      if (p1.includes('@db.Text') || p1.includes('@db.LongText')) return match;
      return `${p1.trimEnd()} @db.Text${p2 || ''}`;
    });
  }

  fs.writeFileSync(schemaPath, schema, 'utf8');
  console.log('[+] Schema successfully adapted for MySQL.');
}
