#!/bin/bash
# =============================================================================
#  Saints Gaming — Fresh Install Setup Script
#  Run this on a freshly cloned repo to deploy the full stack.
# =============================================================================

# --- Colors & Styling ---
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

clear
echo -e "${PURPLE}${BOLD}"
echo "  ___   _   ___ _  _ _____ ___    ___   _   __  __ ___ _  _  ___ "
echo " / __| /_\ |_ _| \| |_   _/ __|  / __| /_\ |  \/  |_ _| \| |/ __|"
echo " \__ \/ _ \ | || .  | | | \__ \  | (_ |/ _ \| |\/| || || .  | (_ |"
echo " |___/_/ \_\___|_|\_| |_| |___/  \___/_/ \_\_|  |_|___|_|\_|\___| "
echo -e "${NC}"
echo -e "${CYAN}${BOLD}Welcome to the Saints Gaming Setup Wizard!${NC}\n"

trap ctrl_c INT
function ctrl_c() {
    echo -e "\n${RED}[!] Setup interrupted!${NC}"
    if command -v whiptail &>/dev/null; then
        if whiptail --title "Interrupt Detected" --yesno "Do you want to cancel the deployment? (Y/N)" 10 50; then
            echo -e "${YELLOW}Canceling setup...${NC}"
            exit 1
        fi
    else
        exit 1
    fi
}

spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        local last_log=$(tail -n 1 docker_build.log 2>/dev/null | tr -d '\n' | tr -d '\r' | cut -c1-70)
        printf "\r ${PURPLE}[%c]${NC}  %-70s" "$spinstr" "$last_log"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
    done
    printf "\r                                                                                 \r"
}

# --- Root / Sudo Check ---
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}[!] Error: Do NOT run this script as root (e.g., sudo ./setup.sh).${NC}"
    echo -e "${YELLOW}    Please run it as your normal user: ./setup.sh${NC}"
    echo -e "${YELLOW}    The script will securely prompt for your sudo password when necessary.${NC}"
    exit 1
fi

echo -e "${CYAN}[*] Requesting sudo privileges for installation...${NC}"
if ! sudo -v; then
    echo -e "${RED}[!] Error: This script requires sudo privileges to install packages and manage Docker.${NC}"
    exit 1
fi

# Keep sudo alive
while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null &

# --- Install Prerequisites ---
if ! command -v whiptail &>/dev/null || ! command -v curl &>/dev/null || ! command -v openssl &>/dev/null; then
    sudo apt-get update && sudo apt-get install -y whiptail net-tools curl openssl
fi

chmod +x *.sh 2>/dev/null || true

# --- Top-Level Setup Action Selector ---
IS_NUCLEAR_MODE=0
SETUP_ACTION=$(whiptail --title "Saints Gaming Deployment Gateway" --menu \
"Select setup operation to perform:\n" 18 78 4 \
"1" "✨ FIRST-TIME SETUP (Interactive guided fresh installation)" \
"2" "🔄 UPDATE DEPLOYMENT (Pulls updates, migrates DB & restarts stack)" \
"3" "🌐 UPDATE DOMAINS / PROXY (Configure Caddy, subdomains & SSL)" \
"4" "☢️  NUCLEAR REINSTALL (Wipe database, containers, .env & fresh deploy)" \
3>&1 1>&2 2>&3) || exit 0

if [ "$SETUP_ACTION" = "2" ]; then
    echo -e "${CYAN}[*] Handing off to Update Script...${NC}"
    if [ -f "./update.sh" ]; then
        chmod +x ./update.sh
        exec ./update.sh
    else
        git pull && npm run setup && docker-compose up -d --build
        exit 0
    fi
elif [ "$SETUP_ACTION" = "3" ]; then
    echo -e "${CYAN}[*] Handing off to Domain & Proxy Manager...${NC}"
    DEV_PROXY_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/dev-proxy.sh"
    if [ -f "$DEV_PROXY_SCRIPT" ]; then
        chmod +x "$DEV_PROXY_SCRIPT"
        exec "$DEV_PROXY_SCRIPT" ask
    else
        echo -e "${RED}[!] dev-proxy.sh not found.${NC}"
        exit 1
    fi
elif [ "$SETUP_ACTION" = "4" ]; then
    if ! whiptail --title "☢️ CONFIRM NUCLEAR REINSTALL ☢️" --yesno \
"Are you ABSOLUTELY sure you want to perform a NUCLEAR REINSTALL?\n\nThis will:\n• FORCE STOP and REMOVE all Saints Gaming containers & volumes\n• WIPE ./mysql_data and SQLite dev.db completely\n• RESET .env and regenerate all cryptographic secrets\n• Bypass all repetitive confirmation & warning prompts\n\nWARNING: THIS CANNOT BE UNDONE!" 16 75; then
        echo -e "${GREEN}[*] Nuclear reinstall cancelled.${NC}"
        exit 0
    fi

    echo -e "${RED}${BOLD}[☢️] EXECUTING NUCLEAR REINSTALL...${NC}"
    IS_NUCLEAR_MODE=1

    # Force-stop & purge running containers
    command -v docker &>/dev/null && docker rm -f saints-gaming-web saints-gaming-db go-mmo 2>/dev/null || true
    command -v docker-compose &>/dev/null && docker-compose down -v 2>/dev/null || true

    # Wipe database volumes & reset environment
    sudo rm -rf ./mysql_data ./data ./uploads/scratch 2>/dev/null || true
    rm -f ./prisma/db/dev.db ./prisma/db/dev.db-journal .env
    mkdir -p ./data ./uploads ./mysql_data
    chmod -R 777 ./data ./uploads ./mysql_data 2>/dev/null || true
    echo -e "${GREEN}[✓] Data and containers completely purged.${NC}"
fi

