#!/bin/bash
# Universal Smart Setup Script for Ubuntu/Debian/Linux

# --- Colors & Styling ---
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

trap ctrl_c INT
function ctrl_c() {
    echo -e "\n${RED}[!] Setup interrupted!${NC}"
    if whiptail --title "Interrupt Detected" --yesno "Do you want to cancel the deployment? (Y/N)" 10 50; then
        echo -e "${YELLOW}Canceling setup...${NC}"
        exit 1
    fi
}

spinner() {
    local pid=$1
    local delay=0.15
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        # Grab the last line of the build log and truncate it so it doesn't wrap the terminal
        local last_log=$(tail -n 1 docker_build.log 2>/dev/null | tr -d '\n' | tr -d '\r' | cut -c1-70)
        printf "\r [%c]  %-70s" "$spinstr" "$last_log"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
    done
    printf "\r                                                                                 \r"
}

if [ "$EUID" -ne 0 ] && ! command -v sudo &> /dev/null; then
    echo -e "${RED}[!] Error: This script requires root privileges or sudo.${NC}"
    exit 1
fi

if ! command -v whiptail &> /dev/null || ! command -v curl &> /dev/null || ! command -v openssl &> /dev/null; then
    sudo apt-get update && sudo apt-get install -y whiptail net-tools curl openssl
fi

# Fix File Permissions
if [ -n "$SUDO_USER" ]; then
    REAL_USER="$SUDO_USER"
else
    REAL_USER="$USER"
fi
echo -e "${CYAN}Fixing file ownership and permissions for $REAL_USER...${NC}"
sudo chown -R "$REAL_USER:$REAL_USER" .
chmod +x *.sh *.bat 2>/dev/null || true

# Port Auto-Discovery
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
        whiptail --title "Reverse Proxy Mode" --msgbox "Reverse Proxy Mode Enabled.\n\nThe internal web server will be exposed on port: $WEB_PORT\n\nYou MUST configure your Reverse Proxy (e.g., Nginx Proxy Manager, Pterodactyl) to point your domain to http://127.0.0.1:$WEB_PORT" 12 60
    elif [ "$PORT_OPT" = "3" ]; then
        while ss -tuln | grep -q ":$HTTP_PORT "; do HTTP_PORT=$((HTTP_PORT+1)); done
        while ss -tuln | grep -q ":$HTTPS_PORT "; do HTTPS_PORT=$((HTTPS_PORT+1)); done
        while ss -tuln | grep -q ":$WEB_PORT "; do WEB_PORT=$((WEB_PORT+1)); done
        whiptail --title "New Ports Selected" --msgbox "Selected new available ports:\n\nHTTP: $HTTP_PORT\nHTTPS: $HTTPS_PORT\nWeb App: $WEB_PORT" 12 50
    else
        exit 1
    fi
fi

if [ -f /proc/meminfo ]; then
    TOTAL_MEM=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
    if [ "$TOTAL_MEM" -lt 1500000 ]; then
        if ! whiptail --title "System Warning" --yesno "Your system has less than 1.5GB of RAM. The Next.js compilation may crash.\n\nContinue anyway?" 10 60; then exit 1; fi
    fi
fi

if ! command -v docker &> /dev/null; then
    whiptail --title "Docker Check" --infobox "Installing Docker..." 8 40
    sudo apt update && sudo apt install -y docker.io docker-compose
    sudo usermod -aG docker $USER
fi



