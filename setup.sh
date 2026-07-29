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

# --- Data Loss Prevention: MySQL Volume Check ---
if [ -d "./mysql_data" ] && [ "$(ls -A ./mysql_data 2>/dev/null)" ]; then
    echo -e "${RED}${BOLD}[!] WARNING: Existing Database Volume Detected!${NC}"
    echo -e "${YELLOW}    The directory ./mysql_data contains data. If you proceed with a fresh setup,${NC}"
    echo -e "${YELLOW}    new passwords will be generated, which may cause a credential mismatch with${NC}"
    echo -e "${YELLOW}    your existing database, locking you out of your data!${NC}"
    if whiptail --title "Data Loss Warning!" --yesno "An existing database volume (mysql_data) was found.\n\nAre you absolutely sure you want to run setup? This may lock you out of your existing data.\n\n(Select NO to abort, or YES if you are wiping everything)" 12 70; then
        if whiptail --title "Wipe Database?" --yesno "Would you like to DELETE the existing database volume to start completely fresh?\n\nWARNING: THIS CANNOT BE UNDONE!" 10 60; then
            echo -e "${RED}[*] Wiping existing database volume...${NC}"
            sudo rm -rf ./mysql_data
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
        if [ -d "./mysql_data" ] && [ "$(ls -A ./mysql_data 2>/dev/null)" ]; then
            if whiptail --title "Preserve Credentials" --yesno "Would you like to KEEP the existing database credentials from the current .env file?\n(Highly recommended if you didn't wipe mysql_data)" 10 65; then
                REUSE_ENV=1
                OLD_DB_PASS=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
                OLD_AUTH_SECRET=$(grep "^AUTH_SECRET=" .env | cut -d'=' -f2-)
            fi
        fi
    else
        exit 0
    fi
fi

# --- Port Auto-Discovery ---
HTTP_PORT=80
HTTPS_PORT=443
WEB_PORT=3000
REVERSE_PROXY_MODE=0
CONFLICTS=""

if ss -tuln | grep -q ":80 "; then CONFLICTS="$CONFLICTS Port 80\n"; fi
if ss -tuln | grep -q ":443 "; then CONFLICTS="$CONFLICTS Port 443\n"; fi
if ss -tuln | grep -q ":3000 "; then CONFLICTS="$CONFLICTS Port 3000\n"; fi

if [ -n "$CONFLICTS" ]; then
    PORT_OPT=$(whiptail --title "Port Conflicts Detected" --menu "The following ports are already in use:\n$CONFLICTS\nHow do you want to resolve this?" 16 75 3 \
    "1" "Aggressively KILL conflicting services (Frees ports)" \
    "2" "Behind a Reverse Proxy Mode (Skips 80/443)" \
    "3" "Use alternative ports" 3>&1 1>&2 2>&3)

    if [ "$PORT_OPT" = "1" ]; then
        echo -e "${CYAN}Killing processes on conflicting ports...${NC}"
        sudo apt-get update && sudo apt-get install -y psmisc
        sudo fuser -k 80/tcp 443/tcp 3000/tcp || true
        sleep 2
    elif [ "$PORT_OPT" = "2" ]; then
        REVERSE_PROXY_MODE=1
        HTTP_PORT=""
        HTTPS_PORT=""
        while ss -tuln | grep -q ":$WEB_PORT "; do WEB_PORT=$((WEB_PORT+1)); done
        whiptail --title "Reverse Proxy Mode" --msgbox "Reverse Proxy Mode Enabled.\n\nThe internal web server will be exposed on port: $WEB_PORT\n\nYou MUST configure your Reverse Proxy (e.g., Nginx Proxy Manager) to point your domain to http://127.0.0.1:$WEB_PORT" 12 65
    elif [ "$PORT_OPT" = "3" ]; then
        while ss -tuln | grep -q ":$HTTP_PORT "; do HTTP_PORT=$((HTTP_PORT+1)); done
        while ss -tuln | grep -q ":$HTTPS_PORT "; do HTTPS_PORT=$((HTTPS_PORT+1)); done
        while ss -tuln | grep -q ":$WEB_PORT "; do WEB_PORT=$((WEB_PORT+1)); done
        whiptail --title "New Ports Selected" --msgbox "Selected new available ports:\n\nHTTP: $HTTP_PORT\nHTTPS: $HTTPS_PORT\nWeb App: $WEB_PORT" 12 50
    else
        exit 1
    fi
fi

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
    c = c.replace('container_name: saints-gaming-web', 'container_name: saints-gaming-web\n    depends_on:\n      db:\n        condition: service_started')
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
          -d "grant_type=client_credentials" \
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