# --- Data Loss Prevention: MySQL Volume Check ---
MUST_REUSE_ENV=0
if [ "$IS_NUCLEAR_MODE" != "1" ]; then
    if [ -d "./mysql_data" ] && [ "$(ls -A ./mysql_data 2>/dev/null)" ]; then
        echo -e "${RED}${BOLD}[!] WARNING: Existing Database Volume Detected!${NC}"
        echo -e "${YELLOW}    The directory ./mysql_data contains data. If you proceed with a fresh setup,${NC}"
        echo -e "${YELLOW}    new passwords will be generated, which may cause a credential mismatch with${NC}"
        echo -e "${YELLOW}    your existing database, locking you out of your data!${NC}"
        if whiptail --title "Data Loss Warning!" --yesno "An existing database volume (mysql_data) was found.\n\nAre you absolutely sure you want to run setup? This may lock you out of your existing data.\n\n(Select NO to abort, or YES if you are wiping everything)" 12 70; then
            if whiptail --title "Wipe Database?" --yesno "Would you like to DELETE the existing database volume to start completely fresh?\n\nWARNING: THIS CANNOT BE UNDONE!" 10 60; then
                echo -e "${RED}[*] Wiping existing database volume...${NC}"
                sudo rm -rf ./mysql_data
            else
                echo -e "${YELLOW}[!] Keeping existing database volume...${NC}"
                MUST_REUSE_ENV=1
            fi
        else
            echo -e "${GREEN}[*] Setup aborted. Your data is safe.${NC}"
            echo -e "${YELLOW}    Use ./update.sh to update an existing deployment without overwriting credentials.${NC}"
            exit 0
        fi
    fi

    # --- Guard: Must be a fresh install ---
    REUSE_ENV=0
    if [ -f .env ]; then
        echo -e "${YELLOW}[!] A .env file already exists — this looks like an existing installation.${NC}"
        if whiptail --title "Existing Install Detected" --yesno "A .env file already exists.\n\nDo you want to continue and overwrite settings?\n\n(Select NO to cancel and run ./update.sh instead)" 12 65; then
            if [ "$MUST_REUSE_ENV" = "1" ]; then
                echo -e "${CYAN}[*] Forcing credential preservation because mysql_data was kept.${NC}"
                REUSE_ENV=1
                OLD_DB_PASS=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
                OLD_AUTH_SECRET=$(grep "^AUTH_SECRET=" .env | cut -d'=' -f2-)
            else
                if whiptail --title "Preserve Credentials" --yesno "Would you like to KEEP the existing database credentials from the current .env file?" 10 65; then
                    REUSE_ENV=1
                    OLD_DB_PASS=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
                    OLD_AUTH_SECRET=$(grep "^AUTH_SECRET=" .env | cut -d'=' -f2-)
                fi
            fi
        else
            exit 0
        fi
    elif [ "$MUST_REUSE_ENV" = "1" ]; then
        echo -e "${RED}[!] Error: mysql_data exists but .env is missing!${NC}"
        echo -e "${YELLOW}    We cannot safely generate new passwords without locking the database!${NC}"
        echo -e "${YELLOW}    Please wipe mysql_data or run setup.sh again and choose to wipe it.${NC}"
        exit 1
    fi
fi

# --- Helpers: unique Docker names (base, then base1, base2, …) ---
container_name_in_use() {
    local name="$1"
    command -v docker &>/dev/null || return 1
    docker ps -a --format '{{.Names}}' 2>/dev/null | grep -Fxq -- "$name"
}
unique_container_name() {
    local base="$1"
    local name="$base"
    local n=1
    while container_name_in_use "$name"; do
        name="${base}${n}"
        n=$((n + 1))
        if [ "$n" -gt 999 ]; then
            echo "${base}$$"
            return 0
        fi
    done
    if [ "$name" != "$base" ]; then
        echo -e "${YELLOW}[*] Container name '$base' in use — using '$name'.${NC}" >&2
    fi
    echo "$name"
}

WEB_CONTAINER_NAME="saints-gaming-web"
DB_CONTAINER_NAME="saints-gaming-db"
EXISTING_CADDY_ADDITIVE=0
DEV_PROXY_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/dev-proxy.sh"

# --- Detect already-running stack / Caddy (ask before changing anything) ---
EXISTING_HINTS=""
if [ "$IS_NUCLEAR_MODE" != "1" ]; then
    if command -v caddy &>/dev/null || [ -f /etc/caddy/Caddyfile ]; then
        EXISTING_HINTS="${EXISTING_HINTS}• Caddy install detected\n"
    fi
    if command -v systemctl &>/dev/null && systemctl is-active --quiet caddy 2>/dev/null; then
        EXISTING_HINTS="${EXISTING_HINTS}• Caddy service is RUNNING\n"
    fi
    if container_name_in_use "saints-gaming-web"; then
        EXISTING_HINTS="${EXISTING_HINTS}• Docker container saints-gaming-web exists\n"
    fi
    if container_name_in_use "saints-gaming-db"; then
        EXISTING_HINTS="${EXISTING_HINTS}• Docker container saints-gaming-db exists\n"
    fi

    if command -v systemctl &>/dev/null; then
        if systemctl is-active --quiet saints-web 2>/dev/null || systemctl is-active --quiet saints 2>/dev/null || systemctl is-active --quiet saints-gaming-web 2>/dev/null; then
            EXISTING_HINTS="${EXISTING_HINTS}• Host systemd service (saints-web) is RUNNING\n"
        fi
    fi

    if [ -n "$EXISTING_HINTS" ]; then
        EXIST_OPT=$(whiptail --title "Existing Server Detected" --menu "Something is already set up on this host:\n\n${EXISTING_HINTS}\nWhat should setup do?" 20 78 4 \
        "1" "Add subdomain only (keep primary Caddy/site — recommended for reruns)" \
        "2" "Continue full setup beside it (unique container names + free ports)" \
        "3" "Abort (use ./update.sh or ./scripts/dev-proxy.sh instead)" \
        "4" "Continue and allow killing conflicting ports (destructive)" 3>&1 1>&2 2>&3) || exit 1

        if [ "$EXIST_OPT" = "1" ]; then
            EXISTING_CADDY_ADDITIVE=1
            REVERSE_PROXY_MODE=1
            echo -e "${GREEN}[*] Additive mode: will not rewrite primary Caddy; only upsert a subdomain via dev-proxy.${NC}"
        elif [ "$EXIST_OPT" = "3" ]; then
            echo -e "${GREEN}[*] Aborted. For subdomain-only: ./scripts/dev-proxy.sh ask${NC}"
            exit 0
        elif [ "$EXIST_OPT" = "4" ]; then
            echo -e "${YELLOW}[*] Destructive path allowed for this run.${NC}"
            ALLOW_KILL_PORTS=1
        else
            ALLOW_KILL_PORTS=0
        fi
    fi
