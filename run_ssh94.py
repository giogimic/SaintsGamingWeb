import paramiko
import time

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

cmd = """
cd /home/debian/SaintsGamingWeb
echo 'Temp1992!' | sudo -S bash -c 'docker compose build saints-gaming-web && docker compose up -d saints-gaming-web' > build.log 2>&1
"""

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(host, username=user, password=password)
    # Use exec_command but don't wait for it if it takes forever, just wait 120s
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    # We will poll for the file build.log
    
finally:
    ssh.close()
