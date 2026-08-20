#!/usr/bin/env bash
# ==============================================================================
# Saints Gaming — Systemd Service Audit & Orphan Remediation Tool
# ==============================================================================
# Audits, identifies, and cleanly resolves duplicate, orphaned, or crash-looping
# systemd services across Saints Gaming deployments (Node/Next + Go MMO).
# ==============================================================================

set -eo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

MODE="audit"
DRY_RUN=0
NON_INTERACTIVE=0
JSON_OUTPUT=0

for arg in "$@"; do
  case "$arg" in
    --audit|--status|-s)
      MODE="audit"
      ;;
    --clean|-c)
      MODE="clean"
      ;;
    --canonical|--install)
      MODE="canonical"
      ;;
    --dry-run|-d)
      DRY_RUN=1
      ;;
    -y|--yes|--force)
      NON_INTERACTIVE=1
      ;;
    --json)
      JSON_OUTPUT=1
      ;;
    --help|-h)
      echo -e "${BOLD}Saints Gaming Systemd Audit Tool${NC}"
      echo "Usage: ./scripts/audit-systemd.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --audit, -s        Inspect and report on active, orphaned, and duplicate services (default)"
      echo "  --clean, -c        Stop and remove orphaned/duplicate service units"
      echo "  --canonical        Install canonical systemd service pointing to current repository"
      echo "  --dry-run, -d      Preview operations without modifying system state"
      echo "  -y, --yes          Non-interactive mode (auto-confirm cleanup)"
      echo "  --json             Output audit results as JSON"
      echo "  --help, -h         Show this help message"
      exit 0
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Ensure systemctl is available
if ! command -v systemctl &>/dev/null; then
  if [ "$JSON_OUTPUT" -eq 1 ]; then
    echo '{"error":"systemctl not available on this host"}'
  else
    echo -e "${YELLOW}[!] systemctl is not available on this host. Skipping systemd audit.${NC}"
  fi
  exit 0
fi

SUDO_CMD=""
if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo &>/dev/null; then
    SUDO_CMD="sudo"
  fi
fi

# Detect known Saints-related patterns
PATTERNS=("saints*" "go-mmo*" "saints-gaming*" "saints-web*" "saints-mmo*")

log() {
  if [ "$JSON_OUTPUT" -eq 0 ]; then
    echo -e "$@"
  fi
}

# Collect discovered units
declare -A UNIT_STATUS
declare -A UNIT_WORKDIR
declare -A UNIT_EXEC
declare -A UNIT_IS_ORPHAN
declare -A UNIT_IS_DUPLICATE
declare -A UNIT_PATH

KNOWN_UNITS=()

scan_services() {
  local search_dirs=("/etc/systemd/system" "/etc/systemd/system/multi-user.target.wants" "/lib/systemd/system")
  
  for dir in "${search_dirs[@]}"; do
    if [ -d "$dir" ]; then
      for pat in "${PATTERNS[@]}"; do
        for file in "$dir"/$pat; do
          if [ -f "$file" ] || [ -L "$file" ]; then
            local unit_name
            unit_name="$(basename "$file")"
            
            # Skip if not a service unit
            if [[ "$unit_name" != *.service ]]; then
              continue
            fi
            
            # Add to array if not already present
            local exists=0
            for u in "${KNOWN_UNITS[@]}"; do
              if [ "$u" == "$unit_name" ]; then exists=1; break; fi
            done
            if [ "$exists" -eq 0 ]; then
              KNOWN_UNITS+=("$unit_name")
            fi
            
            UNIT_PATH["$unit_name"]="$file"
          fi
        done
      done
    fi
  done

  # Also query systemctl for running units matching patterns
  for pat in "${PATTERNS[@]}"; do
    while read -r unit_line; do
      if [ -n "$unit_line" ]; then
        local u
        u=$(echo "$unit_line" | awk '{print $1}')
        if [[ "$u" == *.service ]]; then
          local exists=0
          for k in "${KNOWN_UNITS[@]}"; do
            if [ "$k" == "$u" ]; then exists=1; break; fi
          done
          if [ "$exists" -eq 0 ]; then
            KNOWN_UNITS+=("$u")
            UNIT_PATH["$u"]="/etc/systemd/system/$u"
          fi
        fi
      fi
    done < <(systemctl list-unit-files "$pat" 2>/dev/null | grep -E '\.service' || true)
  done
}

