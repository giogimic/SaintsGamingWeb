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

    def run_sudo(cmd):
        stdin, stdout, stderr = client.exec_command(f"echo {password} | sudo -S {cmd}", get_pty=True)
        out = stdout.read().decode('utf-8', errors='ignore')
        print(f"\n---> Running: {cmd}\n", out)
        return out

    run_sudo("docker logs --tail 100 saints-gaming-web-beta")

    client.close()
except Exception as e:
    print("Error:", e)
