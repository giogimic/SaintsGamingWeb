# Saints Gaming — Active Agent Handover & TODO

**PURPOSE:** This is a living private document within `.docs/` used to track exact agent progress, maintain context across quota/service interruptions, and outline upcoming development phases. 
**RULE:** Every agent session MUST update the "Current Handover Context" before signing off.

---

## 🔄 Current Handover Context (Updated: 2026-09-10)
- **Where we left off:** The previous agent session fixed a massive port conflict in `update.sh` and `setup.sh` that was preventing the Go MMO backend from binding to port 3001. The Next.js frontend is now correctly routing to `the-lobby` backend. The UI scale bug (white dot projection) and the `absolute` position styling bugs in the HUD have all been patched.
- **Immediate Next Step:** The user is ready to begin **Phase 7: Multi-Noise Procedural Generation** inside the Go MMO backend (`the-lobby/`).
- **Known Quirks / Reminders:** 
  - Ensure the Go backend uses `github.com/zishang520/socket.io/v2/socket` for all realtime streaming.
  - Never use `setInterval` for the game loop; rely on Go ticker / requestAnimationFrame for client.
  - The live production server relies heavily on `update.sh` and `.gitignore` configurations for docker deployments.

---

## 🚀 Active Phase: Phase 7 — World Generation & MMO Backend

### 1. Multi-Noise Procedural Generation (Go Server)
- [ ] Implement multi-noise procedural generator in `the-lobby` (Go MMO Backend).
- [ ] Implement Biome Blending using the 4-axis noise system: Temperature, Humidity, Continentalness, Weirdness.
- [ ] Implement Voxel Density caching and chunk streaming over Socket.IO.
- [ ] Hook up client-side terrain mesh generator to ingest the new binary stream format.

### 2. 27-Skill Matrix Integration
- [ ] Implement end-to-end wiring of skill XP gains.
- [ ] Add authoritative backend validation for skill actions.
- [ ] Add client-side visual feedback for skill progression and level-ups.

---

## 🛠️ Technical Debt & Client Cleanup

### Client Optimizations
- [ ] **Binary Movement Optimization**: Reduce payload size for high-frequency player coordinates.
- [ ] **Greedy Meshing**: Optimize Babylon.js chunk mesh generation to drastically reduce draw calls.

### UI / HUD
- [ ] **Party System UI**: Implement the decoupled Party overlay in the new GameUI architecture.
- [ ] **Loot Drop Spawning**: Add visual UI and 3D drops for monster loot.

---

## ✅ Recently Completed
- [x] **HUD Architecture Repair**: Fixed the `absolute` positioning regressions in the decoupled HUD components (MiniMap, Hotbar, Player Stats).
- [x] **Camera System**: Fixed orthographic projection scaling bug (white dot issue) by querying physical render dimensions instead of CSS styles.
- [x] **Docs Consolidation**: Cleaned out `.docs/` and merged Atlas Architecture, Glossary, and Elemental Combat Matrix into `Saints_Gaming_Bible.md`.
- [x] **Deployment Stability**: Fixed port collision logic in `update.sh` and `setup.sh` between `WEB_PORT` and `GO_MMO_PORT`.
