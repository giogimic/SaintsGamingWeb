# 2026-08-06 — Setup option: Go MMO for lobby/Studio

## Goal

Make Go the **opt-in default path in `./scripts/setup.sh`** for game/Studio
realtime, since that is the destination backend. Next keeps site + `/api/maps`.

## Changes

| Piece | Behavior |
|-------|----------|
| `scripts/setup.sh` | Whiptail **Go MMO Backend** (recommended YES) → free `:3001`, optional `go.` subdomain, write `NEXT_PUBLIC_GO_MMO_URL`, run `setup-go-mmo.sh --non-interactive --docker --full` before Next build |
| `go-mmo/scripts/setup-go-mmo.sh` | New `--full` so existing Caddy does not force proxy-only in non-interactive mode |
| `docker-compose.base.yml` | Pass `NEXT_PUBLIC_GO_MMO_URL` into web container env |
| Docs | CONTINUE, AGENTS, README, installation, `.env.example`, go-mmo README |

## Verify

```bash
# On a Linux host with whiptail:
./scripts/setup.sh
# → answer YES to Go MMO; optionally add go.yourdomain
grep NEXT_PUBLIC_GO_MMO_URL .env
./scripts/dev-proxy.sh list
```
