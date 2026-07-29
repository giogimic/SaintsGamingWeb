# Current State & TODOs

## What we just did (v2.1.60):
1. **Committed Phase 1:** Pushed Title Screen, Login, and Server Select UI overlays.
2. **Implemented Phase 2 (Server-Authoritative Physics & Collision):**
   - Created `lib/game/map-loader.js` — a Prisma-backed map loader that reads collision grids and logic tiles from the database, caches them in memory, and exposes `isWalkable()` for O(1) collision checks.
   - Rewrote `game-server.js` — replaced client-trusted `move` events with `move_intent` (direction + sequence number). Added a 15 TPS server tick loop that validates moves against the collision grid, sends `move_ack` for valid moves and `position_correction` for invalid ones.
   - Updated `store.ts` — added `moveSequence`, `pendingMoves` buffer, and `applyServerCorrection()` for client-side prediction and reconciliation.
   - Updated `GameCanvasBabylon.tsx` — client now sends `move_intent` instead of raw coordinates, tracks pending moves with sequence numbers, and uses 100ms smooth-step interpolation for rendering other players.
   - Updated `index.tsx` — added `move_ack` and `position_correction` socket listeners for server reconciliation.
3. **Version Bump:** Bumped to `2.1.60` across all 5 files.
4. **Verified Build:** `npx tsc --noEmit` passed with zero errors.

## What needs doing next:
1. **Commit and Push Phase 2:** Run `git add .`, `git commit`, `git push`.
2. **Deploy & Test:** Restart the game server on the production VPS and test:
   - Walk into walls — server should prevent passage.
   - Open browser dev tools and try to emit raw coordinates — server should reject/rubber-band.
   - Open two browser tabs and verify smooth interpolated movement of other players.
3. **Move to Phase 3 (Spatial Partitioning & Binary Packing):**
   - Implement grid-based spatial hashing so the server only broadcasts to nearby players.
   - Replace JSON over WebSocket with Protocol Buffers or ArrayBuffer packing for 80%+ bandwidth savings.
   - Add Redis Pub/Sub for cross-server communication (global chat, server transfers).
4. **Continue following the Implementation Plan:** Reference `implementation_plan.md`.
