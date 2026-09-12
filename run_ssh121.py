import paramiko

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(host, username=user, password=password)
    cmd = """echo 'Temp1992!' | sudo -S cat /home/debian/SaintsGamingWeb/docker-compose.yml"""
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    # Read outputs to block until completion
    print("STDOUT:", stdout.read().decode())
    
finally:
    ssh.close()
