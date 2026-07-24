import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

HOSTNAME = "saintsgaming.net"
USERNAME = "giogimic"
PASSWORD = "REDACTED"

def update_live():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        print(f"[*] Connecting to {HOSTNAME}...")
        client.connect(HOSTNAME, username=USERNAME, password=PASSWORD, timeout=10)

        bash_script = """#!/bin/bash
set -e
cd /home/giogimic/Saints-Gaming-Web

echo "[*] Pulling latest updates from Git main branch..."
git pull origin main

echo "[*] Restoring docker-compose DB linking setup..."
cp docker-compose.base.yml docker-compose.yml

if grep -q "DATABASE_URL=.*@db:3306" .env; then
    DB_PASS=$(grep '^MARIADB_PASSWORD=' .env | cut -d'=' -f2)
    DB_ROOT_PASS=$(grep '^MARIADB_ROOT_PASSWORD=' .env | cut -d'=' -f2)
    cat <<EOF >> docker-compose.yml

  db:
    image: mariadb:10.11
    container_name: saints-gaming-db
    restart: unless-stopped
    environment:
      MARIADB_DATABASE: saints_gaming
      MARIADB_USER: saints
      MARIADB_PASSWORD: ${DB_PASS}
      MARIADB_ROOT_PASSWORD: ${DB_ROOT_PASS}
    volumes:
      - ./mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 5
EOF
    sed -i '/container_name: saints-gaming-web/a \\    depends_on:\\n      db:\\n        condition: service_healthy' docker-compose.yml
fi

echo "[*] Building latest production Web container (--no-cache)..."
docker compose build --no-cache web

echo "[*] Restarting production container..."
docker compose up -d web

docker network connect saints-gaming-web_default saints-gaming-web || true
docker restart saints-gaming-web || true
echo "[✓] Deployment completed successfully!"
"""

        sftp = client.open_sftp()
        with sftp.file('/home/giogimic/deploy.sh', 'w') as f:
            f.write(bash_script)
        sftp.close()

        print("[*] Executing deployment script on server...")
        stdin, stdout, stderr = client.exec_command(f"echo '{PASSWORD}' | sudo -S bash /home/giogimic/deploy.sh", get_pty=True)
        
        for line in iter(stdout.readline, ""):
            print(line, end="")

        client.close()
    except Exception as e:
        print("[!] Error during update:", e)

if __name__ == '__main__':
    update_live()
