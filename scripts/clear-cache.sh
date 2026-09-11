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
