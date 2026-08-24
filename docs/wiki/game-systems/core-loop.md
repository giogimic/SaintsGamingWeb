# Core Game Loop & Synchronization

The Saints Gaming client loop drives orthographic rendering, client-side prediction, and authoritative server synchronization at 60+ frames per second.

---

## 1. Frame Execution & DeltaTime Calculation

The client game loop is powered exclusively by the browser's `requestAnimationFrame` API:

```typescript
// Core loop tick implementation
function gameLoop(timestamp: number) {
  const deltaTime = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
  lastTimestamp = timestamp;

  updatePhysics(deltaTime);
  interpolateEntities(deltaTime);
  renderBabylonScene();

  requestAnimationFrame(gameLoop);
}
```

> [!WARNING]
> Never use `setInterval` or `setTimeout` for game loop ticks. Browser timer throttling causes animation stutter and clock drift when tabs lose focus.

---

## 2. Client-Side Prediction & Server Reconciliation

To provide instantaneous responsive controls over variable network latencies, player input uses predictive client movement with authoritative reconciliation:

1. **Immediate Local Response:** Directional inputs immediately adjust the local player character mesh velocity:
   $$\vec{v}_{\text{pred}} = \vec{d}_{\text{input}} \times \text{BaseSpeed} \times \text{SpeedMultiplier}$$
2. **Server Verification:** Input packets containing sequence numbers and timestamps are sent to the Go socket backend (`:3001`).
3. **Drift Interpolation (`lerp`):** When authoritative server position $\vec{P}_{\text{server}}$ arrives, the client smooths discrepancy without snapping:
   $$\vec{P}_{\text{render}} = \vec{P}_{\text{current}} + (\vec{P}_{\text{server}} - \vec{P}_{\text{current}}) \cdot \min(1, \lambda \cdot \Delta t)$$
   where $\lambda$ represents the convergence rate constant ($\lambda \approx 15.0$).

---

## 3. Entity Lifecycle & Area of Interest (AOI)

Entities (other players, roaming monsters, harvestable resource nodes) transition through standard lifecycle phases:

```
┌──────────────┐   Enter AOI   ┌──────────────┐   Move/Attack   ┌──────────────┐
│ Entity Dormant├──────────────►│ Mesh Created ├────────────────►│ Active Tick  │
└──────────────┘               └──────────────┘                 └──────┬───────┘
                                                                       │ Exit AOI / Die
                               ┌──────────────┐                        │
                               │ Mesh Disposed│◄───────────────────────┘
                               └──────────────┘
```

- **Spawn:** The client instantiates a quad mesh, binds the corresponding LPC sprite atlas, and attaches a billboarded nameplate.
- **Despawn:** When an entity departs the player's Area-of-Interest chunk, mesh geometries and dynamic materials are explicitly disposed of to prevent memory leaks.

---

## 4. Map Switching & Dynamic Scene Management

When traversing a warp gate, `mapLoader.ts` executes a structured scene transition:
1. Suspends player input handling and fades the camera viewport.
2. Clears batched chunk meshes (`tileset_mesh_*`) and collision grid memory.
3. Fetches the target map payload via `GET /api/maps?id={mapId}`.
4. Generates new static chunk meshes and sets the player spawn coordinate.
5. Emits `join_map` to the Go MMO server to subscribe to the new shard's AOI grid.
