const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'prisma/db/dev.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening db', err);
    process.exit(1);
  }
});

db.serialize(() => {
  db.get("SELECT value FROM ServerSettings WHERE key = 'startingMapId'", (err, row) => {
    console.log('startingMapId:', row ? row.value : 'Not found');
    const mapId = row?.value || 'STARTING_MEADOW';
    
    db.get("SELECT id, name, publishedVersion FROM WorldMap WHERE id = ?", [mapId], (err, mapRow) => {
      console.log('WorldMap:', mapRow);
      
      if (mapRow) {
        db.get("SELECT id, version FROM WorldMapVersion WHERE mapId = ?", [mapId], (err, versionRow) => {
          console.log('WorldMapVersion:', versionRow);
        });
      }
      
      db.all("SELECT id, name, publishedVersion FROM WorldMap", (err, allMaps) => {
        console.log('All maps:');
        console.table(allMaps);
      });
      
      db.all("SELECT id, mapId, version FROM WorldMapVersion", (err, allVersions) => {
        console.log('All versions:');
        console.table(allVersions);
      });
    });
  });
});
