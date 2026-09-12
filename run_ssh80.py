import paramiko
import base64

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

node_script = """
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const map = await prisma.worldMap.findUnique({ where: { id: 'STARTING_MEADOW' } });
  if (!map) {
    console.log("No map");
    process.exit(1);
  }
  
  let data = {};
  if (map.publishedVersion > 0) {
    const ver = await prisma.worldMapVersion.findUnique({
      where: { mapId_version: { mapId: 'STARTING_MEADOW', version: map.publishedVersion } }
    });
    if (ver) {
      data = JSON.parse(ver.data);
    }
  }
  
  const payload = {
    id: map.id,
    gameId: map.gameId || 'saints',
    name: map.name,
    gridData: JSON.stringify(data.gridData || {}),
    gatesData: JSON.stringify(data.gatesData || {}),
    npcsData: JSON.stringify(data.npcsData || {}),
    encountersData: JSON.stringify(data.encountersData || []),
    tileLayersData: JSON.stringify(data.tileLayersData || {}),
    tilesetsData: JSON.stringify(data.tilesetsData || {}),
    voxelData: JSON.stringify(data.voxelData || {}),
    mapType: map.mapType,
    version: map.publishedVersion || 1
  };
  
  fs.writeFileSync('/app/payload.json', JSON.stringify(payload));
  
  await prisma.siteSetting.updateMany({
    where: { key: { in: ['SPAWN_MAP_ID', 'DEFAULT_MAP_ID'] } },
    data: { value: 'STARTING_MEADOW' }
  });
  
  await prisma.gameCharacter.updateMany({
    data: { mapId: 'STARTING_MEADOW' }
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
"""

py_sqlite_script = """
import json
import sqlite3

with open('/home/debian/payload.json', 'r') as f:
    m = json.load(f)

conn = sqlite3.connect('/home/debian/SaintsGamingWeb/the-lobby/go-mmo.db')
c = conn.cursor()

c.execute("SELECT COUNT(1) FROM WorldMap WHERE id=?", (m['id'],))
if c.fetchone()[0] == 0:
    c.execute('''
        INSERT INTO WorldMap (id, gameId, name, gridData, gatesData, npcsData, encountersData, tileLayersData, tilesetsData, voxelData, mapType, version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (m['id'], m['gameId'], m['name'], m['gridData'], m['gatesData'], m['npcsData'], m['encountersData'], m['tileLayersData'], m['tilesetsData'], m['voxelData'], m['mapType'], m['version']))
    print("Inserted map into SQLite!")
else:
    c.execute('''
        UPDATE WorldMap SET name=?, gridData=?, gatesData=?, npcsData=?, encountersData=?, tileLayersData=?, tilesetsData=?, voxelData=?, mapType=?, version=?
        WHERE id=?
    ''', (m['name'], m['gridData'], m['gatesData'], m['npcsData'], m['encountersData'], m['tileLayersData'], m['tilesetsData'], m['voxelData'], m['mapType'], m['version'], m['id']))
    print("Updated map in SQLite!")

conn.commit()
conn.close()
"""

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(host, username=user, password=password)
    
    b64_js = base64.b64encode(node_script.encode()).decode()
    b64_py = base64.b64encode(py_sqlite_script.encode()).decode()
    
    cmd = f"""
    echo '{b64_js}' | base64 -d > ~/sync.js &&
    sudo docker cp ~/sync.js saints-gaming-web:/app/sync.js &&
    sudo docker exec saints-gaming-web npx tsx sync.js &&
    sudo docker cp saints-gaming-web:/app/payload.json ~/payload.json &&
    echo '{b64_py}' | base64 -d > ~/import.py &&
    python3 ~/import.py
    """
    
    print("Running sync sequence...")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("STDOUT:", stdout.read().decode())
    print("STDERR:", stderr.read().decode())
    
    ssh.exec_command("echo 'Temp1992!' | sudo -S docker restart saints-gaming-web saints-lobby")
    print("Restarted containers.")

finally:
    ssh.close()