# Smart State Detection
if [ -f .env ]; then
    UPDATE_OPT=$(whiptail --title "Existing Installation Detected" --menu "How would you like to proceed?" 16 75 4 \
    "1" "Safe Update (Preserve Data & SSL)" \
    "2" "Clean Reinstall (Preserve Database & SSL)" \
    "3" "Nuclear Wipe (Destructive)" \
    "4" "Repair Nginx & SSL Certificates" 3>&1 1>&2 2>&3)
    
    if [ $? -ne 0 ]; then exit 0; fi
    
    if [ "$UPDATE_OPT" = "1" ]; then
        echo -e "${CYAN}Rebuilding Web Container...${NC}"
        SITE_URL=$(grep '^NEXT_PUBLIC_SITE_URL=' .env | sed -n 's/.*\(http[s]*:\/\/[^"]*\).*/\1/p' || true)
        if [ -z "$SITE_URL" ]; then SITE_URL="http://localhost:$WEB_PORT"; fi
        node scripts/setup-env.mjs NEXT_PUBLIC_SITE_URL="$SITE_URL"
        cp docker-compose.base.yml docker-compose.yml
        sed -i "s/- \"3000:3000\"/- \"$WEB_PORT:3000\"/g" docker-compose.yml

        if [ "$REVERSE_PROXY_MODE" = "1" ]; then
            sed -i "/- \"80:80\"/d" docker-compose.yml
            sed -i "/- \"443:443\"/d" docker-compose.yml
        else
            sed -i "s/- \"80:80\"/- \"$HTTP_PORT:80\"/g" docker-compose.yml
            sed -i "s/- \"443:443\"/- \"$HTTPS_PORT:443\"/g" docker-compose.yml
        fi

        # Restore DB block if using integrated MariaDB
        if grep -q "DATABASE_URL=.*@db:3306" .env; then
            echo -e "${CYAN}Restoring Integrated Database Configuration...${NC}"
            DB_PASS=$(grep '^MARIADB_PASSWORD=' .env | cut -d'=' -f2 || openssl rand -hex 12)
            DB_ROOT_PASS=$(grep '^MARIADB_ROOT_PASSWORD=' .env | cut -d'=' -f2 || openssl rand -hex 12)
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
            if ! grep -q "depends_on:" docker-compose.yml; then
                sed -i '/container_name: saints-gaming-web/a \    depends_on:\n      db:\n        condition: service_healthy' docker-compose.yml
            fi
        fi

        sudo docker compose build --no-cache web
        sudo docker compose up -d web
        if command -v systemctl &> /dev/null; then
            echo -e "${CYAN}Reloading web proxies if present...${NC}"
            sudo systemctl reload caddy 2>/dev/null || sudo systemctl restart caddy 2>/dev/null || true
            sudo systemctl reload nginx 2>/dev/null || sudo systemctl restart nginx 2>/dev/null || true
        fi
        echo -e "${GREEN}[✓] Safe Update Complete!${NC}"
        exit 0
    elif [ "$UPDATE_OPT" = "2" ]; then
        echo -e "${YELLOW}Performing clean reinstall...${NC}"
        sudo docker compose down
        SITE_URL=$(grep '^NEXT_PUBLIC_SITE_URL=' .env | sed -n 's/.*\(http[s]*:\/\/[^"]*\).*/\1/p' || true)
        if [ -z "$SITE_URL" ]; then SITE_URL="http://localhost:$WEB_PORT"; fi
        node scripts/setup-env.mjs NEXT_PUBLIC_SITE_URL="$SITE_URL"
        cp docker-compose.base.yml docker-compose.yml
        sed -i "s/- \"3000:3000\"/- \"$WEB_PORT:3000\"/g" docker-compose.yml

        if [ "$REVERSE_PROXY_MODE" = "1" ]; then
            sed -i "/- \"80:80\"/d" docker-compose.yml
            sed -i "/- \"443:443\"/d" docker-compose.yml
        else
            sed -i "s/- \"80:80\"/- \"$HTTP_PORT:80\"/g" docker-compose.yml
            sed -i "s/- \"443:443\"/- \"$HTTPS_PORT:443\"/g" docker-compose.yml
        fi

        # Restore DB block if using integrated MariaDB
        if grep -q "DATABASE_URL=.*@db:3306" .env; then
            echo -e "${CYAN}Restoring Integrated Database Configuration...${NC}"
            DB_PASS=$(grep '^MARIADB_PASSWORD=' .env | cut -d'=' -f2 || openssl rand -hex 12)
            DB_ROOT_PASS=$(grep '^MARIADB_ROOT_PASSWORD=' .env | cut -d'=' -f2 || openssl rand -hex 12)
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
            if ! grep -q "depends_on:" docker-compose.yml; then
                sed -i '/container_name: saints-gaming-web/a \    depends_on:\n      db:\n        condition: service_healthy' docker-compose.yml
            fi
        fi

        sudo docker compose build --no-cache
        sudo docker compose up -d
        echo -e "${GREEN}[✓] Clean Reinstall Complete!${NC}"
        exit 0
    elif [ "$UPDATE_OPT" = "3" ]; then
        if whiptail --title "NUCLEAR WIPE" --yesno "WARNING: This deletes ALL containers, databases, SSL certificates, and environment settings!\nAre you sure?" 10 60; then
            sudo docker compose down -v
            sudo rm -rf mysql_data data ollama_data uploads .env node_modules .next
            cp docker-compose.base.yml docker-compose.yml
            
            if [ -d /etc/nginx/sites-available ]; then
                if whiptail --title "Nginx Configs" --yesno "Would you also like to delete any generated Nginx configurations for your domains?" 10 60; then
                    NGINX_FILES=$(ls /etc/nginx/sites-available/ | grep -v 'default' || true)
                    if [ -n "$NGINX_FILES" ]; then
                        CHECKLIST_ARGS=()
                        for f in $NGINX_FILES; do
                            CHECKLIST_ARGS+=("$f" "" "OFF")
                        done
                        SELECTED_CONFIGS=$(whiptail --title "Select Nginx Configs to Delete" --checklist "Select any Nginx configurations you want to DELETE. (Space to select, Enter to confirm)" 20 60 10 "${CHECKLIST_ARGS[@]}" 3>&1 1>&2 2>&3)
                        if [ -n "$SELECTED_CONFIGS" ]; then
                            for f in $SELECTED_CONFIGS; do
                                f=$(echo $f | tr -d '"')
                                sudo rm -f "/etc/nginx/sites-available/$f" "/etc/nginx/sites-enabled/$f"
                            done
                            sudo systemctl reload nginx || sudo systemctl restart nginx
                            whiptail --msgbox "Selected Nginx configurations deleted." 8 50
                        fi
                    fi
                fi
            fi
        else
            exit 0
        fi
    elif [ "$UPDATE_OPT" = "4" ]; then
        echo -e "${CYAN}Repairing Nginx Proxy & SSL Configuration...${NC}"
        
        SITE_URL=$(grep '^NEXT_PUBLIC_SITE_URL=' .env | cut -d'"' -f2 || true)
        if [ -z "$SITE_URL" ]; then 
            DOMAIN=$(whiptail --title "Domain Setup" --inputbox "Could not detect domain from .env.\nEnter your Domain Name:" 10 60 "saintsgaming.net" 3>&1 1>&2 2>&3)
        else
            DOMAIN=$(echo "$SITE_URL" | sed -e 's|^[^/]*//||' -e 's|/.*$||')
        fi
        
        if [ -z "$DOMAIN" ]; then
            echo -e "${RED}[!] Repair canceled. Invalid domain.${NC}"
            exit 1
        fi
        
        ADMIN_EMAIL="noreply@$DOMAIN"
        
        echo -e "${YELLOW}[*] Writing clean Nginx proxy configuration for $DOMAIN...${NC}"
        cat <<EOF | sudo tee /etc/nginx/sites-available/$DOMAIN
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
EOF
        sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
        sudo systemctl reload nginx || sudo systemctl restart nginx
        
        echo -e "${CYAN}[*] Running Certbot to secure Nginx...${NC}"
        if ! command -v certbot &> /dev/null; then
            sudo apt update && sudo apt install -y certbot python3-certbot-nginx
        fi
        sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m "$ADMIN_EMAIL" || echo -e "${RED}[!] Certbot encountered an issue. You may need to run 'sudo certbot --nginx' manually.${NC}"
        
        echo -e "${GREEN}[✓] Proxy and SSL Repair Complete!${NC}"
        exit 0
    fi