fi

# --- Port Auto-Discovery ---
HTTP_PORT=80
HTTPS_PORT=443
WEB_PORT=3000
REVERSE_PROXY_MODE=${REVERSE_PROXY_MODE:-0}
ALLOW_KILL_PORTS=${ALLOW_KILL_PORTS:-0}
CONFLICTS=""

if [ "$IS_NUCLEAR_MODE" = "1" ]; then
    ALLOW_KILL_PORTS=1
    if ss -tuln | grep -qE ":(80|443|3000) "; then
        echo -e "${CYAN}[*] Nuclear mode: Clearing conflicting ports 80/443/3000 & systemd services...${NC}"
        sudo apt-get update -qq && sudo apt-get install -y -qq psmisc 2>/dev/null || true
        sudo fuser -k 80/tcp 443/tcp 3000/tcp &>/dev/null || true
        bash "${SCRIPT_DIR}/audit-systemd.sh" --clean -y 2>/dev/null || true
        sleep 1
    fi
else
    if ss -tuln | grep -q ":80 "; then CONFLICTS="$CONFLICTS Port 80\n"; fi
    if ss -tuln | grep -q ":443 "; then CONFLICTS="$CONFLICTS Port 443\n"; fi
    if ss -tuln | grep -q ":3000 "; then CONFLICTS="$CONFLICTS Port 3000\n"; fi

    if [ "$EXISTING_CADDY_ADDITIVE" = "1" ]; then
        REVERSE_PROXY_MODE=1
        HTTP_PORT=""
        HTTPS_PORT=""
        while ss -tuln | grep -q ":$WEB_PORT "; do WEB_PORT=$((WEB_PORT+1)); done
        whiptail --title "Behind Existing Proxy" --msgbox "Additive / behind-proxy mode.\n\nApp will listen on: $WEB_PORT\nPrimary Caddy site will NOT be rewritten.\nYou will be asked for a subdomain to add." 12 70
    elif [ -n "$CONFLICTS" ]; then
        PORT_OPT=$(whiptail --title "Port Conflicts Detected" --menu "The following ports are already in use:\n$CONFLICTS\nHow do you want to resolve this?" 18 75 4 \
        "1" "Behind existing / reverse proxy (skip 80/443, free app port)" \
        "2" "Use alternative ports" \
        "3" "Abort — do not change anything" \
        "4" "KILL conflicting services (destructive)" 3>&1 1>&2 2>&3) || exit 1

        if [ "$PORT_OPT" = "1" ]; then
            REVERSE_PROXY_MODE=1
            HTTP_PORT=""
            HTTPS_PORT=""
            while ss -tuln | grep -q ":$WEB_PORT "; do WEB_PORT=$((WEB_PORT+1)); done
            if command -v caddy &>/dev/null || [ -f /etc/caddy/Caddyfile ]; then
                EXISTING_CADDY_ADDITIVE=1
                whiptail --title "Reverse Proxy Mode" --msgbox "Existing Caddy detected.\n\nApp port: $WEB_PORT\nSetup will ADD a subdomain only (primary site untouched).\nOr use: ./scripts/dev-proxy.sh ask" 13 70
            else
                whiptail --title "Reverse Proxy Mode" --msgbox "Reverse Proxy Mode Enabled.\n\nApp port: $WEB_PORT\nPoint your external proxy at http://127.0.0.1:$WEB_PORT" 12 65
            fi
        elif [ "$PORT_OPT" = "2" ]; then
            while ss -tuln | grep -q ":$HTTP_PORT "; do HTTP_PORT=$((HTTP_PORT+1)); done
            while ss -tuln | grep -q ":$HTTPS_PORT "; do HTTPS_PORT=$((HTTPS_PORT+1)); done
            while ss -tuln | grep -q ":$WEB_PORT "; do WEB_PORT=$((WEB_PORT+1)); done
            whiptail --title "New Ports Selected" --msgbox "Selected new available ports:\n\nHTTP: $HTTP_PORT\nHTTPS: $HTTPS_PORT\nWeb App: $WEB_PORT" 12 50
        elif [ "$PORT_OPT" = "3" ]; then
            echo -e "${GREEN}[*] Aborted with no changes.${NC}"
            exit 0
        elif [ "$PORT_OPT" = "4" ]; then
            if [ "$ALLOW_KILL_PORTS" != "1" ]; then
                if ! whiptail --title "Confirm Kill" --yesno "Really kill processes on 80/443/3000 and conflicting systemd services?" 10 65; then
                    exit 1
                fi
            fi
            echo -e "${CYAN}Killing processes and clearing conflicting systemd units...${NC}"
            sudo apt-get update && sudo apt-get install -y psmisc
            sudo fuser -k 80/tcp 443/tcp 3000/tcp || true
            bash "${SCRIPT_DIR}/audit-systemd.sh" --clean -y 2>/dev/null || true
            sleep 2
        else
            exit 1
        fi
    fi
fi

# Allocate unique container names so a second install cannot collide with itself.
WEB_CONTAINER_NAME="$(unique_container_name saints-gaming-web)"
DB_CONTAINER_NAME="$(unique_container_name saints-gaming-db)"

# --- RAM Check ---
if [ -f /proc/meminfo ]; then
    TOTAL_MEM=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
    if [ "$TOTAL_MEM" -lt 1500000 ]; then
        if ! whiptail --title "System Warning" --yesno "Your system has less than 1.5GB of RAM.\nThe Next.js compilation may crash.\n\nContinue anyway?" 10 60; then exit 1; fi
    fi
fi

# --- Docker Check ---
if ! command -v docker &>/dev/null; then
    whiptail --title "Docker Check" --infobox "Installing Docker..." 8 40
    sudo apt update && sudo apt install -y docker.io docker-compose
    sudo usermod -aG docker $USER
fi

