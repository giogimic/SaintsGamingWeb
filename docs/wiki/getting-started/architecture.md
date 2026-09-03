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

---

## 5. Desktop Client & Electron Runtime (`studio-desktop`)

For dedicated desktop authoring and standalone play, Saints Gaming provides a packaged desktop executable built with Electron and Vite:

- **Desktop Shell (`studio-desktop/electron/main.cjs`):** Launches the primary Saints Gaming client with native window controls, hardware-accelerated WebGL viewports, and deep link protocol integration (`saints-gaming://`).
- **Dynamic Resolver:** Checks if the local Next.js dev server is active (`http://localhost:3000`), connects to production (`https://saintsgaming.net`) when online, and automatically falls back to an offline bundled client (`dist/index.html`) if no server is reachable.
- **In-App Developer Gating:** World Studio controls and direct navigation (`Ctrl+Shift+E`) are conditionally exposed in the native menu and UI navbar only to users with Developer or Admin permissions (`permissionLevel >= 400`). Regular community players experience a clean, focused gaming app.

---

## 6. Greenfield 3D Voxel World Architecture

The world engine combines 3D volumetric voxels with hybrid 2.5D billboard sprites:

- **Volumetric Voxel Blocks:** Terrain geometry is stored as discrete 3D voxel blocks (`VoxelWorldBlock`) in voxel coordinates $(X, Y, Z)$ rather than flat 2D tiles.
- **Face-Specific UV Mapping:** Each voxel cube dynamically assigns material textures across its six faces (`top`, `bottom`, `north`, `south`, `east`, `west`), supporting multi-face materials like grass-topped dirt or layered stone strata.
- **Voxel Target Resolver:** Raycasts resolve exact hit coordinates and surface normals to determine block placement, removal, and volumetric collision bounds.
- **Chunk Partitioning:** Voxels are grouped into $16 \times 16 \times 16$ spatial chunks to ensure sub-millisecond dynamic mesh rebuilding and 60 FPS performance.
