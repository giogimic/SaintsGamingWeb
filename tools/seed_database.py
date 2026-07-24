import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

HOSTNAME = "saintsgaming.net"
USERNAME = "giogimic"
PASSWORD = "REDACTED"

def seed_database():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        print(f"[*] Connecting to {HOSTNAME}...")
        client.connect(HOSTNAME, username=USERNAME, password=PASSWORD, timeout=10)

        print("[*] Running Prisma Seed inside saints-gaming-web container...")
        stdin, stdout, stderr = client.exec_command(f"echo '{PASSWORD}' | sudo -S docker exec saints-gaming-web bun run prisma/seed.ts", get_pty=True)
        print(stdout.read().decode('utf-8', errors='ignore'))

        client.close()
        print("[✓] Database seeding finished!")
    except Exception as e:
        print("[!] Error seeding database:", e)

if __name__ == '__main__':
    seed_database()
