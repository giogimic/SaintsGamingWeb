# AGENTS.md

## Cursor Cloud specific instructions

Saints Gaming is a single Next.js 15 / React 19 full-stack app (community platform + embedded 2.5D MMO). A custom `server.ts` runs Next.js + Socket.io + the MMO `GameEngine` together on one port. Standard dev/lint/test/build commands live in `package.json`; local setup is documented in `docs/developer-guide/installation.md`.

The startup update script already runs `npm install` and `npm run setup` (Prisma generate + `prisma db push` against SQLite at `prisma/db/dev.db`). You do not need to reinstall or re-push the schema on a fresh VM.

### Running the app
- Dev: `npm run dev` — this runs `server.ts`, wiring Next.js + Socket.io + the MMO GameEngine on port 3000. Do NOT use `npm start` for end-to-end work; plain `next start` skips the custom server, so sockets and the MMO engine won't run.
- Lint / test / build / smoke: `npm run lint`, `npm test` (Vitest), `npm run build`, `npm run smoke` (smoke needs a dev server already running; it also honors `PORT` / `BASE_URL`).

### Non-obvious gotchas
- Heavy routes compile on demand in dev. The first request to `/lobby` (Babylon.js) can take >20s to compile and will exceed the smoke script's 20s per-request curl timeout on a cold server. Warm it once (`curl --max-time 120 http://localhost:3000/lobby`) before running `npm run smoke`, or expect the first `/lobby` check to need a retry. Subsequent requests are fast.
- `.env` is gitignored. `npm run setup` copies `.env.example` → `.env` only if it's missing. The example ships placeholder values (`NEXT_PUBLIC_SITE_URL=https://yourdomain.com`, a placeholder `AUTH_SECRET`) which still run for local dev because `AUTH_TRUST_HOST=true`. For a cleaner local session set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` and a real `AUTH_SECRET` (`openssl rand -base64 32`).
- Optional demo/forum content: `npx tsx prisma/seed.ts`. It skips news/threads when no users exist yet (it needs an author), so register a user first if you want seeded threads. Game/world demo content is bootstrapped automatically on server start (`DemoBootstrap`).
- Studio Asset Manager / Sprite Browser read `GameAsset` via `/api/assets` (not Prisma in the browser). If the table is empty **or** walk previews lack frames, re-seed: `npx tsx scripts/seed-game-assets-from-public.ts` (idempotent; NPC 48×128 sheets get `metadata.frames`). Use Sprite Browser **Load more** when totals exceed 50. `AssetManager.getAsset(id)` hits `GET /api/assets/[id]`.
- Studio Quest dock assigns via `POST /api/npc-dialogue` with `questSlug` (merges `ACCEPT_QUEST` into `NpcDialogueTree`). `DialogueManager` caches trees in the game process — after assigning a quest in Studio, restart `npm run dev` / `server.ts` if that NPC was already interacted with in the same session, or the old tree may still be served.
- Website ↔ game inventory (ALIGNMENT E.2): cold bag is `PlayerInventoryItem` (keyed by User id). Profile Inventory tab and `purchaseGtcListing` / `createGtcListing` in `app/actions/gtc.ts` mutate that table. Lobby pushes `inventory_sync` on `map_joined` via `playerInventorySyncRequest` — web buys appear after re-entering the lobby (no live socket required for the purchase itself).
- Remarkable TB captures (ALIGNMENT E.3): server sets `battle_ended.capture.isRemarkable`; lobby client calls existing `createSocialPost`. Gate is `isRemarkableCapture` in `src/shared/game/remarkableCapture.ts` (rare tags / evolved stage / low catchRate / first-of-species) — do not invent a separate rarity table.
- Demo bramble (CONTINUE #2): clearing is **per-account**. Shared `DEMO_SANDBOX` grid stays tile `11` so other accounts/shards can still run Q4. Clearer gets personal `tile_changed` + walk override; Q4 `COMPLETED` re-hydrates the gate on join via `playerBrambleHydrateRequest`. Do not reintroduce `clearBrambleAt` shared-grid/DB mutation.
- Turn-based battle UI: mount **only** `TurnBattleOverlay` in `BATTLE` (film_standard / EXPOSE FILM). Do not re-add legacy `BattleOverlay` alongside it — that stacked CRYSTAL + FILM controls.
- Studio (`/studio`): entry is **Walk Mode** (`isCreationMode: false`); Build/NPC/Quest/Creature are opt-in via mode strip or Ctrl+E. Map Save (`POST /api/maps/[slug]`) runs `validateMapSave` (walkable spawn, known logic tile ids, NPC bounds/solidity) — expect HTTP 400 with `error` text on reject.
- Studio dock layout persists in `localStorage` key `sg.studio.panelLayout.v1` (position/size/collapse only). Walk Mode still closes docks; re-entering a mode uses mode presets for `isOpen`. Do not persist `isOpen` across Walk or you fight the Walk-default rule.
- All external integrations (Discord OAuth, Redis, S3, Resend, Gemini/Ollama, Twitch, FiveM) are optional and degrade gracefully; credentials login and SQLite work with no extra services.
