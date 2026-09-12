import paramiko

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(host, username=user, password=password)
    cmd = "echo 'Temp1992!' | sudo -S docker exec saints-gaming-redis redis-cli FLUSHALL"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode())
finally:
    ssh.close()