fi

mkdir -p data uploads
chmod -R 777 data uploads

echo -e "${CYAN}Cleaning up deprecated configuration and AI toolchains...${NC}"
sudo rm -rf sentry.client.config.ts sentry.server.config.ts sentry.edge.config.ts .tools

cp docker-compose.base.yml docker-compose.yml
sed -i "s/- \"3000:3000\"/- \"$WEB_PORT:3000\"/g" docker-compose.yml

if [ "$REVERSE_PROXY_MODE" = "1" ]; then
    sed -i "/- \"80:80\"/d" docker-compose.yml
    sed -i "/- \"443:443\"/d" docker-compose.yml
else
    sed -i "s/- \"80:80\"/- \"$HTTP_PORT:80\"/g" docker-compose.yml
    sed -i "s/- \"443:443\"/- \"$HTTPS_PORT:443\"/g" docker-compose.yml
fi

# Database Backend Selection
DB_PROVIDER_OPT=$(whiptail --title "Database Backend" --menu "Select Database Backend:" 16 75 3 \
"1" "SQLite (Default)" \
"2" "MariaDB (Docker - Integrated)" \
"3" "MySQL/MariaDB (External Host)" 3>&1 1>&2 2>&3)

if [ $? -ne 0 ]; then exit 1; fi

