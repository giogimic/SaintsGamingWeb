import paramiko
host = 'saintsgaming.net'
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username='debian', password='Temp1992!')
stdin, stdout, stderr = ssh.exec_command("echo 'Temp1992!' | sudo -S docker exec saints-gaming-web pwd")
print("STDOUT:", stdout.read().decode())
