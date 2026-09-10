# Saints Gaming — Master TODO

This is a living document tracking the current active development phases, upcoming features, and technical debt cleanup for the Saints Gaming platform.

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
