import paramiko
import time

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(host, username=user, password=password)
    
    print("Waiting for build to finish (checking build2.log)...")
    for _ in range(40):
        stdin, stdout, stderr = ssh.exec_command("tail -n 20 /home/debian/SaintsGamingWeb/build2.log")
        out = stdout.read().decode()
        if "Container saints-gaming-web" in out or "Started" in out:
            print(out)
            break
        elif "failed" in out.lower() or "error" in out.lower():
            print(out)
            break
        time.sleep(5)
        
    stdin, stdout, stderr = ssh.exec_command("sudo docker ps")
    print(stdout.read().decode())
    
finally:
    ssh.close()