if [ "$DB_PROVIDER_OPT" = "1" ]; then
    node scripts/setup-env.mjs \
        --generate-secret \
        NEXT_PUBLIC_SITE_URL="http://localhost:$WEB_PORT" \
        NEXT_PUBLIC_DISCORD_INVITE="" \
        DB_PROVIDER="sqlite" \
        DATABASE_URL="file:./prisma/db/dev.db"
elif [ "$DB_PROVIDER_OPT" = "2" ]; then
    DB_PASS=$(openssl rand -hex 12)
    DB_ROOT_PASS=$(openssl rand -hex 12)
    
    node scripts/setup-env.mjs \
        --generate-secret \
        NEXT_PUBLIC_SITE_URL="http://localhost:$WEB_PORT" \
        NEXT_PUBLIC_DISCORD_INVITE="" \
        DB_PROVIDER="mysql" \
        DATABASE_URL="mysql://saints:${DB_PASS}@db:3306/saints_gaming"
        
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
    sed -i '/container_name: saints-gaming-web/a \    depends_on:\n      db:\n        condition: service_healthy' docker-compose.yml
elif [ "$DB_PROVIDER_OPT" = "3" ]; then
    EXT_HOST=$(whiptail --title "External Database" --inputbox "Enter Database Host/IP:" 10 60 "127.0.0.1" 3>&1 1>&2 2>&3)
    EXT_PORT=$(whiptail --title "External Database" --inputbox "Enter Database Port:" 10 60 "3306" 3>&1 1>&2 2>&3)
    EXT_USER=$(whiptail --title "External Database" --inputbox "Enter Database User:" 10 60 "root" 3>&1 1>&2 2>&3)
    EXT_PASS=$(whiptail --title "External Database" --passwordbox "Enter Database Password:" 10 60 3>&1 1>&2 2>&3)
    EXT_DB=$(whiptail --title "External Database" --inputbox "Enter Database Name:" 10 60 "saints_gaming" 3>&1 1>&2 2>&3)
    
    node scripts/setup-env.mjs \
        --generate-secret \
        NEXT_PUBLIC_SITE_URL="http://localhost:$WEB_PORT" \
        NEXT_PUBLIC_DISCORD_INVITE="" \
        DB_PROVIDER="mysql" \
        DATABASE_URL="mysql://${EXT_USER}:${EXT_PASS}@${EXT_HOST}:${EXT_PORT}/${EXT_DB}"
