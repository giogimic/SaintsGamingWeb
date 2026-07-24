import paramiko
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

HOSTNAME = "saintsgaming.net"
USERNAME = "giogimic"
PASSWORD = os.environ.get("SAINTS_SSH_PASS", "")
if not PASSWORD:
    PASSWORD = input("Enter SSH password: ")

def check_logs():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        print(f"[*] Connecting to {HOSTNAME}...")
        client.connect(HOSTNAME, username=USERNAME, password=PASSWORD, timeout=10)

        print("\n--- Live Container Logs (Tail 50) ---")
        stdin, stdout, stderr = client.exec_command(f"echo '{PASSWORD}' | sudo -S docker logs --tail 50 saints-gaming-web", get_pty=True)
        print(stdout.read().decode('utf-8', errors='ignore'))

        client.close()
    except Exception as e:
        print("[!] Error fetching logs:", e)

if __name__ == '__main__':
    check_logs()
