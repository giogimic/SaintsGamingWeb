#!/usr/bin/env bash
# Saints Gaming Unified CLI
# Usage: ./saints.sh [command]

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT" || exit 1

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

show_help() {
    echo -e "${CYAN}Saints Gaming CLI${NC}"
    echo "Usage: ./saints.sh [command]"
    echo ""
    echo "Commands:"
    echo "  setup    - Run the initial setup and configuration wizard"
    echo "  update   - Pull latest code and update containers"
    echo "  start    - Start all Saints services (Web, Go MMO, DBs, SAMP)"
    echo "  stop     - Stop all Saints services"
    echo "  restart  - Restart all Saints services"
    echo "  status   - View the running status of containers"
    echo "  logs     - Tail logs for all containers (or specific ones)"
    echo "             e.g., ./saints.sh logs web"
    echo "  pull     - Pull latest git changes"
    echo ""
}

case "$1" in
    setup)
        if [ -f "scripts/setup.sh" ]; then
            bash scripts/setup.sh
        else
            echo -e "${RED}[!] scripts/setup.sh not found.${NC}"
        fi
        ;;
    update)
        if [ -f "scripts/update.sh" ]; then
            bash scripts/update.sh
        else
            echo -e "${RED}[!] scripts/update.sh not found.${NC}"
        fi
        ;;
    start)
        echo -e "${CYAN}[*] Starting Saints Gaming Stack...${NC}"
        if docker compose version >/dev/null 2>&1; then
            docker compose up -d
        else
            docker-compose up -d
        fi
        ;;
    stop)
        echo -e "${YELLOW}[*] Stopping Saints Gaming Stack...${NC}"
        if docker compose version >/dev/null 2>&1; then
            docker compose stop
        else
            docker-compose stop
        fi
        ;;
    restart)
        echo -e "${CYAN}[*] Restarting Saints Gaming Stack...${NC}"
        if docker compose version >/dev/null 2>&1; then
            docker compose restart
        else
            docker-compose restart
        fi
        ;;
    status)
        echo -e "${CYAN}[*] Stack Status:${NC}"
        if docker compose version >/dev/null 2>&1; then
            docker compose ps
        else
            docker-compose ps
        fi
        ;;
    logs)
        shift # remove 'logs' from args
        if docker compose version >/dev/null 2>&1; then
            docker compose logs -f "$@"
        else
            docker-compose logs -f "$@"
        fi
        ;;
    pull)
        echo -e "${CYAN}[*] Pulling latest changes from Git...${NC}"
        git pull
        ;;
    *)
        show_help
        exit 1
        ;;
esac