fi

# Setup Wizard
DOMAIN=$(whiptail --title "Domain Setup" --inputbox "Enter your Domain Name (e.g. saintsgaming.net):" 10 60 "saintsgaming.net" 3>&1 1>&2 2>&3)
if [ $? -ne 0 ]; then exit 1; fi
SITE_URL="https://$DOMAIN"
node scripts/setup-env.mjs \
    NEXT_PUBLIC_SITE_URL="$SITE_URL" \
    AUTH_TRUST_HOST="true"

# Web Server / Proxy Setup (Caddy or Nginx)
USE_CADDY=0
if [ "$REVERSE_PROXY_MODE" = "1" ]; then
    SSL_CHOICE="No (Reverse Proxy Mode)"
    RUN_CERTBOT=0
    echo -e "${YELLOW}[*] Skipping web server installation (Reverse Proxy Mode)...${NC}"
else
    if command -v nginx &> /dev/null; then
        if whiptail --title "Web Server Upgrade" --yesno "Nginx is currently installed on your system.\n\nWould you like to completely REMOVE Nginx and automatically install Caddy instead? (Caddy is a modern web server that automatically handles SSL without Certbot)." 12 70 3>&1 1>&2 2>&3; then
            echo -e "${RED}[!] Stopping and purging Nginx...${NC}"
            sudo systemctl stop nginx || true
            sudo apt-get purge -y nginx nginx-common
            sudo apt-get autoremove -y
            USE_CADDY=1
        fi
    else
        if whiptail --title "Web Server Selection" --yesno "We need to install a Web Server to handle SSL and Proxying.\n\nWould you like to install Caddy? (Recommended - automatic SSL, modern, faster config). If NO, we will install Nginx." 12 70 3>&1 1>&2 2>&3; then
            USE_CADDY=1
        fi
    fi

    if [ "$USE_CADDY" = "1" ]; then
        if ! command -v caddy &> /dev/null; then
            echo -e "${CYAN}[*] Installing Caddy Web Server...${NC}"
            sudo apt update
            sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
            curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
            curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
            sudo apt update
            sudo apt install -y caddy
        fi
        SSL_CHOICE="Caddy (Automatic HTTPS)"
        RUN_CERTBOT=0
        
        echo -e "${CYAN}[*] Writing Caddy configuration for $DOMAIN...${NC}"
        cat <<EOF | sudo tee /etc/caddy/Caddyfile
$DOMAIN, www.$DOMAIN {
    reverse_proxy 127.0.0.1:$WEB_PORT
}
EOF
        sudo systemctl reload caddy || sudo systemctl restart caddy
    else
        if ! command -v nginx &> /dev/null || ! command -v certbot &> /dev/null; then
            echo -e "${YELLOW}[*] Installing Nginx and Certbot...${NC}"
            sudo apt update
            sudo apt install -y nginx certbot python3-certbot-nginx
        fi

        if whiptail --title "Networking Setup" --yesno "Are you proxying traffic through Cloudflare? (Orange Cloud icon on DNS)\n\nIf YES, Certbot will NOT be run (Cloudflare handles SSL)." 12 70 3>&1 1>&2 2>&3; then
            SSL_CHOICE="Nginx (Cloudflare)"
        else
            SSL_CHOICE="Nginx (Let's Encrypt / Certbot)"
        fi

        if [ -f "/etc/nginx/sites-available/$DOMAIN" ] && grep -q "ssl_certificate" "/etc/nginx/sites-available/$DOMAIN"; then
            echo -e "${YELLOW}[*] Preserving existing SSL-enabled Nginx configuration for $DOMAIN...${NC}"
        else
            cat <<EOF | sudo tee /etc/nginx/sites-available/$DOMAIN
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
EOF
        fi
        sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
        sudo systemctl reload nginx || sudo systemctl restart nginx
    fi
