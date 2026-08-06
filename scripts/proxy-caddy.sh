#!/usr/bin/env bash
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
    /^[[:space:]]*[A-Za-z0-9._-]+[[:space:]]*\{$/ {
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