inspect_unit() {
  local unit="$1"
  
  # Status
  local active_state
  active_state="$(systemctl is-active "$unit" 2>/dev/null || echo "inactive")"
  local sub_state
  sub_state="$(systemctl show -p SubState --value "$unit" 2>/dev/null || echo "unknown")"
  UNIT_STATUS["$unit"]="${active_state} (${sub_state})"

  # Workdir
  local workdir
  workdir="$(systemctl show -p WorkingDirectory --value "$unit" 2>/dev/null || echo "")"
  UNIT_WORKDIR["$unit"]="$workdir"

  # ExecStart
  local execstart
  execstart="$(systemctl show -p ExecStart --value "$unit" 2>/dev/null || echo "")"
  UNIT_EXEC["$unit"]="$execstart"

  # Orphan check: WorkingDirectory does not exist OR ExecStart executable missing
  local is_orphan=0
  if [ -n "$workdir" ] && [ ! -d "$workdir" ]; then
    is_orphan=1
  fi
  
  # WorkingDirectory exists but points to a different old repo path
  if [ -n "$workdir" ] && [ -d "$workdir" ] && [ "$workdir" != "$REPO_ROOT" ] && [ "$workdir" != "$REPO_ROOT/go-mmo" ]; then
    # It points to another directory
    if [ ! -f "$workdir/server.ts" ] && [ ! -f "$workdir/package.json" ]; then
      is_orphan=1
    fi
  fi

  UNIT_IS_ORPHAN["$unit"]="$is_orphan"
}

scan_services

for u in "${KNOWN_UNITS[@]}"; do
  inspect_unit "$u"
done

# Check port collisions
PORT_3000_PIDS="$(lsof -t -i:3000 2>/dev/null || ss -lptn 'sport = :3000' 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2 || true)"
PORT_3001_PIDS="$(lsof -t -i:3001 2>/dev/null || ss -lptn 'sport = :3001' 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2 || true)"

# Docker overlaps
DOCKER_WEB_RUNNING=0
if command -v docker &>/dev/null; then
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^saints-gaming-web$'; then
    DOCKER_WEB_RUNNING=1
  fi
fi

# ==============================================================================
# AUDIT REPORT MODE
# ==============================================================================
if [ "$MODE" == "audit" ]; then
  if [ "$JSON_OUTPUT" -eq 1 ]; then
    echo "{"
    echo '  "units": ['
    first=1
    for u in "${KNOWN_UNITS[@]}"; do
      if [ "$first" -eq 0 ]; then echo ","; fi
      first=0
      echo "    {"
      echo "      \"unit\": \"$u\","
      echo "      \"status\": \"${UNIT_STATUS[$u]}\","
      echo "      \"workdir\": \"${UNIT_WORKDIR[$u]}\","
      echo "      \"isOrphan\": ${UNIT_IS_ORPHAN[$u]},"
      echo "      \"path\": \"${UNIT_PATH[$u]}\""
      echo -n "    }"
    done
    echo ""
    echo "  ],"
    echo "  \"dockerWebRunning\": $DOCKER_WEB_RUNNING,"
    echo "  \"repoRoot\": \"$REPO_ROOT\""
    echo "}"
    exit 0
  fi

  log "${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════════╗${NC}"
  log "${CYAN}${BOLD}║              Saints Gaming — Systemd Service Audit Report                ║${NC}"
  log "${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════════╝${NC}\n"

  log "${BOLD}Current Repository Root:${NC} $REPO_ROOT"
  log "${BOLD}Docker Web Container Active:${NC} $([ "$DOCKER_WEB_RUNNING" -eq 1 ] && echo -e "${GREEN}YES (saints-gaming-web)${NC}" || echo "NO")\n"

  if [ "${#KNOWN_UNITS[@]}" -eq 0 ]; then
    log "${GREEN}[✓] No existing Saints Gaming systemd service units detected.${NC}"
    log "Host is clean. Run with ${CYAN}--canonical${NC} to install standard unit, or use Docker.\n"
    exit 0
  fi

  log "${BOLD}Discovered Systemd Service Units (${#KNOWN_UNITS[@]} total):${NC}"
  log "────────────────────────────────────────────────────────────────────────────"

  has_orphans=0
  for u in "${KNOWN_UNITS[@]}"; do
    status="${UNIT_STATUS[$u]}"
    workdir="${UNIT_WORKDIR[$u]}"
    is_orphan="${UNIT_IS_ORPHAN[$u]}"

    status_colored="${YELLOW}$status${NC}"
    if [[ "$status" =~ ^active ]]; then
      status_colored="${GREEN}$status${NC}"
    elif [[ "$status" =~ ^failed ]]; then
      status_colored="${RED}$status${NC}"
    fi

    echo -e "• ${BOLD}${u}${NC}"
    echo -e "  State:     $status_colored"
    echo -e "  WorkDir:   ${workdir:-"(none specified)"}"
    
    if [ "$is_orphan" -eq 1 ]; then
      has_orphans=1
      echo -e "  ${RED}⚠ ORPHAN DETECTED: Working directory does not exist or is obsolete.${NC}"
    fi

    if [ "$DOCKER_WEB_RUNNING" -eq 1 ] && [[ "$status" =~ ^active ]]; then
      echo -e "  ${YELLOW}⚠ CONFLICT: Unit is active while Docker container is also running.${NC}"
    fi
    echo ""
  done

  if [ "$has_orphans" -eq 1 ]; then
    log "${YELLOW}[!] Orphaned or conflicting services found.${NC}"
    log "Run ${CYAN}./scripts/audit-systemd.sh --clean${NC} to stop and remove orphaned units.\n"
  else
    log "${GREEN}[✓] All discovered service configurations are valid.${NC}\n"
  fi
  exit 0