fi

if [ "$SSL_CHOICE" = "Nginx (Let's Encrypt / Certbot)" ]; then
    if [ "$HTTP_PORT" = "80" ]; then
        whiptail --msgbox "Nginx configuration generated. After the application starts, the script will automatically run Certbot to secure your site." 8 60
        RUN_CERTBOT=1
    else
        whiptail --msgbox "Port 80 is configured to $HTTP_PORT. Certbot requires port 80 to be free for HTTP validation, so automatic SSL generation will be skipped. Please configure SSL manually." 10 70
    fi
fi

# Additional Subdomain Proxies (e.g., AMP by CubeCoders, Pterodactyl, etc.)
EXTRA_SUBDOMAINS=()
if [ "$REVERSE_PROXY_MODE" != "1" ]; then
    while whiptail --title "Additional Subdomain Proxy" --yesno "Would you like to set up an additional subdomain proxy for another service running on this server?\n(e.g., panel.$DOMAIN for AMP by CubeCoders)" 12 70 3>&1 1>&2 2>&3; do
        SUBDOMAIN=$(whiptail --title "Subdomain" --inputbox "Enter the full subdomain (e.g. panel.$DOMAIN):" 10 60 "panel.$DOMAIN" 3>&1 1>&2 2>&3)
        if [ $? -ne 0 ] || [ -z "$SUBDOMAIN" ]; then break; fi
        
        PROXY_PORT=$(whiptail --title "Local Port" --inputbox "Enter the local port this service is running on (e.g. 8080 for AMP):" 10 60 "8080" 3>&1 1>&2 2>&3)
        if [ $? -ne 0 ] || [ -z "$PROXY_PORT" ]; then break; fi
        
        PROXY_IP=$(whiptail --title "Target IP" --inputbox "Enter the internal target IP:" 10 60 "127.0.0.1" 3>&1 1>&2 2>&3)
        if [ $? -ne 0 ] || [ -z "$PROXY_IP" ]; then break; fi
        
        if [ "$USE_CADDY" = "1" ]; then
            echo -e "${CYAN}[*] Appending Caddy configuration for $SUBDOMAIN -> $PROXY_IP:$PROXY_PORT...${NC}"
            cat <<EOF | sudo tee -a /etc/caddy/Caddyfile

$SUBDOMAIN {
    reverse_proxy $PROXY_IP:$PROXY_PORT
}
EOF
            sudo systemctl reload caddy || sudo systemctl restart caddy
        else
            echo -e "${CYAN}[*] Creating Nginx configuration for $SUBDOMAIN -> $PROXY_IP:$PROXY_PORT...${NC}"
            cat <<EOF | sudo tee /etc/nginx/sites-available/$SUBDOMAIN
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
EOF
            sudo ln -sf /etc/nginx/sites-available/$SUBDOMAIN /etc/nginx/sites-enabled/
            sudo systemctl reload nginx || sudo systemctl restart nginx
        fi
        
        EXTRA_SUBDOMAINS+=("$SUBDOMAIN")
        whiptail --title "Success" --msgbox "Subdomain $SUBDOMAIN successfully proxied to $PROXY_IP:$PROXY_PORT!" 8 60
    done
fi

# Admin Credentials
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

