# Proxy Caddy manager script

Date: 2026-08-05

## Goal
Add a script to manage the extra everse_proxy subdomain blocks inside the Caddyfile that scripts/setup.sh configures.

## Implementation plan
- Add scripts/proxy-caddy.sh.
- Script maintains entries between markers inside /etc/caddy/Caddyfile:
  - # SAINTS_PROXY_LIST_BEGIN
  - # SAINTS_PROXY_LIST_END
- Commands:
  - list
  - dd <subdomain> <upstream_host> <upstream_port> (or <upstream_host:port>)
  - emove <subdomain>
  - eload

## Notes
- Keeps the rest of the Caddyfile untouched (only rewrites the marked section).

## Status
- Added `scripts/proxy-caddy.sh` (marker-managed proxy section).
- The section is only rewritten between `# SAINTS_PROXY_LIST_BEGIN` and `# SAINTS_PROXY_LIST_END`.
\n- Updated scripts/proxy-caddy.sh with ui interactive mode (whiptail when available, plain menu otherwise).

- Enhanced UI: whiptail textbox for list, remove uses a selectable menu, and add/remove now reload Caddy immediately.

- Fixed wk syntax errors on Debian by renaming the internal awk state variable from in to managed (some awk treat in as reserved).

- UI fix: removed set -e so dismissing whiptail dialogs (Esc/cancel) doesn’t exit the menu.
\n- UI fix: only use whiptail when stdin/stdout are TTYs; if whiptail returns empty (render failure), fall back to plain menu.
\n- UI/script fix: removed 3-arg awk match with capture array (match(..., regex, m)) for Debian compatibility; domain/upstream extracted with gsub.

- Safety hardening: add/remove now abort on awk transform failure and refuse to write empty output; automatic timestamped Caddyfile backup before any write.
