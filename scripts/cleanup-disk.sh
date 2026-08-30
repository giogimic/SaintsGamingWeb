#!/bin/bash
# =============================================================================
#  Saints Gaming — Automated Server Disk & Docker Cleanup Script
#  Safely reclaims disk space from Docker build cache, old images, logs & apt.
# =============================================================================

# --- Colors ---
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

echo -e "${CYAN}${BOLD}====================================================${NC}"
echo -e "${CYAN}${BOLD}  Saints Gaming — Server Disk & Docker Cleanup${NC}"
echo -e "${CYAN}${BOLD}====================================================${NC}\n"

# Check disk space before
echo -e "${CYAN}[*] Current Disk Usage (Before):${NC}"
df -h /
echo ""

# 1. Docker BuildKit Cache (Primary culprit for 100+ GB build bloat)
if command -v docker &>/dev/null; then
    echo -e "${CYAN}[*] 1. Pruning Docker BuildKit build cache...${NC}"
    docker builder prune -a -f 2>/dev/null || true
    echo -e "${GREEN}[✓] Docker build cache cleared.${NC}\n"

    # 2. Dangling & unused Docker images
    echo -e "${CYAN}[*] 2. Pruning dangling & orphaned Docker images...${NC}"
    docker image prune -f 2>/dev/null || true
    echo -e "${GREEN}[✓] Dangling images removed.${NC}\n"

    # 3. Stopped containers & unused networks
    echo -e "${CYAN}[*] 3. Pruning stopped containers & unused networks...${NC}"
    docker container prune -f 2>/dev/null || true
    docker network prune -f 2>/dev/null || true
    echo -e "${GREEN}[✓] Unused containers & networks cleared.${NC}\n"
fi

# 4. Systemd Journal Logs (Vacuum down to 100MB)
if command -v journalctl &>/dev/null; then
    echo -e "${CYAN}[*] 4. Vacuuming systemd journal logs to 100MB...${NC}"
    if [ "$EUID" -eq 0 ]; then
        journalctl --vacuum-size=100M 2>/dev/null || true
    elif sudo -n true 2>/dev/null || sudo -v 2>/dev/null; then
        sudo journalctl --vacuum-size=100M 2>/dev/null || true
    fi
    echo -e "${GREEN}[✓] System logs vacuumed.${NC}\n"
fi

# 5. Local docker_build.log and old database backups (>7 days old)
echo -e "${CYAN}[*] 5. Cleaning up local build logs & aged backups (>7 days)...${NC}"
if [ -f "docker_build.log" ]; then
    > docker_build.log
    echo -e "${GREEN}[✓] Truncated docker_build.log${NC}"
fi

if [ -d "backups" ]; then
    find backups -name "db_backup_*.sql" -type f -mtime +7 -delete 2>/dev/null || true
    echo -e "${GREEN}[✓] Removed backups older than 7 days.${NC}"
fi

# 6. APT Package Cache
if command -v apt-get &>/dev/null; then
    echo -e "\n${CYAN}[*] 6. Cleaning APT package cache...${NC}"
    if [ "$EUID" -eq 0 ]; then
        apt-get clean 2>/dev/null || true
        apt-get autoremove -y 2>/dev/null || true
    elif sudo -n true 2>/dev/null || sudo -v 2>/dev/null; then
        sudo apt-get clean 2>/dev/null || true
        sudo apt-get autoremove -y 2>/dev/null || true
    fi
    echo -e "${GREEN}[✓] APT cache cleaned.${NC}"
fi

# Final Disk Space Report
echo -e "\n${CYAN}${BOLD}====================================================${NC}"
echo -e "${GREEN}${BOLD}[✓] Cleanup Complete! Current Disk Usage (After):${NC}"
echo -e "${CYAN}${BOLD}====================================================${NC}"
df -h /
echo ""
