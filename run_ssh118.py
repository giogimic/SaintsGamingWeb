import paramiko

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(host, username=user, password=password)
    cmd = """echo 'Temp1992!' | sudo -S bash -c "cd /home/debian/SaintsGamingWeb && git pull origin main && docker compose build saints-lobby && docker compose stop saints-lobby && docker compose up -d saints-lobby" """
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    # Read outputs to block until completion
    print("STDOUT:", stdout.read().decode())
    print("STDERR:", stderr.read().decode())
    
finally:
    ssh.close()
