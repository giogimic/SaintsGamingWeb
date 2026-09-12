import paramiko
host = 'saintsgaming.net'
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username='debian', password='Temp1992!')
stdin, stdout, stderr = ssh.exec_command("echo 'Temp1992!' | sudo -S docker exec saints-gaming-db mysql -usaints -pytCjnc25OOkEQNWi saints_gaming -e 'SELECT mapType FROM WorldMap WHERE id=\"STARTING_MEADOW\";'")
print("STDOUT:", stdout.read().decode())
