/**
 * Main Game Loop (Ticker)
 * 
 * Replaces the old Babylon render loop with a pure tick-based loop using
 * requestAnimationFrame. Calls systems in a deterministic order.
 */
import { inputController } from '../input/InputController';
import { localMovementSystem } from '../engine/physics/LocalMovementSystem';
import { remoteMovementSystem } from '../engine/physics/RemoteMovementSystem';
import { worldStreamer } from '../engine/streaming/WorldStreamer';
import { usePlayerStore } from '../state/usePlayerStore';
import { useSessionStore } from '../state/useSessionStore';
import { useWorldStore } from '../state/useWorldStore';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { savePlayerLocationSnapshot } from '@/shared/game/playerLocationSync';

export class GameLoop {
  private isRunning = false;
  private lastTime = 0;
  private rafId: number | null = null;
  
  // High precision tick variables
  private accumulator = 0;
  private readonly TICK_RATE = 60; // 60 ticks per second
  private readonly TICK_MS = 1000 / 60;
  private lastLocationSaveAt = 0;

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', this.handlePageHide);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
    console.log('[GameLoop] Started');
  }

  public stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.persistCurrentLocation(true);
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', this.handlePageHide);
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
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

    const now = Date.now();
    if (useSessionStore.getState().activeScene === 'exploring' && now - this.lastLocationSaveAt >= 5000) {
      this.lastLocationSaveAt = now;
      this.persistCurrentLocation(false);
    }

    // 3. Process Combat/Game Logic Systems
    // combatSystem.update(dt);

    // 4. Update World Streaming
    const playerStore = usePlayerStore.getState();
    const pos = playerStore.player.position;
    if (pos && pos.z !== undefined) {
       worldStreamer.updateStreamingForPosition(new Vector3(pos.x, pos.y, pos.z));
    }
  }

  private handlePageHide = () => this.persistCurrentLocation(true);
  private handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') this.persistCurrentLocation(true);
  };

  private persistCurrentLocation(keepalive: boolean) {
    const session = useSessionStore.getState();
    const player = usePlayerStore.getState().player;
    const mapId = useWorldStore.getState().currentMapId;
    if (session.characterId && mapId && player.position) {
      savePlayerLocationSnapshot({
        characterId: session.characterId,
        mapId,
        position: player.position,
      }, keepalive);
    }
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