if [ "$REVERSE_PROXY_MODE" = "1" ]; then
    SSL_CHOICE="Reverse Proxy (External)"
    echo -e "${YELLOW}[*] Skipping web server installation (Reverse Proxy Mode)...${NC}"
else
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
        cat <<CADDYEOF | sudo tee /etc/caddy/Caddyfile
$DOMAIN, www.$DOMAIN {
    reverse_proxy 127.0.0.1:$WEB_PORT
}
CADDYEOF
        sudo systemctl reload caddy || sudo systemctl restart caddy
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

# --- Additional Subdomain Proxies ---
EXTRA_SUBDOMAINS=()
if [ "$REVERSE_PROXY_MODE" != "1" ]; then
    while whiptail --title "Additional Subdomain Proxy" --yesno "Would you like to add a subdomain proxy for another service?\n(e.g., panel.$DOMAIN for AMP/Pterodactyl)" 12 70 3>&1 1>&2 2>&3; do
        SUBDOMAIN=$(whiptail --title "Subdomain" --inputbox "Enter the full subdomain (e.g. panel.$DOMAIN):" 10 60 "panel.$DOMAIN" 3>&1 1>&2 2>&3)
        if [ $? -ne 0 ] || [ -z "$SUBDOMAIN" ]; then break; fi
        PROXY_PORT=$(whiptail --title "Local Port" --inputbox "Enter the local port this service runs on:" 10 60 "8080" 3>&1 1>&2 2>&3)
        if [ $? -ne 0 ] || [ -z "$PROXY_PORT" ]; then break; fi
        PROXY_IP=$(whiptail --title "Target IP" --inputbox "Enter the internal target IP:" 10 60 "127.0.0.1" 3>&1 1>&2 2>&3)
        if [ $? -ne 0 ] || [ -z "$PROXY_IP" ]; then break; fi

        if [ "$USE_CADDY" = "1" ]; then
            cat <<CADDYEOF | sudo tee -a /etc/caddy/Caddyfile

$SUBDOMAIN {
    reverse_proxy $PROXY_IP:$PROXY_PORT
}
CADDYEOF
            sudo systemctl reload caddy || sudo systemctl restart caddy
        else
            cat <<NGINXEOF | sudo tee /etc/nginx/sites-available/$SUBDOMAIN
server {
    listen $HTTP_PORT;
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
        whiptail --title "Success" --msgbox "Subdomain $SUBDOMAIN -> $PROXY_IP:$PROXY_PORT configured!" 8 60
    done
fi

# --- Deployment Summary ---
whiptail --title "Deployment Summary" --msgbox "======================================
  Deployment Summary
======================================
Database    : $DB_NAME
Domain      : $DOMAIN
SSL Option  : $SSL_CHOICE
Admin User  : $ADMIN_USER
======================================

Press OK to build and deploy." 16 60

clear

echo -e "${PURPLE}${BOLD}========================================${NC}"
echo -e "${CYAN}${BOLD}  Starting Cluster Build...${NC}"
echo -e "${PURPLE}${BOLD}========================================${NC}"

# Remove any leftover containers from failed installs
sudo docker rm -f saints-gaming-web saints-gaming-db >/dev/null 2>&1 || true

# Build
sudo docker compose build --no-cache > docker_build.log 2>&1 && sudo docker compose up -d >> docker_build.log 2>&1 &
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
        sudo docker compose exec -T db mysqladmin ping -h localhost -uroot -p"${DB_PASS}" >/dev/null 2>&1 && DB_READY=1 && break
        printf "."
        sleep 2
    done
    echo ""
    if [ $DB_READY -eq 1 ]; then
        echo -e "${GREEN}[✓] MariaDB is ready.${NC}"
    else
        echo -e "${RED}[!] MariaDB did not become ready in time. Migrations may fail.${NC}"
        echo -e "${YELLOW}    Check: sudo docker logs saints-gaming-db${NC}"
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
    echo -e "============================================================"
    echo -e "${YELLOW}Useful Commands:${NC}"
    echo -e "  View Logs:      sudo docker logs saints-gaming-web -f"
    echo -e "  Stop Cluster:   sudo docker compose down"
    echo -e "  Restart:        sudo docker compose restart"
    echo -e "  Update:         ./update.sh"
    echo -e "============================================================\n"
else
    echo -e "${RED}[!] Server took too long to start. It may still be running migrations.${NC}"
    echo -e "${YELLOW}    Check: sudo docker logs saints-gaming-web${NC}"
fi
