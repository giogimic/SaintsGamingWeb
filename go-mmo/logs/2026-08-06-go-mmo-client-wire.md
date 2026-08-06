# 2026-08-06 — Go MMO client wire (lobby + Studio)

**Branch:** `giogimic/go-mmo-client-wire-32fb` → `main`

## Studio still works?

**Yes.** Map CRUD stays on Next `/api/maps`. Live sync to Go after save via
`admin_save_map` when `NEXT_PUBLIC_GO_MMO_URL` is set. NPC spawn sockets hit Go.
Forum realtime stays on Next.

## Changes

| File | Change |
|------|--------|
| `src/shared/net/goMmoSocket.ts` | Resolve Go URL + lobby `io()` options |
| `src/web/components/the-lobby/index.tsx` | Connect lobby socket to Go when env set |
| `WorldBuilderPanel.tsx` | After HTTP save → `admin_save_map` (Go) or `admin_reload_map` (TS) |
| `.env.example` / setup-go-mmo | Document + upsert `NEXT_PUBLIC_GO_MMO_URL` |
| `info/CONTINUE.md`, READMEs | Mark Go on main |

## Enable locally

```bash
NEXT_PUBLIC_GO_MMO_URL=http://127.0.0.1:3001
./go-mmo/scripts/setup-go-mmo.sh
./go-mmo/bin/go-mmo
# restart Next
```
