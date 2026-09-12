import paramiko
import base64

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

node_script = """
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const map = await prisma.worldMap.findUnique({ where: { id: 'STARTING_MEADOW' } });
  if (map.publishedVersion > 0) {
    const regions = await prisma.worldMapVersionRegion.findMany({
      where: { version: { mapId: 'STARTING_MEADOW', version: map.publishedVersion } }
    });
    for (const r of regions) {
      console.log(`Region X: ${r.regionX}, Z: ${r.regionZ}`);
    }
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
"""

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(host, username=user, password=password)
    b64_js = base64.b64encode(node_script.encode()).decode()
    cmd = f"""
    echo '{b64_js}' | base64 -d > ~/check2.js &&
    sudo docker cp ~/check2.js saints-gaming-web:/app/check2.js &&
    sudo docker exec saints-gaming-web npx tsx check2.js
    """
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("STDOUT:", stdout.read().decode())
    print("STDERR:", stderr.read().decode())
finally:
    ssh.close()
