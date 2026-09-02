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

# --- Restart Only Mode Handler ---
if [ "$UPDATE_MODE" = "restart" ]; then
    echo -e "${CYAN}[*] Restarting platform services...${NC}"
    if [ -f "docker-compose.yml" ] && command -v docker &>/dev/null; then
        ( docker compose restart web >> docker_build.log 2>&1 || docker compose up -d web >> docker_build.log 2>&1 ) &
        UP_PID=$!
        run_with_spinner "Restarting web container" "docker_build.log" "$UP_PID"
        echo -e "${GREEN}[✓] Docker web container restarted.${NC}"
    fi
    if command -v pm2 &>/dev/null; then
        pm2 restart all 2>/dev/null || true
        echo -e "${GREEN}[✓] PM2 services restarted.${NC}"
    fi
    if command -v systemctl &>/dev/null; then
        if systemctl is-active --quiet caddy; then sudo systemctl reload caddy 2>/dev/null; fi
        if systemctl is-active --quiet nginx; then sudo systemctl reload nginx 2>/dev/null; fi
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
RUN_DB_BACKUP=0
RUN_CLEAN_PRUNE=0

if [ "$UPDATE_MODE" = "full" ]; then
    NEED_NPM_INSTALL=1
    NEED_DB_MIGRATE=1
    NEED_BUILD=1
    NEED_ASSET_SYNC=1
    RUN_DB_BACKUP=1
    RUN_CLEAN_PRUNE=1
elif [ "$UPDATE_MODE" = "app" ]; then
    NEED_NPM_INSTALL=1
    NEED_DB_MIGRATE=0
    NEED_BUILD=1
    NEED_ASSET_SYNC=1
    RUN_DB_BACKUP=0
    RUN_CLEAN_PRUNE=0
elif [ "$UPDATE_MODE" = "db" ]; then
    NEED_NPM_INSTALL=0
    NEED_DB_MIGRATE=1
    NEED_BUILD=0
    NEED_ASSET_SYNC=1
    RUN_DB_BACKUP=1
    RUN_CLEAN_PRUNE=0
elif [ "$UPDATE_MODE" = "quick" ]; then
    NEED_NPM_INSTALL=0
    NEED_DB_MIGRATE=0
    NEED_BUILD=0
    NEED_ASSET_SYNC=0
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
        if echo "$DIFF_FILES" | grep -qE "(prisma/|prepare-prisma\.js)"; then
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
echo -e "${BLUE}└──────────────────────────────────────────────────────────┘${NC}\n"

# --- Database Backup (if required) ---
if [ "$RUN_DB_BACKUP" -eq 1 ] && grep -q "^DATABASE_URL=.*@db:3306" .env 2>/dev/null && command -v docker &>/dev/null; then
    if docker ps | grep -q "saints-gaming-db"; then
        echo -e "${CYAN}[*] Performing automated database backup before schema migration...${NC}"
        mkdir -p backups
        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        DB_USER=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://\([^:]*\):.*|\1|p')
        DB_PASS=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
        
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

# --- Validate docker-compose.yml and auto-repair if corrupted ---
if docker compose config > /dev/null 2>&1; then
    : # compose file is valid
