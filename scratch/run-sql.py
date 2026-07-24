import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

hostname = "saintsgaming.net"
username = "giogimic"
password = "REDACTED"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print(f"Connecting to {hostname}...")
    client.connect(hostname, username=username, password=password, timeout=10)

    # Read the local sql file
    with open('seed-assets.sql', 'r', encoding='utf-8') as f:
        sql = f.read()

    # Create the remote sql file
    sftp = client.open_sftp()
    with sftp.file('/home/giogimic/seed-assets.sql', 'w') as f:
        f.write(sql)
    sftp.close()

    def run_sudo(cmd):
        stdin, stdout, stderr = client.exec_command(f"echo {password} | sudo -S {cmd}", get_pty=True)
        out = stdout.read().decode('utf-8', errors='ignore')
        print(f"\n---> Running: {cmd}\n", out)
        return out

    # Pipe it into docker
    cmd = "cat /home/giogimic/seed-assets.sql | docker exec -i saints-gaming-db mysql -usaints -pvHR7eRIAXbz6DelU saints_gaming"
    run_sudo(cmd)

    client.close()
    print("Database seeded successfully via SQL!")
except Exception as e:
    print("Error:", e)
