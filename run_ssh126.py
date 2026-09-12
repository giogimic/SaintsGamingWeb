import paramiko

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(host, username=user, password=password)
    # The frontend is built and deployed using docker-compose at /home/debian/SaintsGamingWeb
    cmd = """echo 'Temp1992!' | sudo -S bash -c "cd /home/debian/SaintsGamingWeb && git pull origin main && docker compose build web && docker compose stop web && docker compose up -d web" """
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    # Read outputs to block until completion
    print("STDOUT:", stdout.read().decode())
    print("STDERR:", stderr.read().decode())
    
finally:
    ssh.close()
