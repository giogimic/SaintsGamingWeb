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

# 3. Wipe Database
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
