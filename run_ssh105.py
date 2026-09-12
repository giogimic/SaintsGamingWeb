import paramiko
import time

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

cmd = """
cd /home/debian/SaintsGamingWeb
git pull origin main
echo 'Temp1992!' | sudo -S bash -c 'docker compose build web && docker compose up -d web' > build4.log 2>&1
"""

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(host, username=user, password=password)
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
finally:
    ssh.close()
