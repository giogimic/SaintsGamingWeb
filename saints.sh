#!/usr/bin/env bash
# Saints Gaming Unified CLI
# Usage: ./saints.sh [command]

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT" || exit 1

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

show_help() {
    echo -e "${CYAN}Saints Gaming CLI${NC}"
    echo "Usage: ./saints.sh [command] [args...]"
    echo ""
    echo "Commands:"
    echo "  setup       - Run the initial setup and configuration wizard"
    echo "  update      - Pull latest code and update containers"
    echo "  start       - Start all Saints services (Web, Go MMO, DBs, SAMP)"
    echo "  stop        - Stop all Saints services"
    echo "  restart     - Restart all Saints services"
    echo "  status      - View the running status of containers"
    echo "  logs        - Tail logs for all containers (or specific ones)"
    echo "  proxy       - Manage Caddy subdomains (add/remove/list)"
    echo "  clear-cache - Clear Next.js cache"
    echo "  uninstall   - Remove Saints Gaming from this server"
    echo "  pull        - Pull latest git changes"
    echo ""
}

cmd_setup() {
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
      if [ -f "$ROOT/saints.sh" ]; then
          chmod +x "$ROOT/saints.sh"
          exec "$ROOT/saints.sh" proxy ui
      else
          echo -e "${RED}[!] saints.sh not found.${NC}"
          exit 1
      fi
  elif [ "$SETUP_ACTION" = "4" ]; then
      if ! whiptail --title "☢️ CONFIRM NUCLEAR REINSTALL ☢️" --yesno \
  "Are you ABSOLUTELY sure you want to perform a NUCLEAR REINSTALL?\n\nThis will:\n• FORCE STOP and REMOVE all Saints Gaming containers & volumes\n• WIPE ./mysql_data database volume completely\n• RESET .env and regenerate all cryptographic secrets\n• Bypass all repetitive confirmation & warning prompts\n\nWARNING: THIS CANNOT BE UNDONE!" 16 75; then
          echo -e "${GREEN}[*] Nuclear reinstall cancelled.${NC}"
          exit 0
      fi
  
      echo -e "${RED}${BOLD}[☢️] EXECUTING NUCLEAR REINSTALL...${NC}"
      IS_NUCLEAR_MODE=1
  
      # Force-stop & purge running Docker containers
      command -v docker &>/dev/null && docker rm -f saints-gaming-web saints-gaming-db saints-lobby 2>/dev/null || true
      command -v docker &>/dev/null && docker rmi -f saints-lobby-img saints-gaming-web 2>/dev/null || true
      command -v docker-compose &>/dev/null && docker-compose down -v 2>/dev/null || true
  
      # Wipe database volumes & reset environment
      sudo rm -rf ./mysql_data ./data ./uploads/scratch 2>/dev/null || true
      sudo rm -f ./prisma/db/dev.db ./prisma/db/dev.db-journal .env
      mkdir -p ./data ./uploads ./mysql_data
      sudo chmod -R 777 ./data ./uploads ./mysql_data 2>/dev/null || true
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
                  OLD_DB_PASS=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p' | tr -d '\r')
                  OLD_AUTH_SECRET=$(grep "^AUTH_SECRET=" .env | cut -d'=' -f2- | tr -d '\r')
              else
                  if whiptail --title "Preserve Credentials" --yesno "Would you like to KEEP the existing database credentials from the current .env file?" 10 65; then
                      REUSE_ENV=1
                      OLD_DB_PASS=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p' | tr -d '\r')
                      OLD_AUTH_SECRET=$(grep "^AUTH_SECRET=" .env | cut -d'=' -f2- | tr -d '\r')
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
          EXIST_OPT=$(whiptail --title "Existing Server Detected" --menu "Something is already running on this machine (Docker, Caddy, or Saints services):\n\n${EXISTING_HINTS}\nWhat would you like setup to do?" 22 85 4 \
          "1" "Add to Existing (Safe)   -> Just add a new subdomain. Keeps current site." \
          "2" "Run Beside It (Safe)     -> Install a separate copy on different ports." \
          "3" "Abort (Safe)             -> Stop and do nothing." \
          "4" "Nuke & Replace (DANGER)  -> Kill conflicting ports/services and take over." 3>&1 1>&2 2>&3) || exit 1
  
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
  WEB_PORT=24001
  REVERSE_PROXY_MODE=${REVERSE_PROXY_MODE:-0}
  ALLOW_KILL_PORTS=${ALLOW_KILL_PORTS:-0}
  CONFLICTS=""
  
  if [ "$IS_NUCLEAR_MODE" = "1" ]; then
      ALLOW_KILL_PORTS=1
      if ss -tuln | grep -qE ":(80|443|24001) "; then
          echo -e "${CYAN}[*] Nuclear mode: Clearing conflicting ports 80/443/24001 & systemd services...${NC}"
          sudo apt-get update -qq && sudo apt-get install -y -qq psmisc 2>/dev/null || true
          sudo fuser -k 80/tcp 443/tcp 24001/tcp &>/dev/null || true
          bash "${SCRIPT_DIR}/audit-systemd.sh" --clean -y 2>/dev/null || true
          sleep 1
      fi
  else
      if ss -tuln | grep -q ":80 "; then CONFLICTS="$CONFLICTS Port 80\n"; fi
      if ss -tuln | grep -q ":443 "; then CONFLICTS="$CONFLICTS Port 443\n"; fi
      if ss -tuln | grep -q ":24001 "; then CONFLICTS="$CONFLICTS Port 24001\n"; fi
  
      if [ "$EXISTING_CADDY_ADDITIVE" = "1" ]; then
          REVERSE_PROXY_MODE=1
          HTTP_PORT=""
          HTTPS_PORT=""
          while ss -tuln | grep -q ":$WEB_PORT "; do WEB_PORT=$((WEB_PORT+1)); done
          whiptail --title "Behind Existing Proxy" --msgbox "Additive / behind-proxy mode.\n\nApp will listen on: $WEB_PORT\nPrimary Caddy site will NOT be rewritten.\nYou will be asked for a subdomain to add." 12 70
      elif [ -n "$CONFLICTS" ]; then
          PORT_OPT=$(whiptail --title "Port Conflicts Detected" --menu "The following ports (Web Traffic) are already in use:\n$CONFLICTS\nHow do you want to handle this?" 20 85 4 \
          "1" "Use Reverse Proxy (Recommended) -> Setup uses random port. Point your proxy at it." \
          "2" "Use Alternative Ports             -> E.g. Run on port 81 and 444 instead." \
          "3" "Abort                             -> Stop setup safely." \
          "4" "Kill Conflicting Apps (DANGER)  -> Forcefully kill whatever is using these ports." 3>&1 1>&2 2>&3) || exit 1
  
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
                  if ! whiptail --title "Confirm Kill" --yesno "Really kill processes on 80/443/24001 and conflicting systemd services?" 10 65; then
                      exit 1
                  fi
              fi
              echo -e "${CYAN}Killing processes and clearing conflicting systemd units...${NC}"
              sudo apt-get update && sudo apt-get install -y psmisc
              sudo fuser -k 80/tcp 443/tcp 24001/tcp || true
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
  DB_PROVIDER_OPT=$(whiptail --title "Database Backend" --menu "Where should the game store its data?" 14 85 2 \
  "1" "Automatic (Recommended) -> Let setup create a private MariaDB inside Docker." \
  "2" "External / Custom       -> Connect to an existing database hosted elsewhere." 3>&1 1>&2 2>&3)
  
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
  sudo chmod -R 777 data uploads 2>/dev/null || chmod -R 777 data uploads 2>/dev/null || true
  
  cp docker-compose.base.yml docker-compose.yml
  sed -i '/^\s*args:\s*$/d' docker-compose.yml 2>/dev/null || true
  sed -i "s/- \"24001:24001\"/- \"$WEB_PORT:24001\"/g" docker-compose.yml
  sed -i "s/container_name: saints-gaming-web/container_name: ${WEB_CONTAINER_NAME}/g" docker-compose.yml
  # Keep image name stable; only container_name must be unique across parallel installs.
  if [ "$REVERSE_PROXY_MODE" = "1" ]; then
      sed -i "/- \"80:80\"/d" docker-compose.yml
      sed -i "/- \"443:443\"/d" docker-compose.yml
  else
      sed -i "s/- \"80:80\"/- \"$HTTP_PORT:80\"/g" docker-compose.yml
      sed -i "s/- \"443:443\"/- \"$HTTPS_PORT:443\"/g" docker-compose.yml
  fi
  sed -i '/^\s*args:\s*$/d' docker-compose.yml 2>/dev/null || true
  
  # --- Generate .env (pure bash, no Node.js required) ---
  if [ "$REUSE_ENV" = "1" ] && [ -n "$OLD_AUTH_SECRET" ]; then
      AUTH_SECRET=$OLD_AUTH_SECRET
  else
      AUTH_SECRET=$(openssl rand -base64 32)
  fi
  
  
  
  
  
  if [ "$DB_PROVIDER_OPT" = "1" ]; then
      DB_NAME="MariaDB (Docker)"
      DB_PROVIDER="mysql"
      if [ "$REUSE_ENV" = "1" ] && [ -n "$OLD_DB_PASS" ]; then
          DB_PASS=$OLD_DB_PASS
      else
          DB_PASS=$(openssl rand -base64 18 | tr -dc 'a-zA-Z0-9' | head -c 16)
      fi
      DATABASE_URL="mysql://saints:${DB_PASS}@db:3306/saints_gaming"
  
      if ! db_service_exists; then
          python3 -c "
with open('docker-compose.yml', 'r') as f:
    lines = f.readlines()
out = []
inserted = False
db_block = '''
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
      test: [\"CMD\", \"healthcheck.sh\", \"--connect\", \"--innodb_initialized\"]
      interval: 10s
      timeout: 5s
      retries: 5
'''
for line in lines:
    if (line.startswith('networks:') or line.startswith('volumes:')) and not inserted:
        out.append(db_block)
        inserted = True
    out.append(line)
if not inserted:
    out.append(db_block)
with open('docker-compose.yml', 'w') as f:
    f.writelines(out)
  "
          inject_depends_on
      fi
  
  elif [ "$DB_PROVIDER_OPT" = "2" ]; then
      DB_NAME="MySQL (External)"
      DB_PROVIDER="mysql"
      EXT_HOST=$(whiptail --title "External DB Setup" --inputbox "Enter Database Host/IP:" 10 60 "127.0.0.1" 3>&1 1>&2 2>&3)
      EXT_PORT=$(whiptail --title "External DB Setup" --inputbox "Enter Database Port:" 10 60 "3306" 3>&1 1>&2 2>&3)
      EXT_USER=$(whiptail --title "External DB Setup" --inputbox "Enter Database User:" 10 60 "root" 3>&1 1>&2 2>&3)
      EXT_PASS=$(whiptail --title "External DB Setup" --passwordbox "Enter Database Password:" 10 60 3>&1 1>&2 2>&3)
      EXT_DB=$(whiptail --title "External DB Setup" --inputbox "Enter Database Name:" 10 60 "saints_gaming" 3>&1 1>&2 2>&3)
      DATABASE_URL="mysql://${EXT_USER}:${EXT_PASS}@${EXT_HOST}:${EXT_PORT}/${EXT_DB}"
  fi
  
  # --- Append explicit network block (must come AFTER all services, including optional db) ---
  if ! grep -q "^networks:" docker-compose.yml 2>/dev/null; then
      cat >> docker-compose.yml <<'NETEOF'
  
  networks:
    default:
      name: saintsgamingweb_default
      driver: bridge
      ipam:
        driver: default
        config:
          - subnet: 10.254.254.0/24
NETEOF
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
      ADDITIVE_SUBDOMAIN=$(whiptail --title "Subdomain for this install" --inputbox "Enter the subdomain this instance should serve\n(e.g. staging.$DOMAIN or go.$DOMAIN).\n\nPrimary site on Caddy will NOT be changed." 12 70 "staging.$DOMAIN" 3>&1 1>&2 2>&3) || true
      if [ -n "$ADDITIVE_SUBDOMAIN" ]; then
          bash "$ROOT/saints.sh" proxy add "$ADDITIVE_SUBDOMAIN" 127.0.0.1 "$WEB_PORT" -y || \
            echo -e "${RED}[!] proxy add failed — run manually: ./saints.sh proxy add $ADDITIVE_SUBDOMAIN $WEB_PORT${NC}"
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
                  bash "$ROOT/saints.sh" proxy add "$ADDITIVE_SUBDOMAIN" 127.0.0.1 "$WEB_PORT" -y || true
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
                  bash "$ROOT/saints.sh" proxy add "$ADDITIVE_SUBDOMAIN" 127.0.0.1 "$WEB_PORT" -y || true
              fi
          else
              # They chose NO (fresh primary install) but Caddy is installed.
              # We MUST set USE_CADDY=1 so it doesn't fall back to Nginx!
              USE_CADDY=1
          fi
      fi
  
if [ "$EXISTING_CADDY_ADDITIVE" != "1" ]; then
        if command -v nginx &>/dev/null; then
            echo -e "\033[0;31m[!] Stopping and purging Nginx (Saints Gaming uses Caddy exclusively)...\033[0m"
            sudo systemctl stop nginx || true
            sudo apt-get purge -y nginx nginx-common
            sudo apt-get autoremove -y
        fi

        if ! command -v caddy &>/dev/null; then
            echo -e "\033[0;36m[*] Installing Caddy...\033[0m"
            sudo apt update
            sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
            curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --batch --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
            curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
            sudo apt update && sudo apt install -y caddy
        fi
        SSL_CHOICE="Caddy (Automatic HTTPS)"
        sudo mkdir -p /etc/caddy
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
    fi
  fi
  
  # --- Subdomain Proxies (Additive via dev-proxy when Caddy / Nginx) ---
  EXTRA_SUBDOMAINS=()
if [ "$EXISTING_CADDY_ADDITIVE" = "1" ] || [ "$REVERSE_PROXY_MODE" = "1" ] || command -v caddy &>/dev/null || [ -f /etc/caddy/Caddyfile ]; then
    while whiptail --title "Subdomain Setup" --yesno "Do you have any subdomains you want to add or reverse proxy on this server?\n\n(Examples: mmo.$DOMAIN, dev.$DOMAIN, panel.$DOMAIN, bot.$DOMAIN)\n\nYES = Add a subdomain proxy\nNO  = Continue setup" 14 74 3>&1 1>&2 2>&3; do
        SUBDOMAIN=$(whiptail --title "Subdomain" --inputbox "Enter the full subdomain (e.g. mmo.$DOMAIN):" 10 60 "mmo.$DOMAIN" 3>&1 1>&2 2>&3)
        if [ $? -ne 0 ] || [ -z "$SUBDOMAIN" ]; then break; fi
        PROXY_PORT=$(whiptail --title "Local Port" --inputbox "Enter the internal port this subdomain forwards to:" 10 60 "24011" 3>&1 1>&2 2>&3)
        if [ $? -ne 0 ] || [ -z "$PROXY_PORT" ]; then break; fi
        PROXY_IP=$(whiptail --title "Target IP" --inputbox "Enter the internal target IP:" 10 60 "127.0.0.1" 3>&1 1>&2 2>&3)
        if [ $? -ne 0 ] || [ -z "$PROXY_IP" ]; then break; fi

        bash "$ROOT/saints.sh" proxy add "$SUBDOMAIN" "$PROXY_IP" "$PROXY_PORT" -y || true
        EXTRA_SUBDOMAINS+=("$SUBDOMAIN")
        whiptail --title "Subdomain Added" --msgbox "Subdomain $SUBDOMAIN -> $PROXY_IP:$PROXY_PORT has been configured!" 8 65
    done
fi

# --- Go MMO (destination realtime for lobby / Studio) ---
  # Next keeps site APIs + /api/maps; game sockets move to Go when enabled.
  ENABLE_GO_MMO=1
  GO_MMO_PORT=24011
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
      if ! whiptail --title "Go MMO Backend" --yesno "Do you want to enable the Go MMO Realtime Server?\n\nREQUIRED for Multiplayer and World Studio map editing.\nThe Node.js server handles the website, but the Go server is required for players to actually see each other move around the map.\n\nYES = Install and run the Go MMO multiplayer server.\nNO  = Skip it (the game world will be offline)." 18 78; then
          ENABLE_GO_MMO=0
      fi
  fi
  
  if [ "$ENABLE_GO_MMO" = "1" ]; then
      while ss -tuln 2>/dev/null | grep -q ":$GO_MMO_PORT " || [ "$GO_MMO_PORT" -eq "${WEB_PORT:-0}" ]; do
          GO_MMO_PORT=$((GO_MMO_PORT + 1))
      done
      GO_MMO_PUBLIC_URL="http://127.0.0.1:$GO_MMO_PORT"
  
      if [ "$USE_CADDY" = "1" ] || [ "$EXISTING_CADDY_ADDITIVE" = "1" ] || command -v caddy &>/dev/null || [ -f /etc/caddy/Caddyfile ]; then
          if whiptail --title "Go MMO Subdomain" --yesno "In order for remote players to connect to the multiplayer server securely (HTTPS), the Go MMO server needs its own subdomain.\n\nFor example, if your site is 'saintsgaming.net', you should enter 'go.saintsgaming.net' when prompted next.\n\nAdd a Caddy subdomain for Go MMO now?" 15 78; then
              GO_MMO_SUBDOMAIN_CHOSEN=$(whiptail --title "Go MMO Subdomain" --inputbox "Subdomain for Go MMO sockets:" 10 60 "go.$DOMAIN" 3>&1 1>&2 2>&3) || true
              if [ -n "$GO_MMO_SUBDOMAIN_CHOSEN" ]; then
                  GO_MMO_PUBLIC_URL="https://$GO_MMO_SUBDOMAIN_CHOSEN"
                  bash "$ROOT/saints.sh" proxy add "$GO_MMO_SUBDOMAIN_CHOSEN" 127.0.0.1 "$GO_MMO_PORT" -y || true
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
  
      echo -e "${CYAN}[*] Go MMO is integrated into the main stack. It will build automatically.${NC}"
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
  
  # --- Swap Provisioning for Low-RAM VPS ---
  # Next.js compilation needs ~2-3GB. If the VPS has <3GB RAM and no swap, create temporary swap.
  if [ -f /proc/meminfo ]; then
      TOTAL_MEM_KB=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
      TOTAL_SWAP_KB=$(awk '/SwapTotal/ {print $2}' /proc/meminfo)
      if [ "$TOTAL_MEM_KB" -lt 3000000 ] && [ "$TOTAL_SWAP_KB" -lt 1000000 ]; then
          echo -e "${YELLOW}[*] Low RAM detected ($(($TOTAL_MEM_KB / 1024))MB). Creating 2GB swap file for build...${NC}"
          if [ ! -f /swapfile ]; then
              sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 2>/dev/null
              sudo chmod 600 /swapfile
              sudo mkswap /swapfile >/dev/null 2>&1
              sudo swapon /swapfile 2>/dev/null
              echo -e "${GREEN}[✓] 2GB swap created. Build should not OOM.${NC}"
          else
              sudo swapon /swapfile 2>/dev/null || true
              echo -e "${GREEN}[✓] Existing swap file activated.${NC}"
          fi
      fi
  fi
  
  # Remove only THIS install's containers (unique names) — never clobber a sibling stack.
  docker rm -f "$WEB_CONTAINER_NAME" "$DB_CONTAINER_NAME" >/dev/null 2>&1 || true
  
  # Build — live output so you can see exactly what Docker/Next.js is doing.
  # Using Docker layer cache (no --no-cache) so repeat builds are fast.
  echo -e "${CYAN}[*] Building Docker images (this may take 5-15 minutes on first run)...${NC}"
  echo -e "${YELLOW}    You will see Docker's live output below.${NC}"
  echo -e "${YELLOW}    Look for '[*] Building Next.js application...' — that step takes the longest.${NC}"
  echo ""
  
  if ! docker compose build 2>&1 | tee docker_build.log; then
      echo -e "\n${RED}[!] Build failed! Check the output above or docker_build.log for details.${NC}"
      echo -e "${YELLOW}    Common causes:${NC}"
      echo -e "${YELLOW}      - Out of memory (check 'free -h' — you need at least 1.5GB free)${NC}"
      echo -e "${YELLOW}      - Network issues during 'npm ci' (check your internet connection)${NC}"
      echo -e "${YELLOW}      - TypeScript errors (check the last few lines above)${NC}"
      exit 1
  fi
  
  echo -e "\n${GREEN}[✓] Docker images built successfully!${NC}"
  echo -e "${CYAN}[*] Starting containers...${NC}"
  
  if ! docker compose up -d 2>&1 | tee -a docker_build.log; then
      echo -e "\n${RED}[!] Failed to start containers! Check docker_build.log for details.${NC}"
      exit 1
  fi
  echo -e "\n${GREEN}[✓] Containers are up and running!${NC}"
  
  # --- MariaDB Readiness Check ---
  if [ "$DB_PROVIDER_OPT" = "1" ]; then
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
  MAX_RETRIES=150
  RETRY_COUNT=0
  SERVER_READY=0
  SECRET_VAL=$(grep "^AUTH_SECRET=" .env | cut -d'=' -f2- | tr -d '\r')
  
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
      echo -e "\n${CYAN}[*] Creating admin account...${NC}"
      
      JSON_PAYLOAD=$(cat <<EOF
{
  "username": "$ADMIN_USER",
  "password": "$ADMIN_PASS",
  "email": "$ADMIN_EMAIL"
}
EOF
)
      
      ADMIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:$WEB_PORT/api/dev/setup-admin \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SECRET_VAL" \
        -d "$JSON_PAYLOAD")
      
      HTTP_CODE=$(echo "$ADMIN_RESPONSE" | tail -n1)
      BODY=$(echo "$ADMIN_RESPONSE" | sed '$d')
      
      if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
          echo -e "${GREEN}[✓] Admin account successfully created!${NC}"
          ADMIN_STATUS="${GREEN}Successfully created (Username: $ADMIN_USER)${NC}"
      else
          echo -e "${RED}[!] Failed to create admin account. (HTTP $HTTP_CODE)${NC}"
          echo -e "${YELLOW}    Response: $BODY${NC}"
          ADMIN_STATUS="${RED}FAILED (Please register manually at /auth/register)${NC}"
          sleep 5
      fi
  
      if [ "$RUN_CERTBOT" = "1" ]; then
          echo -e "\n${CYAN}[*] Running Certbot for SSL...${NC}"
          sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m "$ADMIN_EMAIL" || echo -e "${YELLOW}[!] Certbot issue. Run manually: sudo certbot --nginx${NC}"
          for SUB in "${EXTRA_SUBDOMAINS[@]}"; do
              sudo certbot --nginx -d $SUB --non-interactive --agree-tos -m "$ADMIN_EMAIL" || true
          done
      fi
  
      echo -e "\n${CYAN}[*] Syncing local game assets to database...${NC}"
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
      echo -e "${CYAN}Admin Status:${NC}   ${ADMIN_STATUS:-$ADMIN_USER}"
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
  
}