# Discord Auth
if whiptail --title "Discord Integration" --yesno "Do you want to configure Discord Login?" 10 60 3>&1 1>&2 2>&3; then
    while true; do
        DISCORD_ID=$(whiptail --title "Discord Client ID" --inputbox "Enter Discord Client ID:" 10 60 3>&1 1>&2 2>&3)
        if [ $? -ne 0 ]; then break; fi
        
        DISCORD_SECRET=$(whiptail --title "Discord Client Secret" --passwordbox "Enter Discord Client Secret:" 10 60 3>&1 1>&2 2>&3)
        if [ $? -ne 0 ]; then break; fi
        
        whiptail --title "Verifying" --infobox "Verifying Discord Client credentials with Discord API..." 8 40
        DISCORD_CHECK=$(curl -s -X POST https://discord.com/api/v10/oauth2/token \
          -d "grant_type=client_credentials" \
          -d "client_id=${DISCORD_ID}" \
          -d "client_secret=${DISCORD_SECRET}")
          
        if echo "$DISCORD_CHECK" | grep -q "access_token"; then
            whiptail --title "Success" --msgbox "Discord credentials verified successfully!" 8 40
            node scripts/setup-env.mjs AUTH_DISCORD_ID="$DISCORD_ID" AUTH_DISCORD_SECRET="$DISCORD_SECRET"
            break
        else
            if whiptail --title "Verification Failed" --yesno "Discord API rejected the Client ID or Secret.\n\nAre you absolutely sure they are correct? (Select YES to force save, NO to try again)" 12 60; then
                node scripts/setup-env.mjs AUTH_DISCORD_ID="$DISCORD_ID" AUTH_DISCORD_SECRET="$DISCORD_SECRET"
                break
            fi
        fi
    done
fi

# DB Selection
DB_OPTION=$(whiptail --title "Database Configuration" --radiolist "Select your database backend:" 16 70 3 \
"1" "SQLite (Zero Configuration - Default)" ON \
"2" "MariaDB (Automated via Docker)" OFF \
"3" "MySQL/MariaDB (External / Existing Host)" OFF 3>&1 1>&2 2>&3)

if [ "$DB_OPTION" = "2" ]; then
    DB_NAME="MariaDB (Docker)"
    DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 16)
    DB_ROOT_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 16)
    DB_URL="mysql://saints:${DB_PASS}@db:3306/saints_gaming"
    node scripts/setup-env.mjs DATABASE_URL="$DB_URL" DB_PROVIDER="mysql"
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
    sed -i '/container_name: saints-gaming-web/a\    depends_on:\n      db:\n        condition: service_healthy' docker-compose.yml
elif [ "$DB_OPTION" = "3" ]; then
    DB_NAME="MySQL (External)"
    
    EXT_HOST=$(whiptail --title "External DB Setup" --inputbox "Enter Database Host/IP:" 10 60 "127.0.0.1" 3>&1 1>&2 2>&3)
    EXT_PORT=$(whiptail --title "External DB Setup" --inputbox "Enter Database Port:" 10 60 "3306" 3>&1 1>&2 2>&3)
    EXT_USER=$(whiptail --title "External DB Setup" --inputbox "Enter Database User:" 10 60 "root" 3>&1 1>&2 2>&3)
    EXT_PASS=$(whiptail --title "External DB Setup" --passwordbox "Enter Database Password:" 10 60 3>&1 1>&2 2>&3)
    EXT_DB=$(whiptail --title "External DB Setup" --inputbox "Enter Database Name (will be created if missing):" 10 60 "saints_gaming" 3>&1 1>&2 2>&3)
    
    DB_URL="mysql://${EXT_USER}:${EXT_PASS}@${EXT_HOST}:${EXT_PORT}/${EXT_DB}"
    
    # Optional: We could try to ping it, but since Bun/Prisma will do it on startup, we just save it.
    node scripts/setup-env.mjs DATABASE_URL="$DB_URL" DB_PROVIDER="mysql"
else
    DB_NAME="SQLite"
fi

# Confirm Configuration Screen
whiptail --title "Deployment Summary" --msgbox "======================================\n  Deployment Summary\n======================================\nDatabase    : $DB_NAME\nDomain      : $DOMAIN\nSSL Option  : $SSL_CHOICE\nAdmin User  : $ADMIN_USER\n======================================\n\nPress OK to build and deploy." 16 60