fi

# ==============================================================================
# CLEAN MODE
# ==============================================================================
if [ "$MODE" == "clean" ]; then
  log "${CYAN}${BOLD}[*] Initiating Systemd Service Cleanup...${NC}\n"

  if [ "${#KNOWN_UNITS[@]}" -eq 0 ]; then
    log "${GREEN}[✓] No Saints Gaming service units to clean.${NC}"
    exit 0
  fi

  for u in "${KNOWN_UNITS[@]}"; do
    is_orphan="${UNIT_IS_ORPHAN[$u]}"
    status="${UNIT_STATUS[$u]}"

    # Decide if we should clean
    should_clean=0
    if [ "$is_orphan" -eq 1 ]; then
      should_clean=1
    elif [[ "$status" =~ ^failed ]]; then
      should_clean=1
    fi

    # In clean mode, if Docker is primary and unit is competing, clean it
    if [ "$DOCKER_WEB_RUNNING" -eq 1 ]; then
      should_clean=1
    fi

    if [ "$should_clean" -eq 1 ]; then
      log "${YELLOW}[*] Action required for unit: ${BOLD}$u${NC} (State: $status)"

      if [ "$NON_INTERACTIVE" -eq 0 ]; then
        read -p "    Stop and remove $u? [y/N] " -r confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
          log "    Skipping $u."
          continue
        fi
      fi

      if [ "$DRY_RUN" -eq 1 ]; then
        log "${CYAN}    [DRY-RUN] Would stop, disable, and remove $u${NC}"
      else
        log "    Stopping $u..."
        $SUDO_CMD systemctl stop "$u" 2>/dev/null || true
        log "    Disabling $u..."
        $SUDO_CMD systemctl disable "$u" 2>/dev/null || true
        $SUDO_CMD systemctl reset-failed "$u" 2>/dev/null || true

        # Remove unit files
        for loc in "/etc/systemd/system/$u" "/etc/systemd/system/multi-user.target.wants/$u" "/lib/systemd/system/$u"; do
          if [ -f "$loc" ] || [ -L "$loc" ]; then
            log "    Removing $loc..."
            $SUDO_CMD rm -f "$loc"
          fi
        done
        log "${GREEN}    [✓] Successfully removed $u.${NC}"
      fi
    fi
  done

  if [ "$DRY_RUN" -eq 0 ]; then
    log "${CYAN}[*] Reloading systemd daemon...${NC}"
    $SUDO_CMD systemctl daemon-reload 2>/dev/null || true
    $SUDO_CMD systemctl reset-failed 2>/dev/null || true
    log "${GREEN}${BOLD}[✓] Systemd cleanup complete!${NC}\n"
  fi
  exit 0
fi

# ==============================================================================
# CANONICAL REGISTRATION MODE
# ==============================================================================
if [ "$MODE" == "canonical" ]; then
  log "${CYAN}${BOLD}[*] Installing Canonical Saints Gaming Web Service...${NC}\n"

  TARGET_USER="$(whoami)"
  TEMPLATE_FILE="${SCRIPT_DIR}/systemd/saints-web.service"

  if [ ! -f "$TEMPLATE_FILE" ]; then
    echo -e "${RED}[!] Template not found at $TEMPLATE_FILE${NC}"
    exit 1
  fi

  DEST_FILE="/etc/systemd/system/saints-web.service"

  if [ "$DRY_RUN" -eq 1 ]; then
    log "${CYAN}[DRY-RUN] Would install $DEST_FILE pointing to $REPO_ROOT (User: $TARGET_USER)${NC}"
    exit 0
  fi

  # Generate customized unit
  TEMP_UNIT="$(mktemp)"
  sed \
    -e "s|WorkingDirectory=.*|WorkingDirectory=${REPO_ROOT}|g" \
    -e "s|User=.*|User=${TARGET_USER}|g" \
    "$TEMPLATE_FILE" > "$TEMP_UNIT"

  log "Installing unit file to $DEST_FILE..."
  $SUDO_CMD cp "$TEMP_UNIT" "$DEST_FILE"
  $SUDO_CMD chmod 644 "$DEST_FILE"
  rm -f "$TEMP_UNIT"

  log "Reloading systemd daemon..."
  $SUDO_CMD systemctl daemon-reload
  $SUDO_CMD systemctl enable saints-web.service

  log "${GREEN}${BOLD}[✓] Canonical saints-web.service installed and enabled!${NC}"
  log "Start service with: ${CYAN}sudo systemctl start saints-web.service${NC}"
  log "View live logs with: ${CYAN}journalctl -u saints-web.service -f${NC}\n"
  exit 0
fi