# --- Helper: inject depends_on ---
inject_depends_on() {
    python3 -c "
with open('docker-compose.yml', 'r') as f:
    c = f.read()
if 'depends_on:' not in c:
    needle = 'container_name: ${WEB_CONTAINER_NAME}'
    c = c.replace(needle, needle + '\n    depends_on:\n      db:\n        condition: service_started')
    with open('docker-compose.yml', 'w') as f:
        f.write(c)
" 2>/dev/null || true
}

# --- Helper: check if db service exists ---
db_service_exists() {
    grep -q "^  db:" docker-compose.yml
}

# --- Database Backend Selection ---
DB_PROVIDER_OPT=$(whiptail --title "Database Backend" --menu "Select Database Backend:" 16 75 3 \
"1" "SQLite (Default — Zero Config)" \
"2" "MariaDB (Docker — Integrated)" \
"3" "MySQL/MariaDB (External Host)" 3>&1 1>&2 2>&3)

if [ $? -ne 0 ]; then exit 1; fi

# --- Domain / Site URL ---
DOMAIN=$(whiptail --title "Domain Setup" --inputbox "Enter your Domain Name (e.g. saintsgaming.net):" 10 60 "saintsgaming.net" 3>&1 1>&2 2>&3)
if [ $? -ne 0 ]; then exit 1; fi
SITE_URL="https://$DOMAIN"

