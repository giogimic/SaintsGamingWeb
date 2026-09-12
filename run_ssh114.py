import paramiko

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(host, username=user, password=password)
    # the mmo.db is mounted at /home/debian/SaintsGamingWeb/the-lobby/data/mmo.db
    cmd = "echo 'Temp1992!' | sudo -S sqlite3 /home/debian/SaintsGamingWeb/the-lobby/data/mmo.db 'SELECT id, spawnX, spawnY FROM maps LIMIT 10;'"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode())
finally:
    ssh.close()
