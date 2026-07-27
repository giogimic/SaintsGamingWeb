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

    # --- Verify & Fix MariaDB Credentials (prevents P1000 on updates) ---
    # The db container data volume retains the password from first-run setup.
    # If .env was ever changed, the running MariaDB password may differ.
    # We ONLY update the web container — never the db container — via --no-deps.
    if grep -q "DATABASE_URL=.*@db:3306" .env 2>/dev/null; then
        DB_PASS=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
        DB_USER=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://\([^:]*\):.*|\1|p')
        if [ -n "$DB_PASS" ] && [ -n "$DB_USER" ]; then
            echo -e "${CYAN}[*] Verifying MariaDB credentials match .env...${NC}"
            # Test if the current .env credentials actually work against the live DB
            if ! sudo docker exec saints-gaming-db mariadb -u "$DB_USER" -p"$DB_PASS" -e "SELECT 1;" saints_gaming &>/dev/null; then
                echo -e "${YELLOW}[!] Credential mismatch detected — resetting MariaDB user password to match .env...${NC}"
                # Use root to reset the user password to what .env expects
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
            # Also keep docker-compose.yml in sync for future restarts
            sed -i "s/MARIADB_PASSWORD: .*/MARIADB_PASSWORD: ${DB_PASS}/" docker-compose.yml
            sed -i "s/MARIADB_ROOT_PASSWORD: .*/MARIADB_ROOT_PASSWORD: ${DB_PASS}/" docker-compose.yml
        fi
    fi

    sudo docker compose build web > docker_build.log 2>&1
    if [ $? -ne 0 ]; then
        echo -e "${RED}[!] Build failed! Check docker_build.log for details.${NC}"
        exit 1
    fi

    # CRITICAL: Use --no-deps to ONLY restart the web container.
    # Without this, Docker Compose may also restart the db container, which
    # causes MariaDB to ignore its env vars (since the data volume exists),
    # resulting in a credential mismatch (P1000) on the next web boot.
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