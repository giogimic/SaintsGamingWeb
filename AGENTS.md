# AGENTS.md

## Cursor Cloud specific instructions

Saints Gaming is a single Next.js 15 / React 19 full-stack app (community platform + embedded 2.5D MMO). A custom `server.ts` runs Next.js + Socket.io + the MMO `GameEngine` together on one port. Standard dev/lint/test/build commands live in `package.json`; local setup is documented in `docs/developer-guide/installation.md`.

The startup update script already runs `npm install` and `npm run setup` (Prisma generate + `prisma db push` against SQLite at `prisma/db/dev.db`). You do not need to reinstall or re-push the schema on a fresh VM.

### Running the app
- Dev: `npm run dev` — this runs `server.ts`, wiring Next.js + Socket.io + the MMO GameEngine on port 3000. Do NOT use `npm start` for end-to-end work; plain `next start` skips the custom server, so sockets and the MMO engine won't run.
- Lint / test / build / smoke: `npm run lint`, `npm test` (Vitest), `npm run build`, `npm run smoke` (smoke needs a dev server already running; it also honors `PORT` / `BASE_URL`).

### Non-obvious gotchas
- Lobby HUD root (`src/web/components/the-lobby/index.tsx`) uses `pointer-events-none` so the Babylon canvas receives clicks. Any interactive overlay/screen mounted under that root (title, login, server select, battle, professor lab, menus, buttons) **must** set `pointer-events-auto` on its own root — otherwise mouse clicks fail while keyboard/Tab can still work.
- Studio tile paint requires **Build mode** (not Walk). Visual paint uses batched `tileset_mesh_*` plus a map pick plane / paint overlays in `BabylonEngine` — do not reintroduce pick-only-`tile_*` without world→tile fallback.
- Multiplayer peers only see each other on the **same shard** (`DEMO_SANDBOX_chN`). Joins must use the **base** map id (`toBaseMapId` / `resolvePlayableMapId`), never a raw `_chN` instance id, or players land in parallel rooms and appear alone.
- Heavy routes compile on demand in dev. The first request to `/lobby` (Babylon.js) can take >20s to compile and will exceed the smoke script's 20s per-request curl timeout on a cold server. Warm it once (`curl --max-time 120 http://localhost:3000/lobby`) before running `npm run smoke`, or expect the first `/lobby` check to need a retry. Subsequent requests are fast.
- `.env` is gitignored. `npm run setup` copies `.env.example` → `.env` only if it's missing. The example ships placeholder values (`NEXT_PUBLIC_SITE_URL=https://yourdomain.com`, a placeholder `AUTH_SECRET`) which still run for local dev because `AUTH_TRUST_HOST=true`. For a cleaner local session set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` and a real `AUTH_SECRET` (`openssl rand -base64 32`).
- Optional demo/forum content: `npx tsx prisma/seed.ts`. It skips news/threads when no users exist yet (it needs an author), so register a user first if you want seeded threads. Game/world demo content is bootstrapped automatically on server start (`DemoBootstrap`).
- All external integrations (Discord OAuth, Redis, S3, Resend, Gemini/Ollama, Twitch, FiveM) are optional and degrade gracefully; credentials login and SQLite work with no extra services.
