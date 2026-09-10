/**
 * Main Game Loop (Ticker)
 * 
 * Replaces the old Babylon render loop with a pure tick-based loop using
 * requestAnimationFrame. Calls systems in a deterministic order.
 */
import { inputController } from '../input/InputController';
import { localMovementSystem } from '../engine/physics/LocalMovementSystem';
import { remoteMovementSystem } from '../engine/physics/RemoteMovementSystem';

export class GameLoop {
  private isRunning = false;
  private lastTime = 0;
  private rafId: number | null = null;
  
  // High precision tick variables
  private accumulator = 0;
  private readonly TICK_RATE = 60; // 60 ticks per second
  private readonly TICK_MS = 1000 / 60;

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
    console.log('[GameLoop] Started');
  }

  public stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    console.log('[GameLoop] Stopped');
  }

  private loop = (time: number) => {
    if (!this.isRunning) return;

    const frameDelta = time - this.lastTime;
    this.lastTime = time;

    // Cap delta time to prevent spiral of death on lag spikes
    const safeDelta = Math.min(frameDelta, 250); 
    this.accumulator += safeDelta;

    // Fixed timestep update (logic)
    while (this.accumulator >= this.TICK_MS) {
      this.fixedUpdate(this.TICK_MS);
      this.accumulator -= this.TICK_MS;
    }

    // Variable timestep update (rendering/interpolation)
    // The fraction `this.accumulator / this.TICK_MS` can be used for rendering interpolation
    this.update(safeDelta);

    this.rafId = requestAnimationFrame(this.loop);
  };

  /**
   * Fixed update step — guaranteed to run at TICK_RATE (e.g., 60 times/sec).
   * Good for input polling, movement simulation, and collision.
   */
  private fixedUpdate(dt: number) {
    // 1. Process Input
    inputController.update(dt);
    
    // 2. Process Physics/Movement Systems (Phase 3)
    localMovementSystem.update(dt);
    remoteMovementSystem.update(dt);

    // 3. Process Combat/Game Logic Systems
    // combatSystem.update(dt);
  }

  /**
   * Variable update step — runs every frame.
   * Good for UI updates, particle effects, and rendering.
   */
  private update(dt: number) {
    // 4. Update renderer (Phase 3)
    // engineRenderer.render();
  }
}

export const gameLoop = new GameLoop();
