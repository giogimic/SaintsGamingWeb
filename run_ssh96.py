import paramiko

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(host, username=user, password=password)
    stdin, stdout, stderr = ssh.exec_command("tail -n 20 /home/debian/SaintsGamingWeb/build.log")
    print(stdout.read().decode())
finally:
    ssh.close()
