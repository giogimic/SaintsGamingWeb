import paramiko

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

cmd = """
cd /home/debian/SaintsGamingWeb || exit 1
git pull origin main
echo 'Temp1992!' | sudo -S docker compose build saints-gaming-web
echo 'Temp1992!' | sudo -S docker compose up -d saints-gaming-web
"""

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(host, username=user, password=password)
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    # We shouldn't wait endlessly if the build takes 3 minutes, but it's Next.js and it's docker...
    # I'll wait 60s max or just let it finish. Wait, paramiko blocks.
    
    # We can stream output
    import sys
    for line in iter(stdout.readline, ""):
        print(line, end="")
finally:
    ssh.close()
