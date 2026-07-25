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
NC='\033[0m'
BOLD='\033[1m'

echo -e "${CYAN}${BOLD}========================================${NC}"
echo -e "${CYAN}${BOLD}  Saints Gaming — Update Script${NC}"
echo -e "${CYAN}${BOLD}========================================${NC}\n"

# --- Root / Sudo Check ---
if [ "$EUID" -ne 0 ] && ! command -v sudo &>/dev/null; then
    echo -e "${RED}[!] This script requires root privileges or sudo.${NC}"
    exit 1
fi

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

    # Sync MariaDB password in docker-compose.yml if using integrated DB
    if grep -q "DATABASE_URL=.*@db:3306" .env 2>/dev/null; then
        DB_PASS=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
        if [ -n "$DB_PASS" ]; then
            echo -e "${CYAN}[*] Syncing MariaDB password in docker-compose.yml...${NC}"
            sed -i "s/MARIADB_PASSWORD: .*/MARIADB_PASSWORD: ${DB_PASS}/" docker-compose.yml
            sed -i "s/MARIADB_ROOT_PASSWORD: .*/MARIADB_ROOT_PASSWORD: ${DB_PASS}/" docker-compose.yml
        fi
    fi

    sudo docker compose build --no-cache web > docker_build.log 2>&1
    if [ $? -ne 0 ]; then
        echo -e "${RED}[!] Build failed! Check docker_build.log for details.${NC}"
        exit 1
    fi

    sudo docker compose up -d web >> docker_build.log 2>&1
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

    echo -e "${CYAN}[*] Pushing database schema...${NC}"
    npx prisma db push --accept-data-loss

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