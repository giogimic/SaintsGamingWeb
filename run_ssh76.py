import paramiko
import base64

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

node_script = '''
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const map = await prisma.worldMap.findUnique({ where: { id: 'STARTING_MEADOW' } });
  if (!map) {
    console.log("No map");
    process.exit(1);
  }
  
  let data;
  if (map.publishedVersion > 0) {
    const ver = await prisma.worldMapVersion.findUnique({
      where: { mapId_version: { mapId: 'STARTING_MEADOW', version: map.publishedVersion } }
    });
    data = JSON.parse(ver.data);
  } else {
    data = {};
  }
  
  const payload = {
    maps: [{
      id: map.id,
      name: map.name,
      gridData: data.gridData || {},
      gatesData: data.gatesData || {},
      npcsData: data.npcsData || {},
      tileLayersData: data.tileLayersData || {},
      tilesetsData: data.tilesetsData || {},
      voxelData: data.voxelData || {},
      mapType: map.mapType,
      version: map.publishedVersion || 1
    }]
  };
  
  const res = await fetch('http://saints-lobby:24011/api/internal/deploy-release', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': Bearer Temp1992!_internal_bypass // the Go server uses internal token for deploys
    },
    body: JSON.stringify(payload)
  });
  console.log(await res.text());
  
  await prisma.siteSetting.updateMany({
    where: { key: { in: ['SPAWN_MAP_ID', 'DEFAULT_MAP_ID'] } },
    data: { value: 'STARTING_MEADOW' }
  });
  console.log("Updated SPAWN_MAP_ID to STARTING_MEADOW");
}

run().catch(console.error).finally(() => prisma.());
'''

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(host, username=user, password=password)
    
    b64_js = base64.b64encode(node_script.encode()).decode()
    cmd = f"echo '{b64_js}' | base64 -d > ~/sync.js && sudo docker cp ~/sync.js saints-gaming-web:/usr/src/app/sync.js && sudo docker exec saints-gaming-web npx tsx sync.js"
    print(f'Running on remote...')
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("STDOUT:", stdout.read().decode())
    print("STDERR:", stderr.read().decode())
    
    # Restart docker containers
    ssh.exec_command("echo 'Temp1992!' | sudo -S docker restart saints-gaming-web saints-lobby")

finally:
    ssh.close()
