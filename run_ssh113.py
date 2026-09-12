import paramiko

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(host, username=user, password=password)
    # The mmo.db is in /app/data inside saints-lobby, or /opt/saints-web/go-mmo...
    # Where does saints-lobby store the mmo.db?
    cmd = "echo 'Temp1992!' | sudo -S docker exec saints-lobby sqlite3 /app/data/mmo.db 'SELECT accountId, mapId, x, y FROM players LIMIT 10;'"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode())
finally:
    ssh.close()
