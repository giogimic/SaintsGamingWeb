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

# Animated spinner for background tasks
run_with_spinner() {
    local msg="$1"
    local pid="$2"
    local spin='-\|/'
    local i=0
    local start_time=$(date +%s)

    while kill -0 "$pid" 2>/dev/null; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        local mins=$((elapsed / 60))
        local secs=$((elapsed % 60))
        local time_str=$(printf "%dm %02ds" $mins $secs)
        
        i=$(( (i+1) % 4 ))
        printf "\r${CYAN}[${spin:$i:1}] ${msg} (${time_str})...\033[K"
        sleep 0.2
    done
    wait "$pid"
    local exit_code=$?
    printf "\r\033[K"
    return $exit_code
}

echo -e "${CYAN}${BOLD}====================================================${NC}"
echo -e "${CYAN}${BOLD}  Saints Gaming — Server Disk & Docker Cleanup${NC}"
echo -e "${CYAN}${BOLD}====================================================${NC}\n"

# Check disk space before
echo -e "${CYAN}[*] Current Disk Usage (Before):${NC}"
df -h /
echo ""

# 1. Docker BuildKit Cache (Primary culprit for 100+ GB build bloat)
if command -v docker &>/dev/null; then
    echo -e "${CYAN}[*] 1. Pruning Docker BuildKit build cache (reclaiming cache layers)...${NC}"
    ( docker builder prune -a -f >/dev/null 2>&1 || true ) &
    PID=$!
    run_with_spinner "Reclaiming build cache layers" "$PID"
    echo -e "${GREEN}[✓] Docker build cache cleared successfully.${NC}\n"

    # 2. Dangling & unused Docker images
    echo -e "${CYAN}[*] 2. Pruning dangling & orphaned Docker images...${NC}"
    ( docker image prune -f >/dev/null 2>&1 || true ) &
    PID=$!
    run_with_spinner "Pruning orphaned images" "$PID"
    echo -e "${GREEN}[✓] Dangling images removed successfully.${NC}\n"

    # 3. Stopped containers & unused networks
    echo -e "${CYAN}[*] 3. Pruning stopped containers & unused networks...${NC}"
    (
        docker container prune -f >/dev/null 2>&1 || true
        docker network prune -f >/dev/null 2>&1 || true
    ) &
    PID=$!
    run_with_spinner "Cleaning stopped containers & networks" "$PID"
    echo -e "${GREEN}[✓] Unused containers & networks cleared.${NC}\n"
fi

# 4. Systemd Journal Logs (Vacuum down to 100MB)
if command -v journalctl &>/dev/null; then
    echo -e "${CYAN}[*] 4. Vacuuming systemd journal logs to 100MB...${NC}"
    (
        if [ "$EUID" -eq 0 ]; then
            journalctl --vacuum-size=100M >/dev/null 2>&1 || true
        elif sudo -n true 2>/dev/null || sudo -v 2>/dev/null; then
            sudo journalctl --vacuum-size=100M >/dev/null 2>&1 || true
        fi
    ) &
    PID=$!
    run_with_spinner "Vacuuming journal logs" "$PID"
    echo -e "${GREEN}[✓] System logs vacuumed successfully.${NC}\n"
fi

# 5. Local docker_build.log and old database backups (>7 days old)
echo -e "${CYAN}[*] 5. Cleaning up local build logs & aged backups (>7 days)...${NC}"
if [ -f "docker_build.log" ]; then
    > docker_build.log
    echo -e "${GREEN}[✓] Truncated docker_build.log${NC}"
fi

if [ -d "backups" ]; then
    find backups -name "db_backup_*.sql" -type f -mtime +7 -delete 2>/dev/null || true
    echo -e "${GREEN}[✓] Removed database backups older than 7 days.${NC}"
fi

# 6. APT Package Cache
if command -v apt-get &>/dev/null; then
    echo -e "\n${CYAN}[*] 6. Cleaning APT package cache...${NC}"
    (
        if [ "$EUID" -eq 0 ]; then
            apt-get clean >/dev/null 2>&1 || true
            apt-get autoremove -y >/dev/null 2>&1 || true
        elif sudo -n true 2>/dev/null || sudo -v 2>/dev/null; then
            sudo apt-get clean >/dev/null 2>&1 || true
            sudo apt-get autoremove -y >/dev/null 2>&1 || true
        fi
    ) &
    PID=$!
    run_with_spinner "Cleaning APT cache" "$PID"
    echo -e "${GREEN}[✓] APT cache cleaned successfully.${NC}"
fi

# Final Disk Space Report
echo -e "\n${CYAN}${BOLD}====================================================${NC}"
echo -e "${GREEN}${BOLD}[✓] Cleanup Complete! Current Disk Usage (After):${NC}"
echo -e "${CYAN}${BOLD}====================================================${NC}"
df -h /
echo ""
