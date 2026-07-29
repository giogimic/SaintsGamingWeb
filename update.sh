#!/bin/bash
# =============================================================================
#  Saints Gaming — Update Script
#  Pulls the latest code and rebuilds the web container in-place.
#  Safe to run on a live server — preserves .env, database, and uploads.
# =============================================================================

# --- Colors ---
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'
BOLD='\033[1m'

clear
echo -e "${CYAN}${BOLD}========================================${NC}"
echo -e "${CYAN}${BOLD}  Saints Gaming — Update Script${NC}"
echo -e "${CYAN}${BOLD}========================================${NC}\n"

# --- Root / Sudo Check ---
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}[!] Error: Do NOT run this script as root (e.g., sudo ./update.sh).${NC}"
    echo -e "${YELLOW}    Please run it as your normal user: ./update.sh${NC}"
    echo -e "${YELLOW}    The script will securely prompt for your sudo password when necessary.${NC}"
    exit 1
fi

echo -e "${CYAN}[*] Requesting sudo privileges for update...${NC}"
if ! sudo -v; then
    echo -e "${RED}[!] Error: This script requires sudo privileges to restart services.${NC}"
    exit 1
fi

# Keep sudo alive
while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null &

# --- Guard: .env must exist ---
if [ ! -f .env ]; then
    echo -e "${RED}[!] No .env file found!${NC}"
    echo -e "${YELLOW}    This does not look like a configured installation.${NC}"
    echo -e "${YELLOW}    Please run ${BOLD}./setup.sh${NC}${YELLOW} first for a fresh install.${NC}"
    exit 1
fi

# --- Guard: docker-compose.yml must exist ---
if [ ! -f docker-compose.yml ]; then
    echo -e "${YELLOW}[*] docker-compose.yml is missing. Restoring from base...${NC}"
    if [ -f docker-compose.base.yml ]; then
        cp docker-compose.base.yml docker-compose.yml
        echo -e "${GREEN}[✓] Restored docker-compose.yml from base.${NC}"
    else
        echo -e "${RED}[!] docker-compose.base.yml not found. Cannot continue.${NC}"
        exit 1
    fi
fi

# --- Automated Database Backup ---
if grep -q "DATABASE_URL=.*@db:3306" .env 2>/dev/null && command -v docker &>/dev/null; then
    if sudo docker ps | grep -q "saints-gaming-db"; then
        echo -e "${CYAN}[*] Performing automated database backup before updating...${NC}"
        mkdir -p backups
        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        DB_USER=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://\([^:]*\):.*|\1|p')
        DB_PASS=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
        
        sudo docker exec saints-gaming-db mariadb-dump -u "$DB_USER" -p"$DB_PASS" saints_gaming > "backups/db_backup_$TIMESTAMP.sql" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}[✓] Database backed up to backups/db_backup_$TIMESTAMP.sql${NC}"
        else
            echo -e "${YELLOW}[!] Database backup failed. (This usually happens if the DB is empty or just starting). Skipping...${NC}"
            rm -f "backups/db_backup_$TIMESTAMP.sql"
        fi
    fi
fi

# --- Git Pull ---
echo -e "${CYAN}[*] Pulling latest code from Git...${NC}"
git pull
if [ $? -ne 0 ]; then
    echo -e "${RED}[!] git pull failed. Check your internet connection or resolve merge conflicts.${NC}"
    exit 1
fi
echo -e "${GREEN}[✓] Code updated.${NC}\n"

# --- Docker Environment ---
if [ -f "docker-compose.yml" ] && command -v docker &>/dev/null; then
    echo -e "${CYAN}[*] Docker environment detected. Rebuilding web container...${NC}"

    # --- Verify & Fix MariaDB Credentials ---
    if grep -q "DATABASE_URL=.*@db:3306" .env 2>/dev/null; then
        DB_PASS=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
        DB_USER=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://\([^:]*\):.*|\1|p')
        if [ -n "$DB_PASS" ] && [ -n "$DB_USER" ]; then
            echo -e "${CYAN}[*] Verifying MariaDB credentials match .env...${NC}"
            if ! sudo docker exec saints-gaming-db mariadb -u "$DB_USER" -p"$DB_PASS" -e "SELECT 1;" saints_gaming &>/dev/null; then
                echo -e "${YELLOW}[!] Credential mismatch detected — resetting MariaDB user password to match .env...${NC}"
                sudo docker exec saints-gaming-db mariadb -u root -p"$DB_PASS" -e \
                    "ALTER USER '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASS}'; FLUSH PRIVILEGES;" 2>/dev/null || \
                sudo docker exec saints-gaming-db mariadb -u root -e \
                    "ALTER USER '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASS}'; FLUSH PRIVILEGES;" 2>/dev/null
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}[✓] MariaDB credentials synced successfully.${NC}"
                else
                    echo -e "${RED}[!] Could not auto-fix MariaDB credentials. You may need to run setup.sh.${NC}"
                fi
            else
                echo -e "${GREEN}[✓] MariaDB credentials are valid.${NC}"
            fi
            sed -i "s/MARIADB_PASSWORD: .*/MARIADB_PASSWORD: ${DB_PASS}/" docker-compose.yml
            sed -i "s/MARIADB_ROOT_PASSWORD: .*/MARIADB_ROOT_PASSWORD: ${DB_PASS}/" docker-compose.yml
        fi
    fi

    sudo docker compose build web > docker_build.log 2>&1
    if [ $? -ne 0 ]; then
        echo -e "${RED}[!] Build failed! Check docker_build.log for details.${NC}"
        exit 1
    fi

    sudo docker compose up -d --no-deps web >> docker_build.log 2>&1
    if [ $? -ne 0 ]; then
        echo -e "${RED}[!] Failed to start web container. Check docker_build.log.${NC}"
        exit 1
    fi

    echo -e "${GREEN}[✓] Web container rebuilt and restarted.${NC}\n"

    # Reload proxy server if present
    if command -v systemctl &>/dev/null; then
        echo -e "${CYAN}[*] Reloading web proxies if present...${NC}"
        sudo systemctl reload caddy 2>/dev/null || sudo systemctl restart caddy 2>/dev/null || true
        sudo systemctl reload nginx 2>/dev/null || sudo systemctl restart nginx 2>/dev/null || true
    fi

else
    # --- Non-Docker Fallback ---
    echo -e "${YELLOW}[*] No Docker environment detected. Falling back to npm build...${NC}"

    if ! command -v node &>/dev/null; then
        echo -e "${RED}[!] Node.js is not installed. Cannot build without Docker or Node.${NC}"
        exit 1
    fi

    echo -e "${CYAN}[*] Installing dependencies...${NC}"
    npm install

    echo -e "${CYAN}[*] Running safe database migrations...${NC}"
    npx prisma migrate deploy

    echo -e "${CYAN}[*] Building production bundle...${NC}"
    npm run build

    if command -v pm2 &>/dev/null; then
        echo -e "${CYAN}[*] Reloading PM2 processes...${NC}"
        pm2 reload all
    fi
fi

echo -e "${GREEN}${BOLD}[✓] Update Complete!${NC}\n"
echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "  View Logs:    sudo docker logs saints-gaming-web -f"
echo -e "  Stop:         sudo docker compose down"
echo -e "  Restart:      sudo docker compose restart"