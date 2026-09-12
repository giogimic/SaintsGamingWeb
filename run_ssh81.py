import paramiko
host = 'saintsgaming.net'
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username='debian', password='Temp1992!')
stdin, stdout, stderr = ssh.exec_command("find ~/SaintsGamingWeb -name 'go-mmo.db'")
print("STDOUT:", stdout.read().decode())
