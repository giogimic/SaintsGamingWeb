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
trap 'kill $(jobs -p) 2>/dev/null' EXIT
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
if grep -q "^DATABASE_URL=.*@db:3306" .env 2>/dev/null && command -v docker &>/dev/null; then
    if docker ps | grep -q "saints-gaming-db"; then
        echo -e "${CYAN}[*] Performing automated database backup before updating...${NC}"
        mkdir -p backups
        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        DB_USER=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://\([^:]*\):.*|\1|p')
        DB_PASS=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
        
        docker exec saints-gaming-db mariadb-dump -u "$DB_USER" -p"$DB_PASS" saints_gaming > "backups/db_backup_$TIMESTAMP.sql" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}[✓] Database backed up to backups/db_backup_$TIMESTAMP.sql${NC}"
        else
            echo -e "${YELLOW}[!] Database backup failed. (This usually happens if the DB is empty or just starting). Skipping...${NC}"
            rm -f "backups/db_backup_$TIMESTAMP.sql"
        fi
    fi
fi

# --- Git Pull ---
echo -e "${CYAN}[*] Fetching latest code from Git...${NC}"
git fetch --all
if [ $? -ne 0 ]; then
    echo -e "${RED}[!] git fetch failed. Check your internet connection.${NC}"
    exit 1
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${YELLOW}[!] Warning: You are on branch '$CURRENT_BRANCH', not 'main'.${NC}"
    read -p "Are you sure you want to reset this branch to origin/main? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}[*] Update aborted.${NC}"
        exit 1
    fi
fi

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo -e "${GREEN}[✓] Already up to date with origin/main.${NC}"
    read -p "Do you want to force rebuild anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
else
    echo -e "${CYAN}[*] Updates found. Commits to be applied:${NC}"
    git log HEAD..origin/main --oneline
    echo ""
fi

if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}[!] Warning: You have uncommitted local changes that will be OVERWRITTEN.${NC}"
    read -p "Continue and OVERWRITE local changes? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}[*] Update aborted.${NC}"
        exit 1
    fi
fi

echo -e "${CYAN}[*] Pulling latest code (resetting to origin/main)...${NC}"
git reset --hard origin/main
echo -e "${GREEN}[✓] Code updated.${NC}\n"

# --- Docker Environment ---
if [ -f "docker-compose.yml" ] && command -v docker &>/dev/null; then
    echo -e "${CYAN}[*] Docker environment detected. Rebuilding web container...${NC}"

    # --- Verify & Fix MariaDB Credentials ---
    if grep -q "^DATABASE_URL=.*@db:3306" .env 2>/dev/null; then
        if docker ps | grep -q "saints-gaming-db"; then
            DB_PASS=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
            DB_USER=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://\([^:]*\):.*|\1|p')
            if [ -n "$DB_PASS" ] && [ -n "$DB_USER" ]; then
                echo -e "${CYAN}[*] Verifying MariaDB credentials match .env...${NC}"
                if ! docker exec saints-gaming-db mariadb -u "$DB_USER" -p"$DB_PASS" -e "SELECT 1;" saints_gaming &>/dev/null; then
                    echo -e "${YELLOW}[!] Credential mismatch detected — resetting MariaDB user password to match .env...${NC}"
                
                # Extract root password from container environment to ensure we can connect
                ROOT_PASS=$(docker exec saints-gaming-db env | grep MARIADB_ROOT_PASSWORD= | cut -d= -f2-)
                
                docker exec saints-gaming-db mariadb -u root -p"$ROOT_PASS" -e \
                    "ALTER USER '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASS}'; FLUSH PRIVILEGES;" 2>/dev/null || \
                docker exec saints-gaming-db mariadb -u root -p"$DB_PASS" -e \
                    "ALTER USER '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASS}'; FLUSH PRIVILEGES;" 2>/dev/null || \
                docker exec saints-gaming-db mariadb -u root -e \
                    "ALTER USER '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASS}'; FLUSH PRIVILEGES;" 2>/dev/null

                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}[✓] MariaDB credentials synced successfully.${NC}"
                else
                    echo -e "${RED}[!] Could not auto-fix MariaDB credentials. You may need to run setup.sh.${NC}"
                fi
            else
                echo -e "${GREEN}[✓] MariaDB credentials are valid.${NC}"
            fi
            # We don't touch docker-compose.yml passwords here anymore, let setup.sh or manual config handle that
        fi
        else
            echo -e "${YELLOW}[*] saints-gaming-db container not running, skipping credential check.${NC}"
        fi
    fi

    docker compose build web > docker_build.log 2>&1
    if [ $? -ne 0 ]; then
        echo -e "${RED}[!] Build failed! Check docker_build.log for details.${NC}"
        exit 1
    fi

    docker compose up -d --no-deps web >> docker_build.log 2>&1
    if [ $? -ne 0 ]; then
        echo -e "${RED}[!] Failed to start web container. Check docker_build.log.${NC}"
        exit 1
    fi

    echo -e "${GREEN}[✓] Web container rebuilt and restarted.${NC}\n"

    echo -e "${CYAN}[*] Syncing local game assets to database...${NC}"
    docker exec saints-gaming-web npm run sync:assets 2>/dev/null || true
    echo -e "${GREEN}[✓] Assets synced.${NC}\n"

    # MMO sockets live inside the web container (server.ts). Stop any leftover :3001 container.
    if docker ps -a --format '{{.Names}}' | grep -q '^saints-gaming-mmo$'; then
        echo -e "${CYAN}[*] Removing obsolete saints-gaming-mmo container (sockets are on web:3000)...${NC}"
        docker rm -f saints-gaming-mmo 2>/dev/null || true
    fi
    if command -v pm2 &>/dev/null; then
        echo -e "${CYAN}[*] Ensuring PM2 runs custom server.ts (not next start / game-server.js)...${NC}"
        pm2 delete saints-gaming-mmo 2>/dev/null || true
        pm2 restart saints-gaming-web 2>/dev/null || pm2 start ecosystem.config.js 2>/dev/null || true
        echo -e "${GREEN}[✓] PM2 web/MMO process refreshed.${NC}"
    fi

    # Clean up conflicting or orphaned systemd services if Docker is running
    if command -v systemctl &>/dev/null; then
        bash "$(dirname "$0")/audit-systemd.sh" --clean -y 2>/dev/null || true
    fi

    # Reload proxy server if present
    if command -v systemctl &>/dev/null; then
        echo -e "${CYAN}[*] Reloading web proxies if present...${NC}"
        if systemctl is-active --quiet caddy; then sudo systemctl reload caddy 2>/dev/null; fi
        if systemctl is-active --quiet nginx; then sudo systemctl reload nginx 2>/dev/null; fi
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
        echo -e "${CYAN}[*] Reloading PM2 (custom server.ts via ecosystem.config.js)...${NC}"
        pm2 delete saints-gaming-mmo 2>/dev/null || true
        pm2 startOrReload ecosystem.config.js 2>/dev/null || pm2 reload all 2>/dev/null || true
    fi
fi

echo -e "${GREEN}${BOLD}[✓] Update Complete!${NC}\n"
echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "  View Logs:    docker logs saints-gaming-web -f"
echo -e "  Stop:         docker compose down"
echo -e "  Restart:      docker compose restart"
echo -e "  Verify maps:  curl -sS \$SITE/api/maps | head"
echo -e "  Verify sock:  curl -sS -o /dev/null -w '%{http_code}\\n' \"\$SITE/socket.io/?EIO=4&transport=polling\""