# Production empty maps after #43 (2026-08-06)

## Status

**On `main`.** PR **#43** put sockets live; this change heals empty WorldMap via API lazy ensure.

## Cause

Custom `server.ts` is running (sockets OK), but **WorldMap rows were never written** —
boot `DemoBootstrap` either skipped or failed silently (`seed skipped:` warn).
Studio and lobby share `loadMap` → same empty DB = “completely broken.”

## Fix (this PR)

| Change | Why |
| :--- | :--- |
| `ensureStudioMapFoundation()` exported from `DemoBootstrap` | Shared heal for boot + API |
| `GET /api/maps` when `count===0` → ensure + re-list | Lazy seed on first picker hit |
| `GET /api/maps/DEMO_SANDBOX` miss → ensure + retry | Lobby/Studio first paint |
| `POST /api/maps/[slug]` seeds logic tiles if catalog empty | Create Map no longer 400/500 on empty defs |
| POST 500 includes `details: [message]` | Debuggable create failures |
| `loadMap` inflight dedupe + 8s fail cooldown | Stop thousand-line 404 console storms |

## After redeploy

```bash
curl -sS https://saintsgaming.net/api/maps | head
# expect DEMO_SANDBOX, count >= 1

curl -sS -o /dev/null -w '%{http_code}\n' \
  https://saintsgaming.net/api/maps/DEMO_SANDBOX
# 200
```

Hard-refresh `/studio` and `/lobby`.