cmd_update() {
  #!/bin/bash
  # =============================================================================
  #  Saints Gaming — Modular Update Script
  #  Pulls the latest code and updates the platform with smart change detection.
  #  Safe to run on a live server — preserves .env, database, and uploads.
  # =============================================================================
  
  # --- Colors ---
  CYAN='\033[0;36m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  RED='\033[0;31m'
  PURPLE='\033[0;35m'
  BLUE='\033[0;34m'
  NC='\033[0m'
  BOLD='\033[1m'
  
  # Animated spinner for background tasks with live tail preview
  run_with_spinner() {
      local msg="$1"
      local log_file="$2"
      local pid="$3"
      local spin='-\|/'
      local i=0
      local start_time=$(date +%s)
  
      while kill -0 "$pid" 2>/dev/null; do
          local current_time=$(date +%s)
          local elapsed=$((current_time - start_time))
          local mins=$((elapsed / 60))
          local secs=$((elapsed % 60))
          local time_str=$(printf "%dm %02ds" $mins $secs)
          
          local status_tail=""
          if [ -n "$log_file" ] && [ -f "$log_file" ]; then
              status_tail=$(tail -n 1 "$log_file" 2>/dev/null | tr -cd '[:print:]' | cut -c 1-45)
          fi
          
          i=$(( (i+1) % 4 ))
          if [ -n "$status_tail" ]; then
              printf "\r${CYAN}[${spin:$i:1}] ${msg} (${time_str}) - \033[90m%s\033[0m\033[K" "$status_tail"
          else
              printf "\r${CYAN}[${spin:$i:1}] ${msg} (${time_str})\033[K"
          fi
          sleep 0.2
      done
      wait "$pid"
      local exit_code=$?
      printf "\r\033[K"
      return $exit_code
  }
  
  # Print usage helper
  show_help() {
      echo -e "${CYAN}${BOLD}Saints Gaming — Modular Update Script${NC}"
      echo -e "Usage: ./update.sh [OPTIONS]\n"
      echo -e "${BOLD}Update Profiles / Types:${NC}"
      echo -e "  ${GREEN}--type=auto, --auto${NC}       Smart Auto-Detect (default): Inspects git diff and only builds what changed"
      echo -e "  ${GREEN}--type=quick, -q, --quick${NC}  Quick Sync: Pulls code and hot-restarts services (~5 seconds, skips full build)"
      echo -e "  ${GREEN}--type=app, -a, --app${NC}      App Rebuild: Pulls code, updates npm dependencies, and rebuilds Next.js web container"
      echo -e "  ${GREEN}--type=db, -d, --db${NC}        Database Migration: Pulls code, runs Prisma migrations & syncs game assets"
      echo -e "  ${GREEN}--type=full, -f, --full${NC}    Full Clean Rebuild: Complete Docker rebuild, cache prune, DB backup & migrations"
      echo -e "  ${GREEN}--type=restart, -r${NC}        Restart Only: Restarts services without pulling from Git or rebuilding"
      echo -e "\n${BOLD}General Flags:${NC}"
      echo -e "  ${GREEN}-y, --yes, --non-interactive${NC} Run without interactive confirmation prompts (ideal for CI/CD & admin panel)"
      echo -e "  ${GREEN}-h, --help${NC}                   Show this help message and exit"
      echo -e "\n${BOLD}Examples:${NC}"
      echo -e "  ./update.sh                    # Interactive or Smart Auto-Detect"
      echo -e "  ./update.sh --quick -y         # Ultra-fast non-interactive hot-restart"
      echo -e "  ./update.sh --type=full        # Complete production clean rebuild"
      exit 0
  }
  
  # --- Parse Arguments ---
  UPDATE_MODE=""
  NON_INTERACTIVE=0
  WIPE_GAME_DATA_CLI=0
  WIPE_SOCIAL_DATA_CLI=0
  
  while [ $# -gt 0 ]; do
      case "$1" in
          --type=*)
              UPDATE_MODE="${1#*=}"
              shift
              ;;
          --type)
              UPDATE_MODE="$2"
              shift 2
              ;;
          -q|--quick|--fast)
              UPDATE_MODE="quick"
              shift
              ;;
          -a|--app)
              UPDATE_MODE="app"
              shift
              ;;
          -d|--db|--migrate)
              UPDATE_MODE="db"
              shift
              ;;
          -f|--full|--rebuild)
              UPDATE_MODE="full"
              shift
              ;;
          -r|--restart)
              UPDATE_MODE="restart"
              shift
              ;;
          --auto|--smart)
              UPDATE_MODE="auto"
              shift
              ;;
          --wipe-game)
              WIPE_GAME_DATA_CLI=1
              shift
              ;;
          --wipe-social)
              WIPE_SOCIAL_DATA_CLI=1
              shift
              ;;
          --wipe-samp)
              WIPE_SAMP_DATA_CLI=1
              shift
              ;;
          -y|--yes|--non-interactive)
              NON_INTERACTIVE=1
              shift
              ;;
          -h|--help)
              show_help
              ;;
          *)
              echo -e "${YELLOW}[!] Unknown argument: $1${NC}"
              show_help
              ;;
      esac
  done
  
  clear
  echo -e "${CYAN}${BOLD}======================================================${NC}"
  echo -e "${CYAN}${BOLD}   Saints Gaming — Modular Update Engine              ${NC}"
  echo -e "${CYAN}${BOLD}======================================================${NC}\n"
  
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
      echo -e "${YELLOW}    Please run ${BOLD}./scripts/setup.sh${NC}${YELLOW} first for a fresh install.${NC}"
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
  
  # --- Interactive Menu Selection if no profile passed in TTY ---
  if [ -z "$UPDATE_MODE" ]; then
      if [ "$NON_INTERACTIVE" -eq 1 ] || [ ! -t 0 ]; then
          UPDATE_MODE="auto"
      else
          if command -v whiptail &>/dev/null; then
              CHOICE=$(whiptail --title "Saints Gaming Updater" --menu "Select update profile:" 16 72 6 \
                  "1" "Smart Auto-Detect (Inspect git diff and build only what changed)" \
                  "2" "Quick Sync & Restart (Fast code pull & hot-restart, ~5s)" \
                  "3" "App Rebuild (Pull code, update dependencies & build Next.js)" \
                  "4" "Database Migration (Pull code, run Prisma push & asset sync)" \
                  "5" "Full Clean Rebuild (Complete Docker rebuild, cache prune & DB backup)" \
                  "6" "Restart Only (Restart web/database services without pulling)" \
                  3>&1 1>&2 2>&3)
              case "$CHOICE" in
                  1) UPDATE_MODE="auto" ;;
                  2) UPDATE_MODE="quick" ;;
                  3) UPDATE_MODE="app" ;;
                  4) UPDATE_MODE="db" ;;
                  5) UPDATE_MODE="full" ;;
                  6) UPDATE_MODE="restart" ;;
                  *) echo -e "${RED}[*] Update cancelled.${NC}"; exit 0 ;;
              esac
          else
              echo -e "${BOLD}Select an update profile:${NC}"
              echo -e "  ${CYAN}1)${NC} ${BOLD}Smart Auto-Detect${NC} (Recommended: Inspects git diff and only builds what changed)"
              echo -e "  ${CYAN}2)${NC} ${BOLD}Quick Sync & Restart${NC} (Fast code pull & hot-restart in ~5 seconds, skips full build)"
              echo -e "  ${CYAN}3)${NC} ${BOLD}App Rebuild${NC} (Pull code, update dependencies & build Next.js bundle)"
              echo -e "  ${CYAN}4)${NC} ${BOLD}Database Migration${NC} (Pull code, run Prisma push & sync game assets)"
              echo -e "  ${CYAN}5)${NC} ${BOLD}Full Clean Rebuild${NC} (Complete Docker rebuild, cache prune & DB backup)"
              echo -e "  ${CYAN}6)${NC} ${BOLD}Restart Only${NC} (Restart services without pulling from Git)"
              echo ""
              read -p "Enter choice [1-6] (Default: 1): " USER_CHOICE
              case "$USER_CHOICE" in
                  2) UPDATE_MODE="quick" ;;
                  3) UPDATE_MODE="app" ;;
                  4) UPDATE_MODE="db" ;;
                  5) UPDATE_MODE="full" ;;
                  6) UPDATE_MODE="restart" ;;
                  *) UPDATE_MODE="auto" ;;
              esac
          fi
      fi
  fi
  
  echo -e "${PURPLE}[⚡] Active Update Profile: ${BOLD}${UPDATE_MODE^^}${NC}\n"
  
  # --- Optional Data Wiping ---
  WIPE_GAME_DATA=$WIPE_GAME_DATA_CLI
  WIPE_SOCIAL_DATA=$WIPE_SOCIAL_DATA_CLI
  WIPE_SAMP_DATA=${WIPE_SAMP_DATA_CLI:-0}
  SEED_STARTER_DATA=0
  
  if [ "$UPDATE_MODE" != "restart" ] && [ "$NON_INTERACTIVE" -eq 0 ]; then
      echo -e "${BOLD}Optional Data Wipes:${NC}"
      
      if [ "$WIPE_GAME_DATA" -eq 0 ]; then
          read -p "Wipe Game/MMO Data? (y/N): " -n 1 -r
          echo
          if [[ $REPLY =~ ^[Yy]$ ]]; then
              WIPE_GAME_DATA=1
          fi
      fi
      
      if [ "$WIPE_GAME_DATA" -eq 1 ]; then
          read -p "Run starter content seed to restore logic tiles and setup defaults? (y/N): " -n 1 -r
          echo
          if [[ $REPLY =~ ^[Yy]$ ]]; then
              SEED_STARTER_DATA=1
          fi
      fi
      
      if [ "$WIPE_SOCIAL_DATA" -eq 0 ]; then
          read -p "Wipe Social Data (Feed/Forum/News)? (y/N): " -n 1 -r
          echo
          if [[ $REPLY =~ ^[Yy]$ ]]; then
              WIPE_SOCIAL_DATA=1
          fi
      fi
      
      if [ "$WIPE_SAMP_DATA" -eq 0 ]; then
          read -p "Wipe SAMP Server Files & Installed Gamemodes? (y/N): " -n 1 -r
          echo
          if [[ $REPLY =~ ^[Yy]$ ]]; then
              WIPE_SAMP_DATA=1
          fi
      fi
      echo ""
  fi
  
  # --- Restart Only Mode Handler ---
  if [ "$UPDATE_MODE" = "restart" ]; then
      echo -e "${CYAN}[*] Restarting platform services...${NC}"
      if [ -f "docker-compose.yml" ] && command -v docker &>/dev/null; then
          ( docker compose restart web >> docker_build.log 2>&1 || docker compose up -d web >> docker_build.log 2>&1 ) &
          UP_PID=$!
          run_with_spinner "Restarting web container" "docker_build.log" "$UP_PID"
          
          if docker ps -a --format '{{.Names}}' | grep -q '^saints-lobby$'; then
              ( docker restart saints-lobby >> docker_build.log 2>&1 ) &
              GO_PID=$!
              run_with_spinner "Restarting Go MMO container" "docker_build.log" "$GO_PID"
          fi
          
          echo -e "${GREEN}[✓] Docker containers restarted.${NC}"
      fi
      if command -v pm2 &>/dev/null; then
          pm2 restart all 2>/dev/null || true
          echo -e "${GREEN}[✓] PM2 services restarted.${NC}"
      fi
      if command -v systemctl &>/dev/null; then
          if systemctl list-unit-files | grep -q saints-lobby; then sudo systemctl restart saints-lobby 2>/dev/null; fi
          if systemctl is-active --quiet caddy; then sudo systemctl reload caddy 2>/dev/null; fi
                fi
      echo -e "\n${GREEN}${BOLD}[✓] Services restarted successfully!${NC}"
      exit 0
  fi
  
  # --- Git Fetch ---
  echo -e "${CYAN}[*] Fetching latest code from Git...${NC}"
  git fetch --all
  if [ $? -ne 0 ]; then
      echo -e "${RED}[!] git fetch failed. Check your internet connection or disk space.${NC}"
      exit 1
  fi
  
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  if [ "$CURRENT_BRANCH" != "main" ] && [ "$NON_INTERACTIVE" -eq 0 ]; then
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
  
  # --- Smart Change Detection Analysis ---
  NEED_NPM_INSTALL=0
  NEED_DB_MIGRATE=0
  NEED_BUILD=1
  NEED_ASSET_SYNC=0
  NEED_STUDIO_BUILD=0
  NEED_GO_BUILD=0
  RUN_DB_BACKUP=0
  RUN_CLEAN_PRUNE=0
  
  if [ "$UPDATE_MODE" = "full" ]; then
      NEED_NPM_INSTALL=1
      NEED_DB_MIGRATE=1
      NEED_BUILD=1
      NEED_ASSET_SYNC=1
      NEED_STUDIO_BUILD=1
      NEED_GO_BUILD=1
      RUN_DB_BACKUP=1
      RUN_CLEAN_PRUNE=1
  elif [ "$UPDATE_MODE" = "app" ]; then
      NEED_NPM_INSTALL=1
      NEED_DB_MIGRATE=0
      NEED_BUILD=1
      NEED_ASSET_SYNC=1
      NEED_STUDIO_BUILD=1
      NEED_GO_BUILD=1
      RUN_DB_BACKUP=0
      RUN_CLEAN_PRUNE=0
  elif [ "$UPDATE_MODE" = "db" ]; then
      NEED_NPM_INSTALL=0
      NEED_DB_MIGRATE=1
      NEED_BUILD=0
      NEED_ASSET_SYNC=1
      NEED_STUDIO_BUILD=0
      NEED_GO_BUILD=0
      RUN_DB_BACKUP=1
      RUN_CLEAN_PRUNE=0
  elif [ "$UPDATE_MODE" = "quick" ]; then
      NEED_NPM_INSTALL=0
      NEED_DB_MIGRATE=0
      NEED_BUILD=0
      NEED_ASSET_SYNC=0
      NEED_GO_BUILD=0
      RUN_DB_BACKUP=0
      RUN_CLEAN_PRUNE=0
  else
      # AUTO Mode: Analyze exact git diff between HEAD and origin/main
      if [ "$LOCAL" = "$REMOTE" ]; then
          echo -e "${GREEN}[✓] Already up to date with origin/main.${NC}"
          if [ "$NON_INTERACTIVE" -eq 0 ]; then
              read -p "Do you want to force rebuild anyway? (y/N) " -n 1 -r
              echo
              if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                  exit 0
              fi
              NEED_NPM_INSTALL=1
              NEED_DB_MIGRATE=1
              NEED_BUILD=1
              NEED_ASSET_SYNC=1
              NEED_STUDIO_BUILD=1
              NEED_GO_BUILD=1
          else
              echo -e "${GREEN}[✓] No remote changes detected. Exiting.${NC}"
              exit 0
          fi
      else
          echo -e "${CYAN}[*] Updates detected on origin/main. Analyzing commit diff...${NC}"
          git log HEAD..origin/main --oneline
          echo ""
  
          DIFF_FILES=$(git diff HEAD origin/main --name-only)
          
          # Check dependencies
          if echo "$DIFF_FILES" | grep -qE "(package\.json|package-lock\.json)"; then
              NEED_NPM_INSTALL=1
          fi
          
          # Check database schema
          if echo "$DIFF_FILES" | grep -qE "(prisma/|prepare-prisma\.js|the-lobby/internal/db/)"; then
              NEED_DB_MIGRATE=1
              RUN_DB_BACKUP=1
          fi
  
          # Check application code / Dockerfile
          if echo "$DIFF_FILES" | grep -qE "(Dockerfile|docker-compose|entrypoint\.sh|src/|app/|server\.ts|next\.config|tsconfig|public/)"; then
              NEED_BUILD=1
          else
              # Only docs/scripts/configs changed
              NEED_BUILD=0
          fi
  
          # Check assets & maps
          if echo "$DIFF_FILES" | grep -qE "(data/|the-lobby/|scripts/seed|scripts/ensure)"; then
              NEED_ASSET_SYNC=1
          fi
  
          # Check studio desktop app
          if echo "$DIFF_FILES" | grep -qE "(saints-app/)"; then
              NEED_STUDIO_BUILD=1
          fi
          
          # Check Go MMO Backend
          if echo "$DIFF_FILES" | grep -qE "(the-lobby/|go-mmo/)"; then
              NEED_GO_BUILD=1
          fi
      fi
  fi
  
  # Print Diagnostics Matrix
  echo -e "${BLUE}┌──────────────────────────────────────────────────────────┐${NC}"
  echo -e "${BLUE}│  ${BOLD}🔍 Smart Update Profile Execution Plan                 ${BLUE}│${NC}"
  echo -e "${BLUE}├──────────────────────────────────────────────────────────┤${NC}"
  printf "${BLUE}│${NC}  • NPM Dependencies:     %-32s ${BLUE}│${NC}\n" "$([ "$NEED_NPM_INSTALL" -eq 1 ] && echo -e "${GREEN}UPDATE REQUIRED${NC}" || echo -e "${YELLOW}SKIPPED (No changes)${NC}")"
  printf "${BLUE}│${NC}  • Database Migration:   %-32s ${BLUE}│${NC}\n" "$([ "$NEED_DB_MIGRATE" -eq 1 ] && echo -e "${GREEN}MIGRATION REQUIRED${NC}" || echo -e "${YELLOW}SKIPPED (No changes)${NC}")"
  printf "${BLUE}│${NC}  • Web Container Build:  %-32s ${BLUE}│${NC}\n" "$([ "$NEED_BUILD" -eq 1 ] && echo -e "${GREEN}FULL BUILD REQUIRED${NC}" || echo -e "${GREEN}FAST HOT-RESTART (~2s)${NC}")"
  printf "${BLUE}│${NC}  • Game Asset Sync:      %-32s ${BLUE}│${NC}\n" "$([ "$NEED_ASSET_SYNC" -eq 1 ] && echo -e "${GREEN}SYNC REQUIRED${NC}" || echo -e "${YELLOW}SKIPPED${NC}")"
  printf "${BLUE}│${NC}  • Studio Desktop App:   %-32s ${BLUE}│${NC}\n" "$([ "$NEED_STUDIO_BUILD" -eq 1 ] && echo -e "${GREEN}BUILD REQUIRED${NC}" || echo -e "${YELLOW}SKIPPED${NC}")"
  printf "${BLUE}│${NC}  • Go MMO Backend:       %-32s ${BLUE}│${NC}\n" "$([ "$NEED_GO_BUILD" -eq 1 ] && echo -e "${GREEN}BUILD REQUIRED${NC}" || echo -e "${YELLOW}SKIPPED${NC}")"
  echo -e "${BLUE}└──────────────────────────────────────────────────────────┘${NC}\n"
  
  # --- Database Backup (if required) ---
  if [ "$RUN_DB_BACKUP" -eq 1 ] && grep -q "^DATABASE_URL=.*@db:3306" .env 2>/dev/null && command -v docker &>/dev/null; then
      if docker ps | grep -q "saints-gaming-db"; then
          echo -e "${CYAN}[*] Performing automated database backup before schema migration...${NC}"
          mkdir -p backups
          TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
          DB_USER=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://\([^:]*\):.*|\1|p' | tr -d '\r')
          DB_PASS=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p' | tr -d '\r')
          
          docker exec saints-gaming-db mariadb-dump -u "$DB_USER" -p"$DB_PASS" saints_gaming > "backups/db_backup_$TIMESTAMP.sql" 2>/dev/null
          if [ $? -eq 0 ]; then
              echo -e "${GREEN}[✓] Database backed up to backups/db_backup_$TIMESTAMP.sql${NC}"
          else
              echo -e "${YELLOW}[!] Database backup skipped (DB may be empty or initializing).${NC}"
              rm -f "backups/db_backup_$TIMESTAMP.sql"
          fi
      fi
  fi
  
  # --- Low Disk Space Guard (Run if full build or low disk) ---
  FREE_SPACE_KB=$(df -k / | tail -1 | awk '{print $4}')
  if [ "$RUN_CLEAN_PRUNE" -eq 1 ] || { [ -n "$FREE_SPACE_KB" ] && [ "$FREE_SPACE_KB" -lt 5242880 ]; }; then
      echo -e "${YELLOW}[!] Optimizing disk space & build cache...${NC}"
      if command -v docker &>/dev/null; then
          (
              docker builder prune -a -f >/dev/null 2>&1
              docker image prune -f >/dev/null 2>&1
              docker network prune -f >/dev/null 2>&1
          ) &
          CLEAN_PID=$!
          run_with_spinner "Reclaiming Docker build layers" "" "$CLEAN_PID"
      fi
      if command -v journalctl &>/dev/null; then
          ( sudo journalctl --vacuum-size=100M >/dev/null 2>&1 || true ) &
          VAC_PID=$!
          run_with_spinner "Vacuuming system logs" "" "$VAC_PID"
      fi
      if [ -f "docker_build.log" ]; then > docker_build.log; fi
      echo -e "${GREEN}[✓] Disk cleanup complete.${NC}\n"
  fi
  
  # --- Check uncommitted local changes ---
  if ! git diff-index --quiet HEAD -- && [ "$NON_INTERACTIVE" -eq 0 ]; then
      echo -e "${YELLOW}[!] Warning: You have uncommitted local changes that will be OVERWRITTEN.${NC}"
      read -p "Continue and OVERWRITE local changes? (y/N) " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
          echo -e "${RED}[*] Update aborted.${NC}"
          exit 1
      fi
  fi
  
  # --- Apply Git Updates ---
  echo -e "${CYAN}[*] Pulling latest code (resetting to origin/main)...${NC}"
  git reset --hard origin/main
  echo -e "${GREEN}[✓] Code repository updated to latest commit.${NC}\n"
  
  # --- Validate docker-compose.yml and auto-repair if corrupted or missing required services ---
  REBUILD_COMPOSE=0
  if ! docker compose config > /dev/null 2>&1; then
      REBUILD_COMPOSE=1
      echo -e "${YELLOW}[!] docker-compose.yml failed validation. Restoring from clean base...${NC}"
  elif grep -qE "^DATABASE_URL\s*=\s*.*@db(:3306|/)" .env 2>/dev/null && ! grep -q "image: mariadb" docker-compose.yml 2>/dev/null; then
      REBUILD_COMPOSE=1
      echo -e "${YELLOW}[!] docker-compose.yml is missing the 'db' service, but .env requires it. Injecting...${NC}"
  fi
  
  if [ "$REBUILD_COMPOSE" -eq 0 ]; then
      : # compose file is valid and has what it needs
  else
      HAS_DB_SERVICE=0
      if grep -q "image: mariadb" docker-compose.yml 2>/dev/null; then
          HAS_DB_SERVICE=1
          DB_CN=$(grep -A1 "image: mariadb" docker-compose.yml | grep "container_name:" | awk '{print $2}' 2>/dev/null)
          DB_CN=${DB_CN:-saints-gaming-db}
      fi
      WEB_CN=$(grep "container_name:" docker-compose.yml | head -1 | awk '{print $2}' 2>/dev/null)
      WEB_CN=${WEB_CN:-saints-gaming-web}
      WEB_PORT_MAP=$(grep -E '^\s+- "[0-9]+:24001"' docker-compose.yml | head -1 | sed 's/.*"\(.*\)".*/\1/' 2>/dev/null)
      WEB_PORT_MAP=${WEB_PORT_MAP:-24001:24001}
  
      cp docker-compose.base.yml docker-compose.yml
      sed -i '/^\s*args:\s*$/d' docker-compose.yml 2>/dev/null || true
      sed -i "s/container_name: saints-gaming-web/container_name: ${WEB_CN}/g" docker-compose.yml
      sed -i "s/- \"24001:24001\"/- \"${WEB_PORT_MAP}\"/g" docker-compose.yml
  
      # Also force DB service injection if .env expects it but it wasn't found
      if grep -qE "^DATABASE_URL\s*=\s*.*@db(:3306|/)" .env 2>/dev/null; then
          HAS_DB_SERVICE=1
      fi
  
      if [ "$HAS_DB_SERVICE" = "1" ]; then
          DB_PASS_ENV=$(grep '^DATABASE_URL=' .env 2>/dev/null | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p' | tr -d '\r')
          DB_PASS_ENV=${DB_PASS_ENV:-changeme}
          python3 -c "
with open('docker-compose.yml', 'r') as f:
    lines = f.readlines()
out = []
inserted = False
db_block = '''
  db:
    image: mariadb:10.11
    container_name: ${DB_CN}
    restart: unless-stopped
    environment:
      MARIADB_DATABASE: saints_gaming
      MARIADB_USER: saints
      MARIADB_PASSWORD: ${DB_PASS_ENV}
      MARIADB_ROOT_PASSWORD: ${DB_PASS_ENV}
    volumes:
      - ./mysql_data:/var/lib/mysql
    healthcheck:
      test: [\"CMD\", \"healthcheck.sh\", \"--connect\", \"--innodb_initialized\"]
      interval: 10s
      timeout: 5s
      retries: 5
'''
for line in lines:
    if (line.startswith('networks:') or line.startswith('volumes:')) and not inserted:
        out.append(db_block)
        inserted = True
    out.append(line)
if not inserted:
    out.append(db_block)
with open('docker-compose.yml', 'w') as f:
    f.writelines(out)
  "
      fi
      echo -e "${GREEN}[✓] docker-compose.yml repaired from clean base.${NC}"
  fi
  
  # Ensure explicit network block exists
  if ! grep -q "^networks:" docker-compose.yml 2>/dev/null; then
      cat >> docker-compose.yml <<'NETEOF'
  
  networks:
    default:
      name: saintsgamingweb_default
      driver: bridge
      ipam:
        driver: default
        config:
          - subnet: 10.254.254.0/24
NETEOF
  fi
  
  # --- Execution Phase ---
  if [ -f "docker-compose.yml" ] && command -v docker &>/dev/null; then
      echo -e "${CYAN}[*] Docker environment detected.${NC}"
  
      # Sync MariaDB credentials and ensure network connectivity if present
      # We use -E to allow optional spaces around the equals sign, and optional port.
      if grep -qE "^DATABASE_URL\s*=\s*.*@db(:3306|/)" .env 2>/dev/null; then
          DB_CONTAINER="saints-gaming-db"
          if ! docker ps | grep -q "$DB_CONTAINER"; then
              # Fallback: try to find ANY running mariadb/mysql container just in case
              DB_CONTAINER=$(docker ps --format '{{.Names}}' -f "ancestor=mariadb" | head -n 1)
          fi
          
          if [ -n "$DB_CONTAINER" ]; then
              echo -e "${CYAN}[*] Ensuring database container ($DB_CONTAINER) is attached to web network with 'db' alias...${NC}"
              # We must create the network first if it doesn't exist so we can attach to it
              docker network inspect saintsgamingweb_default >/dev/null 2>&1 || docker network create saintsgamingweb_default >/dev/null 2>&1
              docker network connect --alias db saintsgamingweb_default "$DB_CONTAINER" >/dev/null 2>&1 || true
          else
              echo -e "${YELLOW}[!] Warning: DATABASE_URL expects 'db:3306' but no database container is running!${NC}"
          fi
          
          DB_PASS=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p' | tr -d '\r')
          DB_USER=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://\([^:]*\):.*|\1|p' | tr -d '\r')
          if [ -n "$DB_PASS" ] && [ -n "$DB_USER" ]; then
              if ! docker exec "$DB_CONTAINER" mariadb -u "$DB_USER" -p"$DB_PASS" -e "SELECT 1;" saints_gaming &>/dev/null; then
                  ROOT_PASS=$(docker exec "$DB_CONTAINER" env | grep MARIADB_ROOT_PASSWORD= | cut -d= -f2- | tr -d '\r')
                  docker exec "$DB_CONTAINER" mariadb -u root -p"$ROOT_PASS" -e \
                      "ALTER USER '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASS}'; FLUSH PRIVILEGES;" 2>/dev/null || true
              fi
          fi
      fi
  
      if [ "$NEED_BUILD" -eq 1 ]; then
          echo -e "${CYAN}[*] Building containers (this may take a few minutes)...${NC}"
          > docker_build.log
          ( docker compose build > docker_build.log 2>&1 ) &
          BUILD_PID=$!
          run_with_spinner "Compiling container bundles" "docker_build.log" "$BUILD_PID"
          BUILD_STATUS=$?
  
          if [ $BUILD_STATUS -ne 0 ]; then
              echo -e "${RED}[!] Build failed! Last 25 lines of docker_build.log:${NC}\n"
              tail -n 25 docker_build.log
              exit 1
          fi
          echo -e "${GREEN}[✓] Containers built successfully.${NC}\n"
  
          echo -e "${CYAN}[*] Starting containers in background...${NC}"
          ( docker compose up -d --remove-orphans >> docker_build.log 2>&1 ) &
          UP_PID=$!
          run_with_spinner "Launching updated containers" "docker_build.log" "$UP_PID"
          if [ $? -ne 0 ]; then
              echo -e "${RED}[!] Failed to start containers! (Check for port conflicts)${NC}\n"
              tail -n 25 docker_build.log
              exit 1
          fi
          echo -e "${GREEN}[✓] Containers running.${NC}\n"
      else
          echo -e "${CYAN}[*] Performing fast container reload (~2s)...${NC}"
          ( docker compose up -d --remove-orphans >> docker_build.log 2>&1 ) &
          RESTART_PID=$!
          run_with_spinner "Reloading containers" "docker_build.log" "$RESTART_PID"
          if [ $? -ne 0 ]; then
              echo -e "${RED}[!] Failed to reload containers! (Check for port conflicts)${NC}\n"
              tail -n 25 docker_build.log
              exit 1
          fi
          echo -e "${GREEN}[✓] Containers hot-reloaded.${NC}\n"
      fi
  
      echo -e "${CYAN}[*] Waiting for container initialization (Prisma client generation & migration)...${NC}"
      WAIT_SECS=0
      until docker exec saints-gaming-web wget -qO- http://127.0.0.1:24001 > /dev/null; do
          sleep 2
          WAIT_SECS=$((WAIT_SECS + 2))
          if [ $WAIT_SECS -gt 90 ]; then
              echo -e "${YELLOW}[!] Timeout waiting for server to start. Proceeding anyway...${NC}"
              break
          fi
      done
      echo -e "${GREEN}[✓] Container is ready.${NC}\n"
  
      # --- Execute Optional Data Wipes ---
      WIPE_ARGS=""
      if [ "$WIPE_GAME_DATA" -eq 1 ]; then WIPE_ARGS="$WIPE_ARGS --game"; fi
      if [ "$WIPE_SOCIAL_DATA" -eq 1 ]; then WIPE_ARGS="$WIPE_ARGS --social"; fi
      
      if [ -n "$WIPE_ARGS" ]; then
          echo -e "${CYAN}[*] Executing requested data wipes inside container (via internal API)...${NC}"
          
          # Build JSON payload
          WIPE_JSON="{"
          if [ "$WIPE_GAME_DATA" -eq 1 ]; then WIPE_JSON="${WIPE_JSON}\"game\":true,"; fi
          if [ "$WIPE_SOCIAL_DATA" -eq 1 ]; then WIPE_JSON="${WIPE_JSON}\"social\":true,"; fi
          # Remove trailing comma and close JSON
          WIPE_JSON="${WIPE_JSON%,}}"
          
          # Execute HTTP POST to the Next.js server running in the container using Node's native fetch
          # This avoids wget exit codes and formatting issues.
          WIPE_RESP=$(docker exec saints-gaming-web node -e "
              fetch('http://127.0.0.1:24001/api/internal/wipe-data', {
                  method: 'POST',
                  headers: { 'Authorization': 'Bearer INTERNAL_WIPE_TOKEN_SAINTS', 'Content-Type': 'application/json' },
                  body: JSON.stringify($WIPE_JSON)
              })
              .then(async r => {
                  const text = await r.text();
                  if (!r.ok) { console.error('API Error (' + r.status + '): ' + text); process.exit(1); }
                  console.log(text);
              })
              .catch(e => { console.error('Fetch Failed:', e.message); process.exit(1); })
          " 2>&1)
          WIPE_EXIT_CODE=$?
          
          if [ $WIPE_EXIT_CODE -ne 0 ]; then
              echo -e "${RED}[!] Data wipe API failed! Exit Code: $WIPE_EXIT_CODE${NC}"
              echo -e "${RED}Response/Error:${NC}"
              echo "$WIPE_RESP"
              echo -e "\n${YELLOW}[*] Fetching recent container logs to diagnose...${NC}"
              docker logs --tail 50 saints-gaming-web
              echo -e "\n${RED}[!] Aborting update.${NC}"
              exit 1
          fi
          
          # Pretty print the messages returned by the API
          echo "$WIPE_RESP" | grep -o '"messages":\[[^]]*\]' | sed 's/"messages":\[//;s/\]//;s/"//g;s/,/\n/g' || true
          
          if [ "$WIPE_GAME_DATA" -eq 1 ]; then
              echo -e "${CYAN}[*] Wiping Go MMO SQLite database...${NC}"
              
              # Stop any running Go containers to safely delete the file
              if docker ps -a --format '{{.Names}}' | grep -q '^saints-lobby$'; then
                  docker stop saints-lobby 2>/dev/null || true
                  # REMOVED: docker rm -f saints-lobby 2>/dev/null || true
                  # REMOVED: docker volume rm saints_lobby_data (to prevent persistent player data loss)
              fi
              if docker ps -a --format '{{.Names}}' | grep -q '^saints-gaming-mmo-go$'; then
                  docker stop saints-gaming-mmo-go 2>/dev/null || true
                  rm -f ./data/dev.db 2>/dev/null || true
              fi
              
              echo -e "${GREEN}[✓] Go SQLite wiped safely.${NC}\n"
          fi
  
          if [ "$WIPE_SAMP_DATA" -eq 1 ]; then
              echo -e "${CYAN}[*] Wiping SAMP Server files...${NC}"
              # Wipe via docker exec to ensure it clears the mounted volume contents correctly
              docker exec saints-gaming-web sh -c 'rm -rf /app/samp-server/* /app/samp-server/.[!.]* 2>/dev/null' || true
              echo -e "${GREEN}[✓] SAMP server directory wiped.${NC}\n"
          fi
          
          echo -e "${GREEN}[✓] Data wipes completed.${NC}\n"
      fi
  
      if [ "$SEED_STARTER_DATA" -eq 1 ]; then
          echo -e "${CYAN}[*] Seeding starter content inside container...${NC}"
          docker exec saints-gaming-web npx tsx scripts/seed-starter-content.ts 2>/dev/null || true
          echo -e "${GREEN}[✓] Starter content seeded.${NC}\n"
      fi
  
  
  
      if [ "$NEED_GO_BUILD" -eq 1 ]; then
          # MMO socket cleanup
          if docker ps -a --format '{{.Names}}' | grep -q '^saints-lobby$'; then
              docker rm -f saints-lobby 2>/dev/null || true
          fi
  
          if grep -q "game-server:" docker-compose.yml 2>/dev/null; then
              echo -e "${CYAN}[*] Rebuilding and Restarting Go MMO container...${NC}"
              > docker_build_go.log
              ( docker compose build game-server > docker_build_go.log 2>&1 ) &
              GO_BUILD_PID=$!
              run_with_spinner "Compiling Go container" "docker_build_go.log" "$GO_BUILD_PID"
              
              if [ $? -ne 0 ]; then
                  echo -e "${RED}[!] Failed to build Go MMO container!${NC}\n"
                  tail -n 25 docker_build_go.log
                  exit 1
              fi
              
              echo -e "${CYAN}[*] Starting Go MMO container...${NC}"
              ( docker compose up -d --no-deps game-server >> docker_build_go.log 2>&1 ) &
              GO_UP_PID=$!
              run_with_spinner "Launching Go container" "docker_build_go.log" "$GO_UP_PID"
              if [ $? -ne 0 ]; then
                  echo -e "${RED}[!] Failed to start Go MMO container! (Check for port conflicts)${NC}\n"
                  tail -n 25 docker_build_go.log
                  exit 1
              fi
              echo -e "${GREEN}[✓] Go container running.${NC}\n"
          fi
      else
          # Ensure Go container is running if it was stopped (e.g., during a wipe)
          if docker ps -a --format '{{.Names}}' | grep -q '^saints-gaming-mmo-go$'; then
              if ! docker ps --format '{{.Names}}' | grep -q '^saints-gaming-mmo-go$'; then
                  echo -e "${CYAN}[*] Restarting Go MMO container...${NC}"
                  docker start saints-gaming-mmo-go >/dev/null 2>&1 || true
              fi
          fi
      fi
  
      # Reload proxies
      if command -v systemctl &>/dev/null; then
          if systemctl is-active --quiet caddy; then sudo systemctl reload caddy 2>/dev/null; fi
                fi
  
  else
      # --- Non-Docker Fallback (PM2 / Direct Node) ---
      echo -e "${YELLOW}[*] Direct Node.js / PM2 environment detected.${NC}"
  
      if ! command -v node &>/dev/null; then
          echo -e "${RED}[!] Node.js is not installed. Cannot build without Docker or Node.${NC}"
          exit 1
      fi
  
      if [ "$NEED_NPM_INSTALL" -eq 1 ]; then
          echo -e "${CYAN}[*] Installing npm dependencies...${NC}"
          npm install
      fi
  
      if [ "$NEED_DB_MIGRATE" -eq 1 ]; then
          echo -e "${CYAN}[*] Pushing database schema...${NC}"
          npx prisma db push --accept-data-loss
          npx prisma generate
          echo -e "${CYAN}[*] Ensuring base character classes...${NC}"
          npx tsx scripts/ensure-base-classes.ts
      fi
  
      # --- Execute Optional Data Wipes ---
      WIPE_ARGS=""
      if [ "$WIPE_GAME_DATA" -eq 1 ]; then WIPE_ARGS="$WIPE_ARGS --game"; fi
      if [ "$WIPE_SOCIAL_DATA" -eq 1 ]; then WIPE_ARGS="$WIPE_ARGS --social"; fi
      
      if [ -n "$WIPE_ARGS" ]; then
          echo -e "${CYAN}[*] Executing requested data wipes...${NC}"
          npx tsx scripts/wipe-data.ts $WIPE_ARGS
          echo -e "${GREEN}[✓] Data wipes completed.${NC}\n"
      fi
  
      if [ "$SEED_STARTER_DATA" -eq 1 ]; then
          echo -e "${CYAN}[*] Seeding starter content...${NC}"
          npx tsx scripts/seed-starter-content.ts
          echo -e "${GREEN}[✓] Starter content seeded.${NC}\n"
      fi
  
      if [ "$NEED_BUILD" -eq 1 ]; then
          echo -e "${CYAN}[*] Building production bundle (Next.js)...${NC}"
          npm run build
      fi
  
  
  
      if [ "$NEED_STUDIO_BUILD" -eq 1 ] && [ -f "saints-app/package.json" ]; then
          echo -e "${CYAN}[*] Updating Saints World Studio desktop application...${NC}"
          (cd saints-app && npm install && npm run build) || echo -e "${YELLOW}[!] Studio desktop build completed with warnings.${NC}"
      fi
  
      if [ "$NEED_GO_BUILD" -eq 1 ]; then
          echo -e "${CYAN}[*] Building Go MMO binary...${NC}"
          if command -v go &>/dev/null; then
              mkdir -p the-lobby/bin
              if ! ( cd the-lobby && go build -o bin/server ./cmd/server ); then
                  echo -e "${RED}[!] Go build failed. Aborting.${NC}"
                  exit 1
              fi
              echo -e "${GREEN}[✓] Go binary built.${NC}\n"
          fi
          if command -v systemctl &>/dev/null && systemctl list-unit-files | grep -q saints-lobby 2>/dev/null; then
              echo -e "${CYAN}[*] Restarting Go MMO systemd service...${NC}"
              sudo systemctl restart saints-lobby
              echo -e "${GREEN}[✓] Go service restarted.${NC}\n"
          fi
      fi
  
      if command -v pm2 &>/dev/null; then
          echo -e "${CYAN}[*] Refreshing PM2 process...${NC}"
          pm2 startOrReload ecosystem.config.js 2>/dev/null || pm2 reload all 2>/dev/null || true
          echo -e "${GREEN}[✓] PM2 process refreshed.${NC}"
      fi
  fi
  
  echo -e "\n${GREEN}${BOLD}======================================================${NC}"
  echo -e "${GREEN}${BOLD}[✓] Update Complete! (Profile: ${UPDATE_MODE^^})        ${NC}"
  echo -e "${GREEN}${BOLD}======================================================${NC}\n"
  echo -e "${YELLOW}Useful Commands:${NC}"
  echo -e "  View Logs:    docker logs saints-gaming-web -f"
  echo -e "  Restart:      ./update.sh --type=restart"
  echo -e "  Quick Sync:   ./update.sh --quick"
  echo -e "  Full Rebuild: ./update.sh --full"
  
}

cmd_proxy() {
  # Do not use `set -e` here: `whiptail` exits non-zero when users press Esc/cancel
  # which should not terminate the whole UI flow.
  set -uo pipefail
  export TERM="${TERM:-xterm}"
  
  # Manage extra reverse_proxy subdomain blocks in /etc/caddy/Caddyfile.
  # We only rewrite the section between BEGIN/END markers so we never clobber
  # the primary site block that `scripts/setup.sh` generates.
  
  CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"
  BEGIN_MARK="${BEGIN_MARK:-# SAINTS_PROXY_LIST_BEGIN}"
  END_MARK="${END_MARK:-# SAINTS_PROXY_LIST_END}"
  
  # Use sudo only when the Caddyfile (or its directory) is not writable.
  # Blind sudo breaks some environments (e.g. Windows sudo) by swallowing awk stdout.
  SUDO=""
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    if [[ -e "$CADDYFILE" ]]; then
      if [[ ! -w "$CADDYFILE" ]]; then SUDO="sudo"; fi
    else
      parent="$(dirname "$CADDYFILE")"
      if [[ ! -w "$parent" ]]; then SUDO="sudo"; fi
    fi
  fi
  
  # Privileged service control (reload) still needs root when not already root.
  SUDO_SYS=""
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    SUDO_SYS="sudo"
  fi
  
  # Read Caddyfile to stdout. Prefer `sudo cat | awk` over `sudo awk … > tmp`
  # so elevated runs never swallow awk stdout into an empty write.
  read_caddyfile() {
    if [[ ! -e "$CADDYFILE" ]]; then
      echo "[proxy-caddy] Caddyfile not found: $CADDYFILE" >&2
      return 1
    fi
    if [[ -n "$SUDO" ]]; then
      $SUDO cat "$CADDYFILE"
    else
      cat "$CADDYFILE"
    fi
  }
  
  safe_write_caddyfile() {
    local tmp_file="$1"
    if [[ ! -s "$tmp_file" ]]; then
      echo "[proxy-caddy] Refusing to write empty output to $CADDYFILE" >&2
      return 1
    fi
    if ! grep -qF "$BEGIN_MARK" "$tmp_file" || ! grep -qF "$END_MARK" "$tmp_file"; then
      echo "[proxy-caddy] Refusing to write: managed markers missing in generated file." >&2
      return 1
    fi
  
    local backup
    backup="${CADDYFILE}.bak.$(date +%Y%m%d%H%M%S)"
    if ! $SUDO cp "$CADDYFILE" "$backup" 2>/dev/null; then
      echo "[proxy-caddy] Warning: could not create backup at $backup" >&2
    else
      echo "[proxy-caddy] Backup written: $backup"
    fi
  
    if ! $SUDO cp "$tmp_file" "$CADDYFILE"; then
      echo "[proxy-caddy] Failed to write $CADDYFILE" >&2
      return 1
    fi
    return 0
  }
  
  ensure_markers() {
    # Ensure both marker lines exist; if missing, append at end of file.
    if ! $SUDO grep -qF "$BEGIN_MARK" "$CADDYFILE" 2>/dev/null; then
      $SUDO bash -c "cat >> '$CADDYFILE' <<'EOF'
  
  $BEGIN_MARK
  $END_MARK
  EOF"
    fi
    if ! $SUDO grep -qF "$END_MARK" "$CADDYFILE" 2>/dev/null; then
      # If begin exists but end doesn't, append end marker right after the begin marker.
      $SUDO bash -c "awk -v begin='$BEGIN_MARK' -v end='$END_MARK' '
        { print }
        \$0 ~ begin && !done { print end; done=1 }
      ' '$CADDYFILE' > '$CADDYFILE.tmp' && mv '$CADDYFILE.tmp' '$CADDYFILE'"
    fi
  }
  
  usage() {
    cat <<'EOF'
  Usage:
    scripts/proxy-caddy.sh list
    scripts/proxy-caddy.sh add <subdomain> <upstream_host> <upstream_port>
    scripts/proxy-caddy.sh add <subdomain> <upstream_host:upstream_port>
    scripts/proxy-caddy.sh remove <subdomain>
    scripts/proxy-caddy.sh reload
    scripts/proxy-caddy.sh ui
  
  Environment:
    CADDYFILE=/etc/caddy/Caddyfile   (override path)
EOF
  }
  
  has_whiptail() {
    command -v whiptail >/dev/null 2>&1
  }
  
  ui_mode() {
    ensure_markers
  
    # Prefer whiptail only when we appear to be in an interactive terminal.
    if has_whiptail && [[ -t 0 && -t 1 ]]; then
      # Simple whiptail loop: if menu args get too complex, fall back to prompts.
      # This keeps the script dependency-light while still offering a nicer UX.
      while true; do
        local choice
        choice="$(whiptail --title "Caddy Proxy Manager" --menu "Pick an action" 15 70 5 \
          "list" "View proxy list" \
          "add" "Add or update a proxy block" \
          "remove" "Remove a proxy block" \
          "reload" "Reload Caddy" \
          "exit" "Exit" 3>&1 1>&2 2>/dev/null)" || true
  
        # If whiptail failed to render (common under sudo without TERM/TTY),
        # drop back to plain menu.
        if [[ "${choice:-}" == "" ]]; then
          break
        fi
  
        case "$choice" in
          list)
            local out
            out="$(list_proxies || true)"
            if [[ -z "$out" ]]; then out="(no proxies configured yet)"; fi
            local tmp
            tmp="$(mktemp)"
            printf "%s\n" "$out" > "$tmp"
            whiptail --title "Current Proxies" --textbox "$tmp" 20 80
            rm -f "$tmp"
            ;;
          add)
            local sub
            sub="$(whiptail --inputbox "Subdomain to proxy (e.g. panel.example.com)" 10 70 3>&1 1>&2 2>/dev/null)" || true
            [[ -z "${sub:-}" ]] && continue
  
            local upstream
            upstream="$(whiptail --inputbox "Upstream host:port (e.g. 127.0.0.1:8080)" 10 70 3>&1 1>&2 2>/dev/null)" || true
            [[ -z "${upstream:-}" ]] && continue
  
            add_proxy "$sub" "$upstream"
            reload_caddy
            whiptail --msgbox "Added/updated: $sub -> $upstream (reloaded)" 8 70
            ;;
          remove)
            local proxies
            mapfile -t proxies < <(list_proxies || true)
  
            local sub=""
            if [[ "${#proxies[@]}" -eq 0 ]]; then
              sub="$(whiptail --inputbox "Subdomain to remove" 10 70 3>&1 1>&2 2>/dev/null)" || true
            else
              local args=()
              for l in "${proxies[@]}"; do
                local dom="${l%% ->*}"
                local up="${l#*-> }"
                args+=("$dom" "$up")
              done
              sub="$(whiptail --title "Remove Proxy" --menu "Select a proxy to remove" 20 78 10 "${args[@]}" 3>&1 1>&2 2>/dev/null)" || true
            fi
  
            [[ -z "${sub:-}" ]] && continue
            remove_proxy "$sub"
            reload_caddy
            whiptail --msgbox "Removed: $sub (reloaded)" 8 55
            ;;
          reload)
            reload_caddy
            whiptail --msgbox "Caddy reloaded." 8 40
            ;;
          exit|"")
            break
            ;;
        esac
      done
      # If we broke out due to whiptail failure, fall through to plain UI.
      if [[ "${choice:-}" != "" ]]; then
        return 0
      fi
    fi
  
    # Plain interactive fallback.
    while true; do
      echo
      echo "Caddy Proxy Manager"
      echo "1) List proxies"
      echo "2) Add/update proxy"
      echo "3) Remove proxy"
      echo "4) Reload Caddy"
      echo "5) Exit"
      read -rp "Choice: " choice
  
      case "$choice" in
        1)
          list_proxies || true
          ;;
        2)
          read -rp "Subdomain (e.g. panel.example.com): " sub
          [[ -z "${sub:-}" ]] && continue
          read -rp "Upstream host:port (e.g. 127.0.0.1:8080): " upstream
          [[ -z "${upstream:-}" ]] && continue
          add_proxy "$sub" "$upstream"
          reload_caddy
          echo "Added/updated: $sub -> $upstream (reloaded)"
          ;;
        3)
          read -rp "Subdomain to remove: " sub
          [[ -z "${sub:-}" ]] && continue
          remove_proxy "$sub"
          reload_caddy
          echo "Removed: $sub (reloaded)"
          ;;
        4)
          reload_caddy
          echo "Caddy reloaded."
          ;;
        5)
          break
          ;;
        *)
          echo "Invalid choice."
          ;;
      esac
    done
  }
  
  parse_upstream() {
    local upstream="${1:-}"
    if [[ "$upstream" == *:* ]]; then
      echo "$upstream"
      return 0
    fi
    # Host and port form was provided separately.
    local host="$2"
    local port="$3"
    echo "${host}:${port}"
  }
  
  list_proxies() {
    ensure_markers
    read_caddyfile | awk -v begin="$BEGIN_MARK" -v end="$END_MARK" '
      $0 ~ begin { managed=1; next }
      $0 ~ end { managed=0 }
      managed==1 {
        # Expected block:
        #   subdomain {
        #     reverse_proxy host:port
        #   }
        if ($0 ~ /^[[:space:]]*[A-Za-z0-9._-]+[[:space:]]*\{[[:space:]]*$/) {
          domain=$0
          gsub(/^[[:space:]]+/, "", domain)
          gsub(/[[:space:]]*\{[[:space:]]*$/, "", domain)
          next
        }
        if (domain != "" && $0 ~ /^[[:space:]]*reverse_proxy[[:space:]]+/) {
          up=$0
          gsub(/^[[:space:]]*reverse_proxy[[:space:]]+/, "", up)
          gsub(/[[:space:]]*$/, "", up)
          printf("%s -> %s\n", domain, up)
          domain=""
        }
      }
    '
  }
  
  add_proxy() {
    ensure_markers
  
    local subdomain="${1:-}"
    local upstream_host="${2:-}"
    local upstream_port="${3:-}"
  
    if [[ -z "$subdomain" ]]; then
      echo "Missing subdomain." >&2
      usage
      exit 1
    fi
  
    local upstream
    if [[ -n "${upstream_port:-}" ]]; then
      upstream="$(parse_upstream '' "$upstream_host" "$upstream_port")"
    else
      upstream="$(parse_upstream "$upstream_host")"
    fi
  
    if [[ -z "$upstream" || "$upstream" != *:* ]]; then
      echo "Upstream must be <host:port>." >&2
      exit 1
    fi
  
    local tmp
    tmp="$(mktemp)"
  
    if ! read_caddyfile | awk -v begin="$BEGIN_MARK" -v end="$END_MARK" -v targetDomain="$subdomain" -v targetUpstream="$upstream" '
      function emit_block(dom, up,    s) {
        # Normalize formatting.
        s = dom " {\n" \
            "    reverse_proxy " up "\n" \
            "}\n";
        printf("%s", s);
      }
  
      $0 ~ begin { managed=1; print; next }
      $0 ~ end {
        # If we never saw the domain block, append it right before END_MARK.
        if (managed==1 && updated!=1) emit_block(targetDomain, targetUpstream);
        managed=0
        print
        next
      }
  
      managed!=1 { print; next }
  
      # Inside managed section:
      # We capture blocks for each domain and decide to keep/update.
      /^[[:space:]]*[A-Za-z0-9._-]+[[:space:]]*\{[[:space:]]*$/ {
        cap=1
        capDomain=""
        capText=""
      }
  
      cap==1 {
        capText = capText $0 "\n"
        if (capDomain == "" && $0 ~ /^[[:space:]]*[A-Za-z0-9._-]+[[:space:]]*\{[[:space:]]*$/) {
          capDomain=$0
          gsub(/^[[:space:]]+/, "", capDomain)
          gsub(/[[:space:]]*\{[[:space:]]*$/, "", capDomain)
        }
        if ($0 ~ /^[[:space:]]*\}[[:space:]]*$/) {
          if (capDomain == targetDomain) {
            emit_block(targetDomain, targetUpstream);
            updated=1
          } else {
            printf("%s", capText)
          }
          cap=0
        }
        next
      }
  
      # Non-block lines inside markers (blank lines / whitespace) -> keep.
      { print }
    ' > "$tmp"; then
      rm -f "$tmp"
      echo "[proxy-caddy] Failed to parse/transform $CADDYFILE (add aborted)." >&2
      return 1
    fi
  
    if ! safe_write_caddyfile "$tmp"; then
      rm -f "$tmp"
      return 1
    fi
    rm -f "$tmp"
    return 0
  }
  
  remove_proxy() {
    ensure_markers
  
    local subdomain="${1:-}"
    if [[ -z "$subdomain" ]]; then
      echo "Missing subdomain." >&2
      usage
      exit 1
    fi
  
    local tmp
    tmp="$(mktemp)"
  
    if ! read_caddyfile | awk -v begin="$BEGIN_MARK" -v end="$END_MARK" -v targetDomain="$subdomain" '
      $0 ~ begin { managed=1; print; next }
      $0 ~ end { managed=0; print; next }
      managed!=1 { print; next }
  
      # Skip the entire block matching targetDomain; preserve all other blocks.
      # Keep the opening brace line in capText so kept blocks stay intact.
      cap==0 && $0 ~ /^[[:space:]]*[A-Za-z0-9._-]+[[:space:]]*\{[[:space:]]*$/ {
        cap=1
        capDomain=$0
        gsub(/^[[:space:]]+/, "", capDomain)
        gsub(/[[:space:]]*\{[[:space:]]*$/, "", capDomain)
        capText=$0 "\n"
        next
      }
  
      cap==1 {
        capText = capText $0 "\n"
        if ($0 ~ /^[[:space:]]*\}[[:space:]]*$/) {
          if (capDomain != targetDomain) {
            printf("%s", capText)
          }
          cap=0
        }
        next
      }
  
      # Preserve any non-block whitespace inside managed section.
      { print }
    ' > "$tmp"; then
      rm -f "$tmp"
      echo "[proxy-caddy] Failed to parse/transform $CADDYFILE (remove aborted)." >&2
      return 1
    fi
  
    if ! safe_write_caddyfile "$tmp"; then
      rm -f "$tmp"
      return 1
    fi
    rm -f "$tmp"
    return 0
  }
  
  reload_caddy() {
    if command -v systemctl >/dev/null 2>&1; then
      if $SUDO_SYS systemctl reload caddy; then
        echo "[proxy-caddy] Caddy reloaded."
        return 0
      fi
      if $SUDO_SYS systemctl restart caddy; then
        echo "[proxy-caddy] Caddy restarted."
        return 0
      fi
      echo "[proxy-caddy] Failed to reload/restart caddy.service." >&2
      return 1
    fi
    # Fallback: try caddy directly.
    if $SUDO_SYS caddy reload --config "$CADDYFILE"; then
      echo "[proxy-caddy] Caddy reloaded via CLI."
      return 0
    fi
    if $SUDO_SYS caddy restart --config "$CADDYFILE"; then
      echo "[proxy-caddy] Caddy restarted via CLI."
      return 0
    fi
    echo "[proxy-caddy] Failed to reload/restart caddy via CLI." >&2
    return 1
  }
  
  main() {
    local cmd="${1:-}"
    case "$cmd" in
      list)
        list_proxies
        ;;
      add)
        if [[ "${2:-}" == "" || "${3:-}" == "" ]]; then
          usage
          exit 1
        fi
        if [[ "${4:-}" != "" ]]; then
          add_proxy "$2" "$3" "$4" || exit 1
        else
          add_proxy "$2" "$3" || exit 1
        fi
        ;;
      remove)
        remove_proxy "${2:-}" || exit 1
        ;;
      reload)
        reload_caddy || exit 1
        ;;
      ui)
        ui_mode
        ;;
      *)
        usage
        exit 1
        ;;
    esac
  }
  
  main "$@"
  
  
}

