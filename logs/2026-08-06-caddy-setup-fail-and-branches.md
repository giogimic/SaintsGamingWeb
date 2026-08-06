# 2026-08-06 — Caddy setup failure + branch cleanup

## Go MMO on `main`?

**Yes.** Through PR #48 (`cab05ec` and earlier go-mmo commits). Includes:

| Piece | What |
|-------|------|
| Backend | `go-mmo/` scaffold + systems parity |
| Caddy `:3001` | Unique Docker names |
| Additive proxy | `scripts/dev-proxy.sh` + conflict-safe setup |
| Client wire | Lobby/Studio when `NEXT_PUBLIC_GO_MMO_URL` set |
| Prod maps | Lazy `ensureStudioMapFoundation` on `/api/maps` (cherry-picked) |

## Branches

All prior `giogimic/*` feature remotes deleted after merge except during this cleanup.
**Only `main` remains** after deleting `giogimic/prod-ensure-demo-map-api-2d3d` (content on main).

## Caddy setup failure (fix)

`scripts/proxy-caddy.sh` could refuse an empty/bad write and still exit **0**.
When the Caddyfile needed `sudo`, `sudo awk … > tmp` could swallow awk stdout.

### Fix (on main)

- Read via `sudo cat | awk` (or plain `cat`)
- Propagate `safe_write_caddyfile` failures from add/remove
- `remove` keeps opening brace lines for sibling proxy blocks
