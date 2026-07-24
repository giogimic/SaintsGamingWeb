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

echo "[*] Resetting server working tree and pulling latest main..."
git reset --hard HEAD
git pull origin main

echo "[*] Restoring docker-compose DB linking setup..."
cp docker-compose.base.yml docker-compose.yml

if grep -q "DATABASE_URL=.*@db:3306" .env; then
    # Extract password from DATABASE_URL (format: mysql://user:pass@host:port/db)
    DB_PASS=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
    cat <<EOF >> docker-compose.yml

  db:
    image: mariadb:10.11
    container_name: saints-gaming-db
    restart: unless-stopped
    environment:
      MARIADB_DATABASE: saints_gaming
      MARIADB_USER: saints
      MARIADB_PASSWORD: ${DB_PASS}
      MARIADB_ROOT_PASSWORD: ${DB_PASS}
    volumes:
      - ./mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 5
EOF
    if ! grep -q "depends_on:" docker-compose.yml; then
        sed -i '/container_name: saints-gaming-web/a \\    depends_on:\\n      db:\\n        condition: service_started' docker-compose.yml
    fi
fi

echo "[*] Starting database container first..."
docker compose up -d db || true
echo "[*] Waiting 15s for MariaDB to initialize..."
sleep 15

echo "[*] Building latest production Web container (--no-cache)..."
docker compose build --no-cache web

echo "[*] Starting web container..."
docker compose up -d web

docker network connect saints-gaming-web_default saints-gaming-web || true
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
