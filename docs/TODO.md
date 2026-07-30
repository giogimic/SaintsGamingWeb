# Current State & TODOs

## What we just did (v2.1.62):
1. **Updated AGENTS.md Guidelines:** Appended new strict rules for AI pitfall prevention, gaming component best practices (like using `requestAnimationFrame` and `useRef`), and social media feed architectures.
2. **Fixed GameChat Visibility:** Removed `absolute bottom-4 left-4` styling from `GameChat.tsx` so it naturally anchors properly inside its `DraggablePanel`.
3. **Refactored WASD Movement:** Replaced throttled `keydown` listeners in `GameCanvasBabylon.tsx` with a proper `requestAnimationFrame` polling loop, resolving jagged movement and dropped inputs.
4. **Resolved UI Scaling Distortions:** Removed explicit `style={{ zoom: uiScale }}` attributes in `index.tsx`, fixing severe distortions of child menus and overlays.
5. **Version Bump:** Bumped to `2.1.62` across all core files.
6. **Verified Build:** `npx tsc --noEmit` passed with zero errors.

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
