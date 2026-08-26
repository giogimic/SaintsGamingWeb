const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env
dotenv.config();

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const dbUrl = process.env.DATABASE_URL || '';
const dbProvider = process.env.DB_PROVIDER || '';

const isSqlite = dbUrl.startsWith('file:') || (dbProvider === 'sqlite' && !dbUrl.startsWith('mysql:'));

if (isSqlite) {
    console.log('[*] Preparing Prisma schema for SQLite (fallback mode)...');
    
    // Switch provider to sqlite
    schema = schema.replace(/provider\s*=\s*"mysql"/g, 'provider = "sqlite"');
    
    // Strip out MySQL-specific @db.Text modifiers which break SQLite
    schema = schema.replace(/\s*@db\.Text/g, '');
    schema = schema.replace(/\s*@db\.LongText/g, '');

    fs.writeFileSync(schemaPath, schema);
    console.log('[+] Schema adapted for SQLite.');
} else {
    console.log('[*] Preparing Prisma schema for MySQL (default mode)...');
    
    // Ensure provider is mysql
    schema = schema.replace(/provider\s*=\s*"sqlite"/g, 'provider = "mysql"');
    
    // The schema is authored with @db.Text natively, but we enforce it just in case
    const longTextCols = [
        'gridData', 'tileLayersData', 'body'
    ];
    const textCols = [
        'metadata', 'tags', 'categories', 'customLabels', 'atlasFrame', 'sourceRegion',
        'gatesData', 'npcsData', 'encountersData', 'entitiesData', 
        'tilesetsData', 'respawnRulesJson', 'entryRequirements', 'dialogueGraph', 'questsData',
        'tilesetData', 'npcs', 'encounters', 'gates', 'stateData', 'excerpt', 'description'
    ];

    for (const col of longTextCols) {
        const regex = new RegExp(`^([ \\t]*${col}[ \\t]+String[ \\t]*[^\\n\\/]*?)([ \\t]*\\/\\/.*)?$`, 'gm');
        schema = schema.replace(regex, (match, p1, p2) => {
            if (p1.includes('@db.LongText')) return match;
            if (p1.includes('@db.Text')) return match.replace('@db.Text', '@db.LongText');
            return `${p1.trimRight()} @db.LongText${p2 || ''}`;
        });
    }

    for (const col of textCols) {
        const regex = new RegExp(`^([ \\t]*${col}[ \\t]+String[ \\t]*[^\\n\\/]*?)([ \\t]*\\/\\/.*)?$`, 'gm');
        schema = schema.replace(regex, (match, p1, p2) => {
            if (p1.includes('@db.Text') || p1.includes('@db.LongText')) return match;
            return `${p1.trimRight()} @db.Text${p2 || ''}`;
        });
    }

    fs.writeFileSync(schemaPath, schema);
    console.log('[+] Schema verified for MySQL.');
}