cmd_uninstall() {
  #!/bin/bash
  # =============================================================================
  #  Saints Gaming — Full Uninstall Script
  #  WARNING: This will completely remove the game, services, database, and files.
  # =============================================================================
  
  CYAN='\033[0;36m'
  GREEN='\033[0;32m'
  RED='\033[0;31m'
  YELLOW='\033[1;33m'
  NC='\033[0m'
  BOLD='\033[1m'
  
  echo -e "${RED}${BOLD}================================================================${NC}"
  echo -e "${RED}${BOLD}                       DANGER ZONE                              ${NC}"
  echo -e "${RED}${BOLD}================================================================${NC}"
  echo -e "${YELLOW}This script will completely UNINSTALL Saints Gaming from this server.${NC}"
  echo -e "This includes:"
  echo -e "  - Stopping and removing all PM2 processes (saints-web)"
  echo -e "  - Stopping and disabling the Go MMO systemd service (saints-lobby)"
  echo -e "  - Resetting/Wiping the database via Prisma"
  echo -e "  - Deleting ALL game files in the current directory"
  echo -e ""
  echo -e "${RED}This action is IRREVERSIBLE.${NC}"
  echo -e ""
  
  read -p "To proceed, type 'UNINSTALL' in all caps: " CONFIRM_TEXT
  
  if [ "$CONFIRM_TEXT" != "UNINSTALL" ]; then
      echo -e "${GREEN}Uninstall aborted. Your server is safe.${NC}"
      exit 0
  fi
  
  echo -e "\n${CYAN}[*] Starting uninstall process...${NC}"
  
  # 1. Stop and remove PM2 web server
  echo -e "${CYAN}[*] Stopping PM2 web service...${NC}"
  if command -v pm2 &> /dev/null || npx pm2 -v &> /dev/null; then
      npx pm2 delete saints-web 2>/dev/null || pm2 delete saints-web 2>/dev/null || echo -e "${YELLOW}[-] PM2 process not found or already stopped.${NC}"
      npx pm2 save 2>/dev/null || pm2 save 2>/dev/null
  fi
  
  # 2. Stop and disable Go Lobby systemd service
  echo -e "${CYAN}[*] Stopping Go Lobby systemd service...${NC}"
  if command -v systemctl &> /dev/null; then
      if systemctl list-unit-files | grep -q saints-lobby; then
          sudo systemctl stop saints-lobby 2>/dev/null
          sudo systemctl disable saints-lobby 2>/dev/null
          sudo rm -f /etc/systemd/system/saints-lobby.service 2>/dev/null
          sudo systemctl daemon-reload 2>/dev/null
          echo -e "${GREEN}[✓] Removed saints-lobby service.${NC}"
      else
           echo -e "${YELLOW}[-] systemd service not found.${NC}"
      fi
  fi
  
  # 3. Stop and remove Docker containers & volumes
  echo -e "${CYAN}[*] Stopping Docker containers and wiping volumes...${NC}"
  if command -v docker &> /dev/null; then
      docker rm -f saints-gaming-web saints-gaming-db saints-lobby 2>/dev/null || true
      docker rmi -f saints-lobby-img saints-gaming-web 2>/dev/null || true
      if command -v docker-compose &> /dev/null; then
          docker-compose down -v --rmi all --remove-orphans 2>/dev/null || true
      elif docker compose version &> /dev/null; then
          docker compose down -v --rmi all --remove-orphans 2>/dev/null || true
      fi
      docker volume rm saints_lobby_data 2>/dev/null || true
      echo -e "${GREEN}[✓] Docker containers and volumes removed.${NC}"
  else
      echo -e "${YELLOW}[-] Docker not found, skipping container cleanup.${NC}"
  fi
  
  # 4. Wipe Database
  echo -e "${CYAN}[*] Wiping database...${NC}"
  if [ -d "node_modules" ]; then
      npx prisma db push --force-reset --accept-data-loss || echo -e "${RED}[!] Failed to reset database. You may need to drop the database manually in MySQL.${NC}"
  else
      echo -e "${YELLOW}[-] Node modules not found, skipping Prisma wipe. (Drop DB manually)${NC}"
  fi
  
  # 4. Remove all files (self-destruct)
  echo -e "${CYAN}[*] Removing all project files...${NC}"
  PROJECT_DIR=$(pwd)
  echo -e "${YELLOW}Deleting directory: $PROJECT_DIR${NC}"
  
  # Start a detached background process to delete the directory so we don't pull the rug out from under the running script
  nohup bash -c "sleep 2; rm -rf \"$PROJECT_DIR\"" > /dev/null 2>&1 &
  
  echo -e "${GREEN}${BOLD}================================================================${NC}"
  echo -e "${GREEN}${BOLD}Uninstall initiated. Files will be completely deleted in a few seconds.${NC}"
  echo -e "${GREEN}${BOLD}Saints Gaming has been removed from this server.${NC}"
  echo -e "${GREEN}${BOLD}================================================================${NC}"
  echo -e "You can now safely exit or close this terminal window."
  
  exit 0
  
}

