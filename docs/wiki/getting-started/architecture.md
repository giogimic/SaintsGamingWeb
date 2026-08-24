# Platform Architecture & Technology Stack

Saints Gaming combines a web community hub with an embedded 2.5D multiplayer sandbox MMO and an in-engine creator studio, powered by a high-performance decoupled architecture.

---

## 1. High-Level System Architecture

The Saints Gaming engine decouples presentation, simulation, and networking into discrete layers:

```
┌──────────────────────────────────────────────────────────┐
│                   React 19 / DaisyUI HUD                 │
│   (Menus, Hotbars, Dialogs, Radial Docks, Chat, Modals)  │
└────────────────────────────┬─────────────────────────────┘
                             │ Reactive State Actions
┌────────────────────────────▼─────────────────────────────┐
│                 Zustand Client Stores                    │
│      (store.ts, editor-store.ts, inventory, skills)      │
└────────────────────────────┬─────────────────────────────┘
                             │ Frame Render Sync
┌────────────────────────────▼─────────────────────────────┐
│             Babylon.js 2.5D WebGL Canvas                 │
│  (Orthographic Camera, Tile Batches, Sprite Billboards)  │
└────────────────────────────┬─────────────────────────────┘
                             │ Sockets (Binary / JSON)
┌────────────────────────────▼─────────────────────────────┐
│             Go MMO Realtime Backend (:3001)              │
│       (20Hz Ticks, AOI Sharding, Authoritative Grid)     │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Hybrid Dual-Server Model

The application operates across two dedicated server processes running concurrently:

| Service | Port | Primary Stack | Core Responsibilities |
| :--- | :--- | :--- | :--- |
| **Web & App Server** | `3000` | Next.js 15, React 19, Prisma | Page routes, Auth.js sessions, REST APIs, Studio map saving, forum/news feed. |
| **Realtime MMO Server** | `3001` | Go 1.22+, Gorilla WebSockets | Authoritative player movement, 20Hz ticks, AOI spatial grid, combat hit checks. |

> [!NOTE]
> During local development, the Next.js server can fallback to an internal Node.js socket server (`server.ts`) if the Go daemon is offline.

---

## 3. Decoupled UI & Rendering Pipeline

The WebGL rendering canvas runs independently of React re-render cycles to guarantee smooth 60 FPS gameplay:
- **Canvas Isolation:** The `<canvas id="game-canvas">` is initialized once inside `BabylonEngine.ts`.
- **Pointer Events Strategy:** The overlay HUD container uses `pointer-events-none`, while interactive UI elements (chat, hotbar, inventory windows) declare `pointer-events-auto`.
- **Orthographic Projection:** Babylon.js utilizes an `ArcRotateCamera` set to `mode = Camera.ORTHOGRAPHIC_CAMERA` with an isometric angle ($\alpha = -\pi/2$, $\beta = \pi/3.2$).

---

## 4. Zustand State Management & Data Flow

Client state is partitioned into specialized Zustand stores to isolate high-frequency game ticks from DOM updates:
- **`store.ts`:** Manages character inventory (28 slots), 27-skill levels, active target frames, nearby peer instances, and network ping.
- **`editor-store.ts`:** Manages Studio workspace states, active brush tools, layer selections, undo/redo history stacks, and dirty map flags.

> [!IMPORTANT]
> Game loop ticks modify Babylon.js mesh positions directly and push updates to Zustand stores only when user-facing state (such as HP or XP) changes.
