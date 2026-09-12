import paramiko
import base64

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(host, username=user, password=password)
    
    cmd = f"""
    echo 'Temp1992!' | sudo -S python3 ~/import.py
    """
    
    print("Running sqlite insert with sudo...")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("STDOUT:", stdout.read().decode())
    print("STDERR:", stderr.read().decode())
    
    ssh.exec_command("echo 'Temp1992!' | sudo -S docker restart saints-gaming-web saints-lobby")
    print("Restarted containers.")

finally:
    ssh.close()