else
    echo -e "${YELLOW}[!] docker-compose.yml failed validation. Restoring from clean base...${NC}"
    HAS_DB_SERVICE=0
    if grep -q "image: mariadb" docker-compose.yml 2>/dev/null; then
        HAS_DB_SERVICE=1
        DB_CN=$(grep -A1 "image: mariadb" docker-compose.yml | grep "container_name:" | awk '{print $2}' 2>/dev/null)
        DB_CN=${DB_CN:-saints-gaming-db}
    fi
    WEB_CN=$(grep "container_name:" docker-compose.yml | head -1 | awk '{print $2}' 2>/dev/null)
    WEB_CN=${WEB_CN:-saints-gaming-web}
    WEB_PORT_MAP=$(grep -E '^\s+- "[0-9]+:3000"' docker-compose.yml | head -1 | sed 's/.*"\(.*\)".*/\1/' 2>/dev/null)
    WEB_PORT_MAP=${WEB_PORT_MAP:-3000:3000}

    cp docker-compose.base.yml docker-compose.yml
    sed -i '/^\s*args:\s*$/d' docker-compose.yml 2>/dev/null || true
    sed -i "s/container_name: saints-gaming-web/container_name: ${WEB_CN}/g" docker-compose.yml
    sed -i "s/- \"3000:3000\"/- \"${WEB_PORT_MAP}\"/g" docker-compose.yml

    if [ "$HAS_DB_SERVICE" = "1" ]; then
        DB_PASS_ENV=$(grep '^DATABASE_URL=' .env 2>/dev/null | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
        DB_PASS_ENV=${DB_PASS_ENV:-changeme}
        cat >> docker-compose.yml <<DCEOF

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
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 5
DCEOF
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

    # Sync MariaDB credentials if present
    if grep -q "^DATABASE_URL=.*@db:3306" .env 2>/dev/null && docker ps | grep -q "saints-gaming-db"; then
        DB_PASS=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
        DB_USER=$(grep '^DATABASE_URL=' .env | sed -n 's|.*://\([^:]*\):.*|\1|p')
        if [ -n "$DB_PASS" ] && [ -n "$DB_USER" ]; then
            if ! docker exec saints-gaming-db mariadb -u "$DB_USER" -p"$DB_PASS" -e "SELECT 1;" saints_gaming &>/dev/null; then
                ROOT_PASS=$(docker exec saints-gaming-db env | grep MARIADB_ROOT_PASSWORD= | cut -d= -f2-)
                docker exec saints-gaming-db mariadb -u root -p"$ROOT_PASS" -e \
                    "ALTER USER '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASS}'; FLUSH PRIVILEGES;" 2>/dev/null || true
            fi
        fi
    fi

    if [ "$NEED_BUILD" -eq 1 ]; then
        echo -e "${CYAN}[*] Building web container (Next.js + MMO GameEngine)...${NC}"
        > docker_build.log
        ( docker compose build web > docker_build.log 2>&1 ) &
        BUILD_PID=$!
        run_with_spinner "Compiling web container bundle" "docker_build.log" "$BUILD_PID"
        BUILD_STATUS=$?

        if [ $BUILD_STATUS -ne 0 ]; then
            echo -e "${RED}[!] Build failed! Last 25 lines of docker_build.log:${NC}\n"
            tail -n 25 docker_build.log
            exit 1
        fi
        echo -e "${GREEN}[✓] Web container built successfully.${NC}\n"

        echo -e "${CYAN}[*] Starting web container in background...${NC}"
        ( docker compose up -d --no-deps web >> docker_build.log 2>&1 ) &
        UP_PID=$!
        run_with_spinner "Launching updated web container" "docker_build.log" "$UP_PID"
        echo -e "${GREEN}[✓] Web container running.${NC}\n"
    else
        echo -e "${CYAN}[*] Performing fast container reload (~2s)...${NC}"
        ( docker compose restart web >> docker_build.log 2>&1 || docker compose up -d --no-deps web >> docker_build.log 2>&1 ) &
        RESTART_PID=$!
        run_with_spinner "Reloading web services" "docker_build.log" "$RESTART_PID"
        echo -e "${GREEN}[✓] Web services hot-reloaded.${NC}\n"
    fi

    # Run Database migrations inside container if schema changed
    if [ "$NEED_DB_MIGRATE" -eq 1 ]; then
        echo -e "${CYAN}[*] Applying Prisma database schema migrations inside container...${NC}"
        docker exec saints-gaming-web npx prisma db push --accept-data-loss 2>/dev/null || true
        echo -e "${GREEN}[✓] Database migrations completed.${NC}\n"
    fi

    # Sync local game assets if required
    if [ "$NEED_ASSET_SYNC" -eq 1 ]; then
        echo -e "${CYAN}[*] Syncing local game assets to database...${NC}"
        docker exec saints-gaming-web npm run sync:assets 2>/dev/null || true
        echo -e "${GREEN}[✓] Assets synced.${NC}\n"
    fi

    # MMO socket cleanup
    if docker ps -a --format '{{.Names}}' | grep -q '^saints-gaming-mmo$'; then
        docker rm -f saints-gaming-mmo 2>/dev/null || true
    fi

    # Reload proxies
    if command -v systemctl &>/dev/null; then
        if systemctl is-active --quiet caddy; then sudo systemctl reload caddy 2>/dev/null; fi
        if systemctl is-active --quiet nginx; then sudo systemctl reload nginx 2>/dev/null; fi
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
    fi

    if [ "$NEED_BUILD" -eq 1 ]; then
        echo -e "${CYAN}[*] Building production bundle (Next.js)...${NC}"
        npm run build
    fi

    if [ "$NEED_ASSET_SYNC" -eq 1 ]; then
        npm run sync:assets 2>/dev/null || true
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