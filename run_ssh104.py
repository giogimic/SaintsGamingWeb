import paramiko

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(host, username=user, password=password)
    stdin, stdout, stderr = ssh.exec_command("cat /home/debian/SaintsGamingWeb/build3.log | grep -i 'fail\|error'")
    print(stdout.read().decode('utf-8', errors='ignore'))
finally:
    ssh.close()
