import paramiko

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

cmd = """
cd /home/debian/SaintsGamingWeb
sudo docker compose ps
"""

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(host, username=user, password=password)
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("STDOUT:", stdout.read().decode())
finally:
    ssh.close()
