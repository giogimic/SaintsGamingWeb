import { EventEmitter } from "events";

export class GameEngine {
  private tickRate = 20; // 20 TPS simulation
  private networkTickRate = 10; // 10 TPS broadcast
  private tickIntervalMs = 1000 / this.tickRate;
  private networkIntervalMs = 1000 / this.networkTickRate;
  
  private lastTick = Date.now();
  private lastNetworkTick = Date.now();
  private isRunning = false;
  
  // Event Bus for decoupling systems (Combat, World, Player managers)
  public events = new EventEmitter();

  public start() {
    this.isRunning = true;
    this.lastTick = Date.now();
    this.lastNetworkTick = Date.now();
    this.tickLoop();
    console.log(`[GameEngine] Started (Sim: ${this.tickRate} TPS, Net: ${this.networkTickRate} TPS)`);
  }

  public stop() {
    this.isRunning = false;
  }

  private tickLoop() {
    if (!this.isRunning) return;

    const now = Date.now();
    const deltaTime = now - this.lastTick;

    // Simulate at tickRate
    if (deltaTime >= this.tickIntervalMs) {
      this.simulate(deltaTime);
      this.lastTick = now;
    }

    // Broadcast at networkTickRate
    const networkDelta = now - this.lastNetworkTick;
    if (networkDelta >= this.networkIntervalMs) {
      this.broadcastState();
      this.lastNetworkTick = now;
    }

    // Schedule next tick
    setTimeout(() => this.tickLoop(), Math.max(0, this.tickIntervalMs - (Date.now() - now)));
  }

  private simulate(deltaTime: number) {
    // RULE: The GameEngine owns the simulation clock. 
    // No other system may directly mutate world state outside this tick cycle.
    
    this.events.emit("beforeTick", deltaTime);
    
    // 1. Process all queued inputs
    this.events.emit("processInputs");
    
    // 2. Update all entity states (positions, cooldowns, AI)
    this.events.emit("updateEntities", deltaTime);
    
    // 3. Resolve collisions
    this.events.emit("resolveCollisions");
    
    this.events.emit("afterTick");
  }

  private broadcastState() {
    // Calculate deltas and broadcast to clients via the network tick
    this.events.emit("broadcastDeltas");
  }
}
