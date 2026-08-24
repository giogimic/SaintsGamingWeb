const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env
dotenv.config();

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const isMysql = (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql')) || process.env.DB_PROVIDER === 'mysql';

if (isMysql) {
    console.log('[*] Preparing Prisma schema for MySQL (injecting provider and @db.Text)...');
    
    // Switch provider to mysql
    schema = schema.replace(/provider\s*=\s*"sqlite"/g, 'provider = "mysql"');

    // List of columns that need to bypass VARCHAR(191) limit
    const textCols = ['metadata', 'tags', 'categories', 'customLabels', 'atlasFrame', 'sourceRegion'];
    
    for (const col of textCols) {
        // Regex matches the column definition line safely
        const regex = new RegExp(`^(\\s*${col}\\s+String\\s+[^\\n\\/]*?)(\\s*\\/\\/.*)?$`, 'gm');
        schema = schema.replace(regex, (match, p1, p2) => {
            if (p1.includes('@db.Text') || p1.includes('@db.LongText')) return match;
            return `${p1.trimRight()} @db.Text${p2 || ''}`;
        });
    }

    fs.writeFileSync(schemaPath, schema);
    console.log('[+] Schema dynamically adapted for MySQL.');
} else {
    console.log('[*] Preparing Prisma schema for SQLite (restoring baseline)...');
    
    // Ensure provider is sqlite
    schema = schema.replace(/provider\s*=\s*"mysql"/g, 'provider = "sqlite"');
    
    // Strip out MySQL-specific @db.Text modifiers
    schema = schema.replace(/\s*@db\.Text/g, '');
    schema = schema.replace(/\s*@db\.LongText/g, '');

    fs.writeFileSync(schemaPath, schema);
    console.log('[+] Schema verified for SQLite.');
}