clear

echo -e "${PURPLE}${BOLD}========================================${NC}"
echo -e "${CYAN}${BOLD}  Starting Cluster Build...${NC}"
echo -e "${PURPLE}${BOLD}========================================${NC}"

if [ "$EUID" -ne 0 ] && command -v sudo &> /dev/null; then sudo -v; fi

# Forcefully remove any existing containers that might conflict due to previous failed installations
sudo docker rm -f saints-gaming-web saints-gaming-db >/dev/null 2>&1 || true

# Build Output
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

if [ "$DB_OPTION" = "2" ]; then
    echo -e "\n${CYAN}[*] Initializing MariaDB schema inside containers...${NC}"
    # Wait for DB service to be healthy
    DB_READY=0
    DB_WAIT_RETRIES=30
    for i in $(seq 1 $DB_WAIT_RETRIES); do
        sudo docker compose exec -T db mysqladmin ping -h localhost -uroot -p"${DB_ROOT_PASS}" > /dev/null 2>&1 && DB_READY=1 && break
        printf "."
        sleep 2
    done
    echo ""
    if [ $DB_READY -eq 1 ]; then
        echo -e "${GREEN}[✓] MariaDB is accepting connections.${NC}"
        echo -e "${CYAN}Prisma schema will be pushed automatically by the web container entrypoint.${NC}"
    else
        echo -e "${RED}[!] MariaDB did not become ready in time. Skipping DB initialization.${NC}"
        echo -e "${YELLOW}Check container logs: sudo docker logs saints-gaming-db${NC}"
    fi
fi

echo -e "\n${CYAN}[*] Waiting for the web server to become healthy...${NC}"
MAX_RETRIES=40
RETRY_COUNT=0
SERVER_READY=0
SECRET_VAL=$(grep "^AUTH_SECRET=" .env | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//')

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
      -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\",\"email\":\"$ADMIN_EMAIL\"}" > /dev/null
    
    if [ "$RUN_CERTBOT" = "1" ]; then
        echo -e "\n${CYAN}[*] Running Certbot to secure Nginx...${NC}"
        sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m "$ADMIN_EMAIL" || echo -e "${YELLOW}[!] Certbot encountered an issue. Please run it manually later.${NC}"
        
        for SUB in "${EXTRA_SUBDOMAINS[@]}"; do
            echo -e "\n${CYAN}[*] Running Certbot to secure $SUB...${NC}"
            sudo certbot --nginx -d $SUB --non-interactive --agree-tos -m "$ADMIN_EMAIL" || echo -e "${YELLOW}[!] Certbot encountered an issue for $SUB.${NC}"
        done
    fi

    echo -e "\n${CYAN}[*] Verifying permissions for data directories...${NC}"
    sudo chown -R "$REAL_USER:$REAL_USER" data uploads 2>/dev/null || true
    sudo chown -R 999:999 mysql_data 2>/dev/null || true
    sudo chmod -R 775 data uploads 2>/dev/null || true
    
    clear
    echo -e "${PURPLE}${BOLD}"
    echo "  ___   _   ___ _  _ _____ ___    ___   _   __  __ ___ _  _  ___ "
    echo " / __| /_\ |_ _| \| |_   _/ __|  / __| /_\ |  \/  |_ _| \| |/ __|"
    echo " \__ \/ _ \ | || .  | | | \__ \ | (_ |/ _ \| |\/| || || .  | (_ |"
    echo " |___/_/ \_\___|_|\_| |_| |___/  \___/_/ \_\_|  |_|___|_|\_|\___|"
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
    echo -e "============================================================\n"
else
    echo -e "${RED}[!] Server took too long to start. It might still be initializing database migrations.${NC}"
    echo -e "${YELLOW}    You can check the logs with: sudo docker logs saints-gaming-web${NC}"
fi
