import paramiko
import base64

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

node_script = """
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const maps = await prisma.worldMap.findMany();
  for (const m of maps) {
    const published = m.publishedVersion;
    if (published > 0) {
      const regions = await prisma.worldMapVersionRegion.count({
        where: { version: { mapId: m.id, version: published } }
      });
      console.log(`Map ${m.id} v${published} has ${regions} chunks.`);
    } else {
      console.log(`Map ${m.id} is not published.`);
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
    echo '{b64_js}' | base64 -d > ~/check.js &&
    sudo docker cp ~/check.js saints-gaming-web:/app/check.js &&
    sudo docker exec saints-gaming-web npx tsx check.js
    """
    
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("STDOUT:", stdout.read().decode())
    print("STDERR:", stderr.read().decode())

finally:
    ssh.close()