cmd_clear_cache() {
  #!/bin/bash
  # =============================================================================
  #  Saints Gaming — Clear Cache Script
  #  Wipes Next.js build cache, Docker builder caches, and orphaned containers.
  # =============================================================================
  
  CYAN='\033[0;36m'
  GREEN='\033[0;32m'
  RED='\033[0;31m'
  YELLOW='\033[1;33m'
  NC='\033[0m'
  
  echo -e "${CYAN}[*] Stopping active Saints Gaming containers...${NC}"
  docker compose down || true
  
  echo -e "${CYAN}[*] Removing local Next.js build cache (if present)...${NC}"
  sudo rm -rf .next
  sudo rm -rf node_modules/.cache
  
  echo -e "${CYAN}[*] Pruning Docker builder cache...${NC}"
  docker builder prune -a -f
  
  echo -e "${CYAN}[*] Removing dangling Docker images...${NC}"
  docker image prune -f
  
  echo -e "${YELLOW}[!] If you want to force a completely clean rebuild of the images next time:${NC}"
  echo -e "    Run: ${BOLD}docker compose build --no-cache${NC}"
  
  echo -e "\n${GREEN}[✓] Cache clearing complete.${NC}\n"
  
}


COMMAND=$1
shift || true

case "$COMMAND" in
    setup)
        cmd_setup "$@"
        ;;
    update)
        cmd_update "$@"
        ;;
    proxy)
        cmd_proxy "$@"
        ;;
    uninstall)
        cmd_uninstall "$@"
        ;;
    clear-cache)
        cmd_clear_cache "$@"
        ;;
    start)
        echo -e "${CYAN}[*] Starting Saints Gaming Stack...${NC}"
        docker compose up -d
        ;;
    stop)
        echo -e "${YELLOW}[*] Stopping Saints Gaming Stack...${NC}"
        docker compose stop
        ;;
    restart)
        echo -e "${CYAN}[*] Restarting Saints Gaming Stack...${NC}"
        docker compose restart
        ;;
    status)
        docker compose ps
        ;;
    logs)
        if [ -z "$1" ]; then
            docker compose logs -f --tail=100
        else
            docker compose logs -f --tail=100 "$@"
        fi
        ;;
    pull)
        echo -e "${CYAN}[*] Pulling latest repository changes...${NC}"
        git pull
        ;;
    *)
        show_help
        exit 1
        ;;
esac
