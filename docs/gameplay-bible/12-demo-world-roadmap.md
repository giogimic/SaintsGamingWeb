# Saints Gaming — The Demo World Vertical Slice Roadmap (12.txt)

This document translates the complete Saints Gaming blueprint (Docs 1-11) into a strict, actionable implementation roadmap. The goal is to build a "Vertical Slice" — a fully playable Demo World that proves out every core engine system before we scale up content.

---

# Phase 1: Core MMO Engine (Completed)
- [x] Integrate Babylon.js 2.5D rendering pipeline.
- [x] Build the unified `BabylonEngine.ts` for sprite management and interpolation.
- [x] Set up Zustand state management (`store.ts`) for hotbars and inventory.
- [x] Build the Character Creator and Lobby UI overlay.

# Phase 2: Movement & World Simulation (Completed)
- [x] Implement smooth, server-authoritative WASD / Click-to-move interpolation.
- [x] Implement strict logic grid and NPC collision (`WorldSimulation.tryMove`).
- [x] Implement World Interactions (Facing directions, pressing 'E' to harvest/talk).
- [x] Implement Camera Smooth Tracking tied to the physical player mesh.

# Phase 3: The Real-Time MMO Combat Foundation (In Progress)
- [x] Build the Real-Time Hotbar UI (Slots 1-9) with GCD (Global Cooldown) sweeps.
- [x] Implement Entity Targeting via Pointer clicks and the Target Frame UI.
- [x] Strip capture mechanics out of the Real-Time hotbar (Correction applied).
- [ ] **NEXT:** Implement Server-Side Combat Math (Damage calculations, Miss/Crit rolls).
- [ ] **NEXT:** Implement Health Bars above dynamic map entities.
- [ ] **NEXT:** Implement Projectile FX (Fireballs, Arrows) flying across the 2.5D canvas.
- [ ] **NEXT:** Implement Loot Drops (Entities drop a bag of loot on the ground upon defeat).

# Phase 4: The Turn-Based Creature Engine (Upcoming)
- [ ] **Triggering:** Implement the `ENCOUNTER` logic tile step-action to transition `gameMode` to `'BATTLE'`.
- [ ] **The UI:** Build the classic split-screen Turn-Based UI overlay (React/Tailwind).
- [ ] **The State Machine:** Build the 4-phase server battle loop (Waiting -> Resolution -> Capture -> End).
- [ ] **The Math:** Implement the specific ARPG Damage formula and Elemental Modifiers.
- [ ] **Capturing:** Build the Binding Crystal throwing logic, Capture Math (RNG 0-255), and Database insertion (`PlayerCreature`).

# Phase 5: Persistence, Networking, & Creator Tools
- [ ] **Socket.io Integration:** Fully deploy the WebSocket server to sync Movement, Chat, and Combat across multiple clients.
- [ ] **Prisma Sync:** Implement periodic Hot-State to Cold-State database flushing.
- [ ] **The Dev Editor (v1):** Expose a UI panel to paint collision blocks (Red = Solid, Green = Encounter) directly onto the grid and save to the database.

---

# Execution Protocol

To achieve this roadmap, developers must adhere to the following rules:
1. **No Placeholders:** If a system is being built (e.g., Projectiles), build it correctly the first time. Do not use `setTimeout` hacks; use the actual engine render loop.
2. **Server Authority:** Do not trust the client. If the client clicks a monster to attack, the server must validate range, cooldowns, and line of sight.
3. **Editor First:** If you need to place a tree on the map to test woodcutting, do not hardcode it in `GameCanvasBabylon.tsx`. Open the Dev Editor overlay, paint the logic tile, and save the map.
