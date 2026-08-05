#!/usr/bin/env bash
# Do not use `set -e` here: `whiptail` exits non-zero when users press Esc/cancel
# which should not terminate the whole UI flow.
set -uo pipefail

# Manage extra reverse_proxy subdomain blocks in /etc/caddy/Caddyfile.
# We only rewrite the section between BEGIN/END markers so we never clobber
# the primary site block that `scripts/setup.sh` generates.

CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"
BEGIN_MARK="${BEGIN_MARK:-# SAINTS_PROXY_LIST_BEGIN}"
END_MARK="${END_MARK:-# SAINTS_PROXY_LIST_END}"

SUDO=""
if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  SUDO="sudo"
fi

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

  if has_whiptail; then
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
    return 0
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
  $SUDO awk -v begin="$BEGIN_MARK" -v end="$END_MARK" '
    $0 ~ begin { managed=1; next }
    $0 ~ end { managed=0 }
    managed==1 {
      # Expected block:
      #   subdomain {
      #     reverse_proxy host:port
      #   }
      if (match($0, /^[[:space:]]*([A-Za-z0-9._-]+)[[:space:]]*\{[[:space:]]*$/, m)) {
        domain=m[1]
        next
      }
      if (domain != "" && match($0, /^[[:space:]]*reverse_proxy[[:space:]]+([^[:space:]]+)[[:space:]]*$/, m)) {
        printf("%s -> %s\n", domain, m[1])
        domain=""
      }
    }
  ' "$CADDYFILE"
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

  $SUDO awk -v begin="$BEGIN_MARK" -v end="$END_MARK" -v targetDomain="$subdomain" -v targetUpstream="$upstream" '
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
      if (match($0, /^[[:space:]]*([A-Za-z0-9._-]+)[[:space:]]*\{[[:space:]]*$/, m)) {
        capDomain=m[1]
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
  ' "$CADDYFILE" > "$tmp"

  $SUDO cp "$tmp" "$CADDYFILE"
  rm -f "$tmp"
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

  $SUDO awk -v begin="$BEGIN_MARK" -v end="$END_MARK" -v targetDomain="$subdomain" '
    $0 ~ begin { managed=1; print; next }
    $0 ~ end { managed=0; print; next }
    managed!=1 { print; next }

    # Skip the entire block matching targetDomain; preserve all other blocks.
    cap==0 && match($0, /^[[:space:]]*([A-Za-z0-9._-]+)[[:space:]]*\{[[:space:]]*$/, m) {
      cap=1
      capDomain=m[1]
      capText=""
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
  ' "$CADDYFILE" > "$tmp"

  $SUDO cp "$tmp" "$CADDYFILE"
  rm -f "$tmp"
}

reload_caddy() {
  if command -v systemctl >/dev/null 2>&1; then
    $SUDO systemctl reload caddy || $SUDO systemctl restart caddy
    return 0
  fi
  # Fallback: try caddy directly.
  $SUDO caddy reload --config "$CADDYFILE" || $SUDO caddy restart --config "$CADDYFILE"
}

main() {
  local cmd="${1:-}"
  case "$cmd" in
    list)
      list_proxies
      ;;
    add)
      # add <subdomain> <host> <port>
      # add <subdomain> <host:port>
      if [[ "${2:-}" == "" || "${3:-}" == "" ]]; then
        usage
        exit 1
      fi
      if [[ "${4:-}" != "" ]]; then
        add_proxy "$2" "$3" "$4"
      else
        add_proxy "$2" "$3"
      fi
      ;;
    remove)
      remove_proxy "${2:-}"
      ;;
    reload)
      reload_caddy
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

