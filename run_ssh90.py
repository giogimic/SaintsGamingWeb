import paramiko

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

cmd = """
cd ~/saints-web || cd /opt/saints-web || echo "NO_DIR"
git pull origin main
sudo docker compose down && sudo docker compose build && sudo docker compose up -d
"""

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(host, username=user, password=password)
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    # Wait for the command to finish
    exit_status = stdout.channel.recv_exit_status()
    print("EXIT CODE:", exit_status)
    print("STDOUT:", stdout.read().decode())
    print("STDERR:", stderr.read().decode())

finally:
    ssh.close()