# --- Admin Account ---
ADMIN_USER=$(whiptail --title "Admin Account" --inputbox "Enter Admin Username:" 10 60 "Admin" 3>&1 1>&2 2>&3)
if [ $? -ne 0 ]; then exit 1; fi
while true; do
    ADMIN_PASS=$(whiptail --title "Admin Password" --passwordbox "Enter Admin Password (min 6 chars):" 10 60 3>&1 1>&2 2>&3)
    if [ $? -ne 0 ]; then exit 1; fi
    if [ ${#ADMIN_PASS} -lt 6 ]; then
        whiptail --msgbox "Password must be at least 6 characters." 8 40
        continue
    fi
    ADMIN_PASS_CONFIRM=$(whiptail --title "Confirm Password" --passwordbox "Confirm Admin Password:" 10 60 3>&1 1>&2 2>&3)
    if [ "$ADMIN_PASS" = "$ADMIN_PASS_CONFIRM" ]; then
        break
    else
        whiptail --msgbox "Passwords do not match. Please try again." 8 40
    fi
done
ADMIN_EMAIL=$(whiptail --title "Admin Email" --inputbox "Enter Admin Email:" 10 60 "noreply@$DOMAIN" 3>&1 1>&2 2>&3)

# --- Discord Auth (Optional) ---
DISCORD_ID=""
DISCORD_SECRET=""
DISCORD_INVITE=""
if whiptail --title "Discord Integration" --yesno "Do you want to configure Discord Login?" 10 60 3>&1 1>&2 2>&3; then
    while true; do
        DISCORD_ID=$(whiptail --title "Discord Client ID" --inputbox "Enter Discord Client ID:" 10 60 3>&1 1>&2 2>&3)
        if [ $? -ne 0 ]; then break; fi
        DISCORD_SECRET=$(whiptail --title "Discord Client Secret" --passwordbox "Enter Discord Client Secret:" 10 60 3>&1 1>&2 2>&3)
        if [ $? -ne 0 ]; then break; fi

        whiptail --title "Verifying" --infobox "Verifying Discord credentials with Discord API..." 8 50
        DISCORD_CHECK=$(curl -s -X POST https://discord.com/api/v10/oauth2/token \
          -H "Content-Type: application/x-www-form-urlencoded" \
          -d "grant_type=client_credentials" \
          -d "scope=identify" \
          -d "client_id=${DISCORD_ID}" \
          -d "client_secret=${DISCORD_SECRET}")

        if echo "$DISCORD_CHECK" | grep -q "access_token"; then
            whiptail --title "Success" --msgbox "Discord credentials verified successfully!" 8 40
            break
        else
            if whiptail --title "Verification Failed" --yesno "Discord API rejected the credentials.\n\nSelect YES to save anyway, NO to re-enter." 12 60; then
                break
            fi
        fi
    done

    DISCORD_INVITE=$(whiptail --title "Discord Invite" --inputbox "Enter your Discord invite link (leave blank to skip):" 10 60 "https://discord.gg/" 3>&1 1>&2 2>&3)
fi

# --- Build docker-compose.yml from base ---
mkdir -p data uploads
chmod -R 777 data uploads

cp docker-compose.base.yml docker-compose.yml
sed -i "s/- \"3000:3000\"/- \"$WEB_PORT:3000\"/g" docker-compose.yml
sed -i "s/container_name: saints-gaming-web/container_name: ${WEB_CONTAINER_NAME}/g" docker-compose.yml
# Keep image name stable; only container_name must be unique across parallel installs.
if [ "$REVERSE_PROXY_MODE" = "1" ]; then
    sed -i "/- \"80:80\"/d" docker-compose.yml
    sed -i "/- \"443:443\"/d" docker-compose.yml
else
    sed -i "s/- \"80:80\"/- \"$HTTP_PORT:80\"/g" docker-compose.yml
    sed -i "s/- \"443:443\"/- \"$HTTPS_PORT:443\"/g" docker-compose.yml
fi

# --- Generate .env (pure bash, no Node.js required) ---
if [ "$REUSE_ENV" = "1" ] && [ -n "$OLD_AUTH_SECRET" ]; then
    AUTH_SECRET=$OLD_AUTH_SECRET
else
    AUTH_SECRET=$(openssl rand -base64 32)
fi

DB_NAME="SQLite"
DB_PROVIDER="sqlite"
DATABASE_URL="file:./prisma/db/dev.db"

if [ "$DB_PROVIDER_OPT" = "2" ]; then
    DB_NAME="MariaDB (Docker)"
    DB_PROVIDER="mysql"
    if [ "$REUSE_ENV" = "1" ] && [ -n "$OLD_DB_PASS" ]; then
        DB_PASS=$OLD_DB_PASS
    else
        DB_PASS=$(openssl rand -base64 18 | tr -dc 'a-zA-Z0-9' | head -c 16)
    fi
    DATABASE_URL="mysql://saints:${DB_PASS}@db:3306/saints_gaming"

    if ! db_service_exists; then
        cat >> docker-compose.yml <<DCEOF

  db:
    image: mariadb:10.11
    container_name: ${DB_CONTAINER_NAME}
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
DCEOF
        inject_depends_on
    fi

elif [ "$DB_PROVIDER_OPT" = "3" ]; then
    DB_NAME="MySQL (External)"
    DB_PROVIDER="mysql"
    EXT_HOST=$(whiptail --title "External DB Setup" --inputbox "Enter Database Host/IP:" 10 60 "127.0.0.1" 3>&1 1>&2 2>&3)
    EXT_PORT=$(whiptail --title "External DB Setup" --inputbox "Enter Database Port:" 10 60 "3306" 3>&1 1>&2 2>&3)
    EXT_USER=$(whiptail --title "External DB Setup" --inputbox "Enter Database User:" 10 60 "root" 3>&1 1>&2 2>&3)
    EXT_PASS=$(whiptail --title "External DB Setup" --passwordbox "Enter Database Password:" 10 60 3>&1 1>&2 2>&3)
    EXT_DB=$(whiptail --title "External DB Setup" --inputbox "Enter Database Name:" 10 60 "saints_gaming" 3>&1 1>&2 2>&3)
    DATABASE_URL="mysql://${EXT_USER}:${EXT_PASS}@${EXT_HOST}:${EXT_PORT}/${EXT_DB}"
fi

# Write the .env file — pure bash, guaranteed to work on any Linux system
cat > .env <<ENVEOF
NEXT_PUBLIC_SITE_URL=${SITE_URL}
AUTH_TRUST_HOST=true
AUTH_SECRET=${AUTH_SECRET}
DB_PROVIDER=${DB_PROVIDER}
DATABASE_URL=${DATABASE_URL}
AUTH_DISCORD_ID=${DISCORD_ID}
AUTH_DISCORD_SECRET=${DISCORD_SECRET}
NEXT_PUBLIC_DISCORD_INVITE=${DISCORD_INVITE}
ENVEOF

echo -e "${GREEN}[✓] .env file created successfully.${NC}"

# --- Web Server / Proxy Setup ---
USE_CADDY=0
RUN_CERTBOT=0
SSL_CHOICE="None"
ADDITIVE_SUBDOMAIN=""

if [ "$EXISTING_CADDY_ADDITIVE" = "1" ]; then
    SSL_CHOICE="Existing Caddy (subdomain only)"
    echo -e "${YELLOW}[*] Existing Caddy — additive subdomain only (no primary rewrite, no Caddy install)...${NC}"
    chmod +x "$DEV_PROXY_SCRIPT" 2>/dev/null || true
    ADDITIVE_SUBDOMAIN=$(whiptail --title "Subdomain for this install" --inputbox "Enter the subdomain this instance should serve\n(e.g. staging.$DOMAIN or go.$DOMAIN).\n\nPrimary site on Caddy will NOT be changed." 12 70 "staging.$DOMAIN" 3>&1 1>&2 2>&3) || true
    if [ -n "$ADDITIVE_SUBDOMAIN" ]; then
        if [ -x "$DEV_PROXY_SCRIPT" ] || [ -f "$DEV_PROXY_SCRIPT" ]; then
            bash "$DEV_PROXY_SCRIPT" add "$ADDITIVE_SUBDOMAIN" 127.0.0.1 "$WEB_PORT" -y || \
              echo -e "${RED}[!] dev-proxy add failed — run manually: ./scripts/dev-proxy.sh add $ADDITIVE_SUBDOMAIN $WEB_PORT${NC}"
        else
            echo -e "${RED}[!] Missing scripts/dev-proxy.sh — add the subdomain manually later.${NC}"
        fi
    else
        echo -e "${YELLOW}[*] No subdomain entered — app will only be reachable on 127.0.0.1:$WEB_PORT${NC}"
    fi
elif [ "$REVERSE_PROXY_MODE" = "1" ]; then
    SSL_CHOICE="Reverse Proxy (External)"
    echo -e "${YELLOW}[*] Skipping web server installation (Reverse Proxy Mode)...${NC}"
    if command -v caddy &>/dev/null || [ -f /etc/caddy/Caddyfile ]; then
        if whiptail --title "Attach to Existing Caddy?" --yesno "Caddy is present on this host.\n\nAdd a subdomain for this install now? (additive — primary site untouched)" 12 70 3>&1 1>&2 2>&3; then
            EXISTING_CADDY_ADDITIVE=1
            ADDITIVE_SUBDOMAIN=$(whiptail --title "Subdomain" --inputbox "Subdomain (e.g. app.$DOMAIN):" 10 60 "app.$DOMAIN" 3>&1 1>&2 2>&3) || true
            if [ -n "$ADDITIVE_SUBDOMAIN" ]; then
                bash "$DEV_PROXY_SCRIPT" add "$ADDITIVE_SUBDOMAIN" 127.0.0.1 "$WEB_PORT" -y || true
            fi
        fi
    fi
else
    if [ "$IS_NUCLEAR_MODE" = "1" ]; then
        USE_CADDY=1
    elif command -v caddy &>/dev/null || [ -f /etc/caddy/Caddyfile ]; then
        if whiptail --title "Existing Caddy" --yesno "Caddy is already installed.\n\nYES = add this site as a subdomain only (safe rerun)\nNO  = manage Caddy as a fresh primary install (may overwrite Caddyfile)" 13 72 3>&1 1>&2 2>&3; then
            EXISTING_CADDY_ADDITIVE=1
            SSL_CHOICE="Existing Caddy (subdomain only)"
            ADDITIVE_SUBDOMAIN=$(whiptail --title "Subdomain" --inputbox "Subdomain for this install:" 10 60 "$DOMAIN" 3>&1 1>&2 2>&3) || true
            if [ -n "$ADDITIVE_SUBDOMAIN" ]; then
                bash "$DEV_PROXY_SCRIPT" add "$ADDITIVE_SUBDOMAIN" 127.0.0.1 "$WEB_PORT" -y || true
            fi
        fi
    fi

    if [ "$EXISTING_CADDY_ADDITIVE" != "1" ] && [ "$IS_NUCLEAR_MODE" != "1" ]; then
        if command -v nginx &>/dev/null; then
            if whiptail --title "Web Server Upgrade" --yesno "Nginx is currently installed.\n\nWould you like to REMOVE Nginx and install Caddy instead?\n(Caddy handles SSL automatically — no Certbot needed)" 12 70 3>&1 1>&2 2>&3; then
                echo -e "${RED}[!] Stopping and purging Nginx...${NC}"
                sudo systemctl stop nginx || true
                sudo apt-get purge -y nginx nginx-common
                sudo apt-get autoremove -y
                USE_CADDY=1
            fi
        else
            if whiptail --title "Web Server Selection" --yesno "Would you like to install Caddy? (Recommended — automatic SSL)\n\nIf NO, Nginx will be installed instead." 12 70 3>&1 1>&2 2>&3; then
                USE_CADDY=1
            fi
        fi
    fi

    if [ "$USE_CADDY" = "1" ]; then
        if ! command -v caddy &>/dev/null; then
            echo -e "${CYAN}[*] Installing Caddy...${NC}"
            sudo apt update
            sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
            curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
            curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
            sudo apt update && sudo apt install -y caddy
        fi
        SSL_CHOICE="Caddy (Automatic HTTPS)"
        # Fresh primary site + empty managed proxy section for future dev-proxy adds.
        cat <<CADDYEOF | sudo tee /etc/caddy/Caddyfile
$DOMAIN, www.$DOMAIN {
    reverse_proxy 127.0.0.1:$WEB_PORT
}

# SAINTS_PROXY_LIST_BEGIN
# SAINTS_PROXY_LIST_END
CADDYEOF
        sudo systemctl unmask caddy 2>/dev/null || true
        sudo systemctl enable caddy 2>/dev/null || true
        sudo systemctl restart caddy || sudo systemctl start caddy || true
    else
        if ! command -v nginx &>/dev/null || ! command -v certbot &>/dev/null; then
            echo -e "${YELLOW}[*] Installing Nginx and Certbot...${NC}"
            sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
        fi
        if whiptail --title "Networking" --yesno "Are you proxying through Cloudflare (Orange Cloud on DNS)?\n\nIf YES, Certbot will NOT be run (Cloudflare handles SSL)." 12 70 3>&1 1>&2 2>&3; then
            SSL_CHOICE="Nginx (Cloudflare)"
        else
            SSL_CHOICE="Nginx (Let's Encrypt / Certbot)"
        fi
        if [ -f "/etc/nginx/sites-available/$DOMAIN" ] && grep -q "ssl_certificate" "/etc/nginx/sites-available/$DOMAIN"; then
            echo -e "${YELLOW}[*] Preserving existing SSL Nginx config for $DOMAIN...${NC}"
        else
            cat <<NGINXEOF | sudo tee /etc/nginx/sites-available/$DOMAIN
server {
    listen $HTTP_PORT;
    server_name $DOMAIN www.$DOMAIN;
    location / {
        proxy_pass http://127.0.0.1:$WEB_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINXEOF
        fi
        sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
        sudo systemctl reload nginx || sudo systemctl restart nginx
        if [ "$SSL_CHOICE" = "Nginx (Let's Encrypt / Certbot)" ] && [ "$HTTP_PORT" = "80" ]; then
            RUN_CERTBOT=1
        fi
    fi
fi

# --- Subdomain Proxies (Additive via dev-proxy when Caddy / Nginx) ---
EXTRA_SUBDOMAINS=()
if [ "$EXISTING_CADDY_ADDITIVE" = "1" ] || [ "$USE_CADDY" = "1" ] || [ "$REVERSE_PROXY_MODE" = "1" ] || command -v caddy &>/dev/null || [ -f /etc/caddy/Caddyfile ]; then
    while whiptail --title "Subdomain Setup" --yesno "Do you have any subdomains you want to add or reverse proxy on this server?\n\n(Examples: mmo.$DOMAIN, dev.$DOMAIN, panel.$DOMAIN, bot.$DOMAIN)\n\nYES = Add a subdomain proxy\nNO  = Continue setup" 14 74 3>&1 1>&2 2>&3; do
        SUBDOMAIN=$(whiptail --title "Subdomain" --inputbox "Enter the full subdomain (e.g. mmo.$DOMAIN):" 10 60 "mmo.$DOMAIN" 3>&1 1>&2 2>&3)
        if [ $? -ne 0 ] || [ -z "$SUBDOMAIN" ]; then break; fi
        PROXY_PORT=$(whiptail --title "Local Port" --inputbox "Enter the internal port this subdomain forwards to:" 10 60 "3001" 3>&1 1>&2 2>&3)
        if [ $? -ne 0 ] || [ -z "$PROXY_PORT" ]; then break; fi
        PROXY_IP=$(whiptail --title "Target IP" --inputbox "Enter the internal target IP:" 10 60 "127.0.0.1" 3>&1 1>&2 2>&3)
        if [ $? -ne 0 ] || [ -z "$PROXY_IP" ]; then break; fi

        if [ -f "$DEV_PROXY_SCRIPT" ] && { [ "$USE_CADDY" = "1" ] || [ "$EXISTING_CADDY_ADDITIVE" = "1" ] || command -v caddy &>/dev/null || [ -f /etc/caddy/Caddyfile ]; }; then
            bash "$DEV_PROXY_SCRIPT" add "$SUBDOMAIN" "$PROXY_IP" "$PROXY_PORT" -y || true
        else
            cat <<NGINXEOF | sudo tee /etc/nginx/sites-available/$SUBDOMAIN
server {
    listen ${HTTP_PORT:-80};
    server_name $SUBDOMAIN;
    location / {
        proxy_pass http://$PROXY_IP:$PROXY_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINXEOF
            sudo ln -sf /etc/nginx/sites-available/$SUBDOMAIN /etc/nginx/sites-enabled/
            sudo systemctl reload nginx || sudo systemctl restart nginx
        fi
        EXTRA_SUBDOMAINS+=("$SUBDOMAIN")
        whiptail --title "Subdomain Added" --msgbox "Subdomain $SUBDOMAIN -> $PROXY_IP:$PROXY_PORT has been configured!" 8 65
    done
fi

# --- Go MMO (destination realtime for lobby / Studio) ---
# Next keeps site APIs + /api/maps; game sockets move to Go when enabled.
ENABLE_GO_MMO=1
GO_MMO_PORT=3001
GO_MMO_PUBLIC_URL=""
GO_MMO_SUBDOMAIN_CHOSEN=""
GO_MMO_SETUP_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../the-lobby/scripts/setup-the-lobby.sh"
# Resolve in case setup.sh lives at repo root as ./setup.sh symlink/copy
if [ ! -f "$GO_MMO_SETUP_SCRIPT" ]; then
    GO_MMO_SETUP_SCRIPT="$(pwd)/the-lobby/scripts/setup-the-lobby.sh"
fi
if [ ! -f "$GO_MMO_SETUP_SCRIPT" ]; then
    GO_MMO_SETUP_SCRIPT="$(pwd)/the-lobby/scripts/setup-go-mmo.sh"
fi
if [ ! -f "$GO_MMO_SETUP_SCRIPT" ]; then
    GO_MMO_SETUP_SCRIPT="$(pwd)/go-mmo/scripts/setup-go-mmo.sh"
fi

if [ "$IS_NUCLEAR_MODE" != "1" ]; then
    if ! whiptail --title "Go MMO Backend" --yesno "Enable Go MMO for lobby + Studio game sockets?\n\nREQUIRED — this is the sole supported backend for game/Studio realtime.\nNext keeps the site, auth, and /api/maps (Prisma).\n\nYES = Go on :3001 + NEXT_PUBLIC_GO_MMO_URL\nNO  = Emergency TS fallback only" 16 74; then
        ENABLE_GO_MMO=0
    fi
fi

if [ "$ENABLE_GO_MMO" = "1" ]; then
    while ss -tuln 2>/dev/null | grep -q ":$GO_MMO_PORT "; do
        GO_MMO_PORT=$((GO_MMO_PORT + 1))
    done
    GO_MMO_PUBLIC_URL="http://127.0.0.1:$GO_MMO_PORT"

    if [ "$USE_CADDY" = "1" ] || [ "$EXISTING_CADDY_ADDITIVE" = "1" ] || command -v caddy &>/dev/null || [ -f /etc/caddy/Caddyfile ]; then
        if whiptail --title "Go MMO Subdomain" --yesno "Add a Caddy subdomain for Go MMO?\n(additive — primary site untouched)\n\nNeeded so browsers can reach sockets over HTTPS (127.0.0.1 only works on this machine)." 13 72; then
            GO_MMO_SUBDOMAIN_CHOSEN=$(whiptail --title "Go MMO Subdomain" --inputbox "Subdomain for Go MMO sockets:" 10 60 "go.$DOMAIN" 3>&1 1>&2 2>&3) || true
            if [ -n "$GO_MMO_SUBDOMAIN_CHOSEN" ]; then
                GO_MMO_PUBLIC_URL="https://$GO_MMO_SUBDOMAIN_CHOSEN"
            fi
        fi
    else
        CUSTOM_GO_URL=$(whiptail --title "Go MMO Public URL" --inputbox "No Caddy detected.\nEnter the browser-reachable Go URL (or keep local for same-machine only):" 12 70 "$GO_MMO_PUBLIC_URL" 3>&1 1>&2 2>&3) || true
        if [ -n "$CUSTOM_GO_URL" ]; then
            GO_MMO_PUBLIC_URL="$CUSTOM_GO_URL"
        fi
    fi

    # Bake into .env before docker build so Next inlines NEXT_PUBLIC_GO_MMO_URL.
    if [ -f .env ]; then
        if grep -q '^NEXT_PUBLIC_GO_MMO_URL=' .env 2>/dev/null; then
            TMP_ENV="$(mktemp)"
            awk -v v="$GO_MMO_PUBLIC_URL" 'BEGIN{done=0} /^NEXT_PUBLIC_GO_MMO_URL=/ { print "NEXT_PUBLIC_GO_MMO_URL=" v; done=1; next } { print } END { if (!done) print "NEXT_PUBLIC_GO_MMO_URL=" v }' .env > "$TMP_ENV"
            mv "$TMP_ENV" .env
        else
            printf '\n# Go MMO lobby/Studio sockets (destination realtime backend)\nNEXT_PUBLIC_GO_MMO_URL=%s\n' "$GO_MMO_PUBLIC_URL" >> .env
        fi
        echo -e "${GREEN}[✓] NEXT_PUBLIC_GO_MMO_URL=$GO_MMO_PUBLIC_URL${NC}"
    fi

    if [ -f "$GO_MMO_SETUP_SCRIPT" ]; then
        echo -e "${CYAN}[*] Setting up Go MMO (full stack beside Next)...${NC}"
        chmod +x "$GO_MMO_SETUP_SCRIPT" 2>/dev/null || true
        export GO_MMO_PORT
        if [ -n "$GO_MMO_SUBDOMAIN_CHOSEN" ]; then
            export GO_MMO_SUBDOMAIN="$GO_MMO_SUBDOMAIN_CHOSEN"
        fi
        # --full: do not fall back to proxy-only just because Caddy already exists
        if GO_MMO_PORT="$GO_MMO_PORT" GO_MMO_SUBDOMAIN="${GO_MMO_SUBDOMAIN_CHOSEN}" \
            bash "$GO_MMO_SETUP_SCRIPT" --non-interactive --docker --full; then
            echo -e "${GREEN}[✓] Go MMO setup finished (port $GO_MMO_PORT).${NC}"
        else
            echo -e "${YELLOW}[!] Go MMO setup reported errors — Next will still build. Retry: ./the-lobby/scripts/setup-the-lobby.sh --full${NC}"
        fi
    else
        echo -e "${YELLOW}[!] Missing $GO_MMO_SETUP_SCRIPT — URL written; run Go setup manually later.${NC}"
    fi
else
    echo -e "${YELLOW}[*] Skipping Go MMO — lobby/Studio will use TypeScript server.ts sockets.${NC}"
fi

# --- Deployment Summary ---
GO_SUMMARY="skipped (TS sockets)"
if [ "$ENABLE_GO_MMO" = "1" ]; then
    GO_SUMMARY="$GO_MMO_PUBLIC_URL (port $GO_MMO_PORT)"
fi
whiptail --title "Deployment Summary" --msgbox "======================================
  Deployment Summary
======================================
Database    : $DB_NAME
Domain      : $DOMAIN
SSL Option  : $SSL_CHOICE
Admin User  : $ADMIN_USER
Go MMO      : $GO_SUMMARY
======================================

Press OK to build and deploy." 18 60

clear

echo -e "${PURPLE}${BOLD}========================================${NC}"
echo -e "${CYAN}${BOLD}  Starting Cluster Build...${NC}"
echo -e "${PURPLE}${BOLD}========================================${NC}"

# Remove only THIS install's containers (unique names) — never clobber a sibling stack.
docker rm -f "$WEB_CONTAINER_NAME" "$DB_CONTAINER_NAME" >/dev/null 2>&1 || true

# Build
docker compose build --no-cache > docker_build.log 2>&1 && docker compose up -d >> docker_build.log 2>&1 &
BUILD_PID=$!

echo -e "${YELLOW}Building containers... You can view docker_build.log for live output.${NC}"
spinner $BUILD_PID
wait $BUILD_PID

if [ $? -ne 0 ]; then
    echo -e "\n${RED}[!] Build failed! Please check docker_build.log for details.${NC}"
    exit 1
fi
echo -e "\n${GREEN}[✓] Containers are up and running!${NC}"

# --- MariaDB Readiness Check ---
if [ "$DB_PROVIDER_OPT" = "2" ]; then
    echo -e "\n${CYAN}[*] Waiting for MariaDB to become ready...${NC}"
    DB_READY=0
    for i in $(seq 1 30); do
        docker compose exec -T db mysqladmin ping -h localhost -uroot -p"${DB_PASS}" >/dev/null 2>&1 && DB_READY=1 && break
        printf "."
        sleep 2
    done
    echo ""
    if [ $DB_READY -eq 1 ]; then
        echo -e "${GREEN}[✓] MariaDB is ready.${NC}"
    else
        echo -e "${RED}[!] MariaDB did not become ready in time. Migrations may fail.${NC}"
        echo -e "${YELLOW}    Check: docker logs ${DB_CONTAINER_NAME}${NC}"
    fi
fi

# --- Wait for Web Server & Create Admin ---
echo -e "\n${CYAN}[*] Waiting for the web server to become healthy...${NC}"
MAX_RETRIES=40
RETRY_COUNT=0
SERVER_READY=0
SECRET_VAL=$(grep "^AUTH_SECRET=" .env | cut -d'=' -f2-)

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:$WEB_PORT/api/dev/setup-admin \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $SECRET_VAL" \
      -d "{}")
    if [ "$HTTP_STATUS" == "200" ] || [ "$HTTP_STATUS" == "400" ]; then
        SERVER_READY=1
        break
    fi
    printf "."
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT+1))
done
echo ""

if [ $SERVER_READY -eq 1 ]; then
    curl -s -X POST http://localhost:$WEB_PORT/api/dev/setup-admin \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $SECRET_VAL" \
      -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\",\"email\":\"$ADMIN_EMAIL\"}" >/dev/null

    if [ "$RUN_CERTBOT" = "1" ]; then
        echo -e "\n${CYAN}[*] Running Certbot for SSL...${NC}"
        sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m "$ADMIN_EMAIL" || echo -e "${YELLOW}[!] Certbot issue. Run manually: sudo certbot --nginx${NC}"
        for SUB in "${EXTRA_SUBDOMAINS[@]}"; do
            sudo certbot --nginx -d $SUB --non-interactive --agree-tos -m "$ADMIN_EMAIL" || true
        done
    fi

    echo -e "\n${CYAN}[*] Syncing local game assets to database...${NC}"
    docker exec $WEB_CONTAINER_NAME npm run sync:assets 2>/dev/null || true
    echo -e "${GREEN}[✓] Assets synced.${NC}\n"

    # Ensure MySQL data is owned by 999 (the mysql user id in container)
    sudo chown -R 999:999 mysql_data 2>/dev/null || true

    clear
    echo -e "${PURPLE}${BOLD}"
    echo "  ___   _   ___ _  _ _____ ___    ___   _   __  __ ___ _  _  ___ "
    echo " / __| /_\ |_ _| \| |_   _/ __|  / __| /_\ |  \/  |_ _| \| |/ __|"
    echo " \__ \/ _ \ | || .  | | | \__ \  | (_ |/ _ \| |\/| || || .  | (_ |"
    echo " |___/_/ \_\___|_|\_| |_| |___/  \___/_/ \_\_|  |_|___|_|\_|\___| "
    echo -e "${NC}"
    echo -e "${GREEN}${BOLD}Setup Complete!${NC}\n"
    echo -e "============================================================"
    echo -e "${CYAN}URL:${NC}            ${SITE_URL}"
    echo -e "${CYAN}Admin User:${NC}     ${ADMIN_USER}"
    echo -e "${CYAN}Admin Pass:${NC}     (Hidden for security)"
    if [ "$ENABLE_GO_MMO" = "1" ]; then
        echo -e "${CYAN}Go MMO:${NC}         ${GO_MMO_PUBLIC_URL}"
        echo -e "${CYAN}Go port:${NC}        ${GO_MMO_PORT} (lobby/Studio sockets)"
    fi
    echo -e "============================================================"
    echo -e "${YELLOW}Useful Commands:${NC}"
    echo -e "  View Logs:      docker logs ${WEB_CONTAINER_NAME} -f"
    echo -e "  Stop Cluster:   docker compose down"
    echo -e "  Restart:        docker compose restart"
    echo -e "  Update:         ./update.sh"
    if [ "$ENABLE_GO_MMO" = "1" ]; then
        echo -e "  The Lobby setup:    ./the-lobby/scripts/setup-the-lobby.sh --full"
        echo -e "  Dev proxy:          ./scripts/dev-proxy.sh status"
    fi
    echo -e "============================================================\n"
else
    echo -e "${RED}[!] Server took too long to start. It may still be running migrations.${NC}"
    echo -e "${YELLOW}    Check: docker logs ${WEB_CONTAINER_NAME}${NC}"
fi
