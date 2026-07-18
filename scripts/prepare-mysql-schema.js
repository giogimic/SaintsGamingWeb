/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf-8');

// List of fields that need @db.Text in MySQL/MariaDB
const textFields = [
  { model: 'User', fields: ['bio', 'banReason', 'image'] },
  { model: 'ForumCategory', fields: ['description', 'icon'] },
  { model: 'SubCategory', fields: ['description'] },
  { model: 'Thread', fields: ['body', 'iconImage'] },
  { model: 'Reply', fields: ['body'] },
  { model: 'NewsArticle', fields: ['excerpt', 'body', 'coverImage', 'icon'] },
  { model: 'PromoLink', fields: ['url'] },
  { model: 'MediaAsset', fields: ['url'] },
  { model: 'Modpack', fields: ['description', 'installNotes', 'changelog'] },
  { model: 'Character', fields: ['appearanceData', 'lastCoords', 'drugStats'] },
  { model: 'Property', fields: ['coords'] },
  { model: 'Vehicle', fields: ['activeCoords'] },
  { model: 'InventoryItem', fields: ['metadata'] },
  { model: 'TicketMessage', fields: ['body'] },
  { model: 'Notification', fields: ['message', 'link'] },
  { model: 'StreamProfile', fields: ['streamTitle', 'channelUrl'] },
  { model: 'SiteSetting', fields: ['value'] },
  { model: 'GameCharacter', fields: ['stateData'] },
  { model: 'WorldMap', fields: ['gridData', 'gatesData'] },
  { model: 'MmoDaemon', fields: ['stats', 'moves'] }
];

let inModel = null;

const lines = schema.split('\n').map(line => {
  const modelMatch = line.match(/^model\s+([A-Za-z0-9_]+)\s+\{/);
  if (modelMatch) {
    inModel = modelMatch[1];
    return line;
  }
  
  if (line.trim() === '}') {
    inModel = null;
    return line;
  }

  if (inModel) {
    const fieldSettings = textFields.find(t => t.model === inModel);
    if (fieldSettings) {
      for (const field of fieldSettings.fields) {
        // Match field definition: e.g. "body String" or "coverImage String?"
        const fieldRegex = new RegExp(`^(\\s+${field}\\s+String\\??)(.*)$`);
        const match = line.match(fieldRegex);
        if (match && !line.includes('@db.Text') && !line.includes('@db.LongText')) {
          return `${match[1]} @db.Text${match[2]}`;
        }
      }
    }
  }

  return line;
});

fs.writeFileSync(schemaPath, lines.join('\n'));
console.log('[*] Successfully prepared Prisma schema for MySQL (added @db.Text to long strings).');
