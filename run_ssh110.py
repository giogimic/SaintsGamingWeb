import paramiko

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(host, username=user, password=password)
    stdin, stdout, stderr = ssh.exec_command("echo 'Temp1992!' | sudo -S docker exec saints-gaming-db mysql -usaints -pytCjnc25OOkEQNWi saints_gaming -e 'SELECT id, spawnCoords FROM WorldMap WHERE id=\"STARTING_MEADOW\";'")
    print(stdout.read().decode())
finally:
    ssh.close()
