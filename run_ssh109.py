import paramiko

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(host, username=user, password=password)
    stdin, stdout, stderr = ssh.exec_command("cat /home/debian/SaintsGamingWeb/build4.log")
    out = stdout.read().decode('utf-8', errors='ignore')
    out = out.encode('ascii', errors='ignore').decode()
    print(out)
finally:
    ssh.close()
