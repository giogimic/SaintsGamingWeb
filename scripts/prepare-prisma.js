const fs = require('fs');
const path = require('path');

// Zero-dependency .env reader
try {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch (e) {
  // Ignore env read errors and rely on process.env
}

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
  const longTextCols = [
    'value',
    'stateData',
    'visualData',
    'logicData',
    'gridData',
    'tileLayersData',
    'tilesetsData',
    'entitiesData',
    'encountersData',
    'npcsData',
    'gatesData',
    'questsData',
    'body',
    'content',
    'atlasData',
    'customData',
    'dialogueTree',
    'snapshotPayload',
    'validationReport',
    'contentSummary',
    'tilesetData',
    'collisionData',
    'npcData',
    'triggerData',
    'data',
    'payload',
    'mutationsData',
    'acquisitionData',
    'restrictionsData',
    'startingInventory',
    'passivesJson',
    'abilitiesJson',
    'bankJson',
    'trainingMethodsJson',
    'perksJson',
    'milestonesJson',
    'battlepassTiersJson',
    'clearConditions',
    'freeformLayersData',
    'voxelData',
    'publishedData',
    'gates',
    'proceduralConfig'
  ];
  for (const col of longTextCols) {
    const regex = new RegExp(`^([ \\t]*${col}[ \\t]+String\\??[ \\t]*(?:@[^\\n\\/]+)*)([ \\t]*(?:\\/\\/.*)?)?$`, 'gm');
    schema = schema.replace(regex, (match, p1, p2) => {
      if (p1.includes('@db.LongText')) return match;
      if (p1.includes('@db.Text')) return `${p1.replace('@db.Text', '@db.LongText')}${p2 || ''}`;
      return `${p1.trimEnd()} @db.LongText${p2 ? ' ' + p2.trim() : ''}`;
    });
  }

  const textCols = [
    'metadata', 'tags', 'categories', 'customLabels', 'atlasFrame', 'sourceRegion',
    'respawnRulesJson', 'entryRequirements', 'npcs', 'encounters', 'gates',
    'description', 'dialogStart', 'dialogProgress', 'dialogComplete', 'flavor',
    'tagline', 'baseStats', 'statDeltas', 'skillDeltas', 'growthRates',
    'allowedSpriteTags', 'spriteFilters', 'startingEquipment', 'learnableSkills',
    'perks', 'abilities', 'skillProgression', 'abilityProgression', 'perkProgression',
    'entries', 'guaranteedDrops', 'requiredTags', 'variants', 'types', 'terrains',
    'genderWeights', 'sounds', 'effects', 'stats', 'tagsJson', 'affixes', 'rewards',
    'stationTags', 'xpCurveData', 'spritePackIds', 'tilesetPackIds', 'systemPrompt',
    'prompt', 'response', 'context', 'notes', 'bio', 'installNotes', 'changelog',
    'appearanceData', 'lastCoords', 'drugStats', 'coords', 'activeCoords', 'ciphertext',
    'senderCiphertext', 'publicKey', 'animationFrames', 'onInteractPayload', 'onStepPayload'
  ];
  for (const col of textCols) {
    const regex = new RegExp(`^([ \\t]*${col}[ \\t]+String\\??[ \\t]*(?:@[^\\n\\/]+)*)([ \\t]*(?:\\/\\/.*)?)?$`, 'gm');
    schema = schema.replace(regex, (match, p1, p2) => {
      if (p1.includes('@db.Text') || p1.includes('@db.LongText')) return match;
      return `${p1.trimEnd()} @db.Text${p2 ? ' ' + p2.trim() : ''}`;
    });
  }

  fs.writeFileSync(schemaPath, schema, 'utf8');
  console.log('[+] Schema successfully adapted for MySQL.');
}
