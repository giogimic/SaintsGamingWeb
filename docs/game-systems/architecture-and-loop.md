# 🏗️ Client Architecture & Core Game Loop

This document outlines how the **Saints Gaming** client operates, how the rendering pipeline communicates with React, and how the game loop synchronizes with the server.

---

## 1. High-Level Architecture Overview

Saints Gaming uses a **hybrid decoupling architecture**:
- **WebGL 2.5D Renderer (Babylon.js):** Runs on a dedicated `<canvas>` element inside `BabylonEngine.ts`. It manages meshes, textures, sprite animation projection, camera framing, orthographic projection, and particle effects.
- **UI & HUD Overlay (React 19 / Next.js):** Sits on top of the canvas with `pointer-events-none` on parent containers and `pointer-events-auto` on interactive windows. React handles menus, hotbars, dialogs, health overlays, chat, and modal windows.
- **Zustand Game State Stores:** Client state is synchronized through reactive Zustand stores (`src/web/components/the-lobby/store.ts` and `src/web/components/the-lobby/editor/editor-store.ts`), preventing unnecessary React re-renders for high-frequency game ticks.

```
┌──────────────────────────────────────────────────────────┐
│                   React 19 UI Layer                      │
│   (Hotbar, Chat, MiniMap, Dialogs, Overlays, Docks)      │
└────────────────────────────┬─────────────────────────────┘
                             │ Events & Actions
┌────────────────────────────▼─────────────────────────────┐
│                 Zustand Client Store                     │
│   (Inventory, Skills, Target, Shard, Peers, Quests)      │
└────────────────────────────┬─────────────────────────────┘
                             │ Frame Sync
┌────────────────────────────▼─────────────────────────────┐
│             Babylon.js 2.5D Game Canvas                  │
│   (Orthographic Camera, Sprite Meshes, Tile Batches)     │
└────────────────────────────┬─────────────────────────────┘
                             │ Sockets (Binary / JSON)
┌────────────────────────────▼─────────────────────────────┐
│          Go MMO Realtime Backend (:3001)                 │
└──────────────────────────────────────────────────────────┘
```

---

## 2. 2.5D Orthographic Rendering

The game renders characters and tiles in an orthographic 2.5D projection:
- **Camera Configuration:** An `ArcRotateCamera` locked at an isometric tilt (`alpha = -Math.PI / 2`, `beta = Math.PI / 3.2`) with `mode = Camera.ORTHOGRAPHIC_CAMERA`.
- **Sprite Projection:** 4-directional sprite sheets (LPC / Tuxemon standard 96×128px frames) are projected onto billboarded planes or quads with depth offsets to prevent Z-fighting.
- **Tile Batching:** Map tiles are batched into multi-cell chunk meshes (`tileset_mesh_*`) to drastically reduce draw calls and maintain 60 FPS even on large maps.

---

## 3. The Core Game Loop

The game loop strictly adheres to modern browser standards:
- Driven exclusively by **`requestAnimationFrame`** (never `setInterval`).
- Calculates `deltaTime` on every frame to ensure framerate-independent character velocity and animations.
- **Client-Side Prediction:** Local player movement responds immediately to WASD / Arrow keys or touch joystick inputs, with velocity smoothing.
- **Server Reconciliation:** Incoming server position packets correct drift without snapping, applying smooth interpolation (`lerp`) toward authoritative coordinates.

---

## 4. Entity Lifecycle & Scene Management

- **Entity Spawning:** When an entity (peer player, NPC, or roaming monster) enters the player's Area of Interest (AOI), the client constructs its sprite plane, animates its walk cycle, and attaches overhead nametag / health bar billboards.
- **Entity Despawning:** When an entity leaves the shard or AOI boundary, its mesh and textures are cleanly disposed of to prevent memory leaks.
- **Map Switching:** Map transitions invoke `mapLoader.ts`, clearing existing tile chunk meshes, resetting the collision grid, and fetching map documents dynamically via `/api/maps?id=...`.
