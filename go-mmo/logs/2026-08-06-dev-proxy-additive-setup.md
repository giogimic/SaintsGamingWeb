# 2026-08-06 — Additive `dev-proxy` + conflict-safe setup

**Branch:** `giogimic/dev-proxy-additive-setup-32fb`

## Goal

Option A: subdomain-only CLI for future / parallel servers on a host that
already has Saints + Caddy. Setup must **ask** when something is already
running, and behind-proxy installs must **not** conflict with the primary
(no Caddyfile primary rewrite, unique container names).

## Stash note

`stash@{0}` on this machine is **unrelated** WIP (studio camera / map logic +
a deletion of `proxy-caddy.sh`). Left untouched — do not apply for this work.

## Delivered

| Piece | Behavior |
|-------|----------|
| `scripts/dev-proxy.sh` | Additive only: `list` / `add` / `remove` / `reload` / `status` / `ask`. Refuses to install Caddy. Rerun = upsert. |
| `scripts/setup.sh` | Detects Caddy/containers; menu: subdomain-only / continue with unique names / abort / kill. Behind existing Caddy → `dev-proxy add`. Container names `saints-gaming-web` → `…1`/`…2`… |
| `go-mmo/scripts/setup-go-mmo.sh` | Same detect+ask; `--proxy-only` mode; uses `dev-proxy` for Caddy; unique go-mmo container names; free port bump |

## Verify

```bash
./scripts/dev-proxy.sh status
./scripts/dev-proxy.sh add go.example.com 3001 --dry-run
./go-mmo/scripts/setup-go-mmo.sh --proxy-only
```

## Extra fix

`proxy-caddy.sh` only uses sudo for Caddyfile I/O when the file is not
writable (avoids Windows/`sudo` swallowing awk stdout and writing empty
files). Service reload still uses sudo when not root. Add/remove now
propagate failures.