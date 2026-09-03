/**
 * Saints Gaming — Client-Side Input Prediction & Server Reconciliation Engine
 *
 * Implements a 128-slot circular ring buffer for user inputs, client prediction,
 * authoritative reconciliation with replay, and remote entity interpolation buffer (50-100ms).
 */

import { SweptAABBController, Vector3D, VoxelWorldCollisionQuery } from '@/shared/game/voxel/VoxelCollision';

export interface UserMovementInput {
  sequenceId: number;
  moveVector: [number, number, number];
  dt: number;
  timestamp: number;
  predictedPos: [number, number, number];
  predictedVel: [number, number, number];
}

export interface AuthoritativeServerState {
  lastProcessedSequence: number;
  position: [number, number, number];
  velocity: [number, number, number];
  timestamp?: number;
}

/**
 * 128-capacity fixed-size ring buffer for unacknowledged inputs.
 */
export class InputSequenceRingBuffer {
  public static readonly CAPACITY = 128;
  private buffer: Array<UserMovementInput | null> = new Array(InputSequenceRingBuffer.CAPACITY).fill(null);
  private headSeq = 0;
  private tailSeq = 1;

  public push(input: UserMovementInput): void {
    const idx = input.sequenceId % InputSequenceRingBuffer.CAPACITY;
    this.buffer[idx] = input;
    this.headSeq = input.sequenceId;
    if (this.headSeq - this.tailSeq >= InputSequenceRingBuffer.CAPACITY) {
      this.tailSeq = this.headSeq - InputSequenceRingBuffer.CAPACITY + 1;
    }
  }

  public get(sequenceId: number): UserMovementInput | undefined {
    if (sequenceId < this.tailSeq || sequenceId > this.headSeq) return undefined;
    const item = this.buffer[sequenceId % InputSequenceRingBuffer.CAPACITY];
    return item && item.sequenceId === sequenceId ? item : undefined;
  }

  public getUnacknowledged(lastAckSeq: number): UserMovementInput[] {
    const list: UserMovementInput[] = [];
    const start = Math.max(this.tailSeq, lastAckSeq + 1);
    for (let seq = start; seq <= this.headSeq; seq++) {
      const item = this.get(seq);
      if (item) list.push(item);
    }
    return list;
  }

  public prune(acknowledgedSeq: number): void {
    const newTail = Math.min(acknowledgedSeq + 1, this.headSeq + 1);
    for (let seq = this.tailSeq; seq < newTail; seq++) {
      const idx = seq % InputSequenceRingBuffer.CAPACITY;
      const item = this.buffer[idx];
      if (item && item.sequenceId === seq) {
        this.buffer[idx] = null;
      }
    }
    this.tailSeq = newTail;
  }

  public clear(): void {
    this.buffer.fill(null);
    this.headSeq = 0;
    this.tailSeq = 1;
  }

  public size(): number {
    if (this.headSeq < this.tailSeq) return 0;
    return this.headSeq - this.tailSeq + 1;
  }
}

/**
 * Manages prediction, local authoritative simulation, and replay reconciliation.
 */
export class ClientReconciliationEngine {
  public static readonly RECONCILIATION_EPSILON = 0.05; // 5 cm threshold
  public readonly ringBuffer = new InputSequenceRingBuffer();
  public position: [number, number, number];
  public velocity: [number, number, number];
  private currentSeq = 0;

  constructor(initialPos: [number, number, number] = [0, 0, 0]) {
    this.position = [...initialPos];
    this.velocity = [0, 0, 0];
  }

  /**
   * Applies user input immediately locally for 60 FPS prediction, storing in ring buffer.
   */
  public recordAndPredictInput(
    moveVector: [number, number, number],
    dt: number,
    controller: SweptAABBController,
    world: VoxelWorldCollisionQuery
  ): UserMovementInput {
    this.currentSeq += 1;
    const seq = this.currentSeq;

    const startPos: Vector3D = {
      x: this.position[0],
      y: this.position[1],
      z: this.position[2],
    };

    const vel: Vector3D = {
      x: moveVector[0],
      y: moveVector[1],
      z: moveVector[2],
    };

    const res = controller.simulateMove(world, startPos, vel, dt);
    this.position = [res.position.x, res.position.y, res.position.z];
    this.velocity = [res.velocity.x, res.velocity.y, res.velocity.z];

    const input: UserMovementInput = {
      sequenceId: seq,
      moveVector: [...moveVector],
      dt,
      timestamp: Date.now(),
      predictedPos: [...this.position],
      predictedVel: [...this.velocity],
    };

    this.ringBuffer.push(input);
    return input;
  }

  /**
   * Reconciles server authoritative state.
   * If error exceeds 0.05m, snaps to server position and replays unacknowledged inputs.
   */
  public onServerAuthoritativeState(
    serverState: AuthoritativeServerState,
    controller: SweptAABBController,
    world: VoxelWorldCollisionQuery
  ): { reconciled: boolean; correctedError: number } {
    const historicalInput = this.ringBuffer.get(serverState.lastProcessedSequence);

    let errorDist = 0;
    if (historicalInput) {
      const dx = historicalInput.predictedPos[0] - serverState.position[0];
      const dy = historicalInput.predictedPos[1] - serverState.position[1];
      const dz = historicalInput.predictedPos[2] - serverState.position[2];
      errorDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    } else {
      const dx = this.position[0] - serverState.position[0];
      const dy = this.position[1] - serverState.position[1];
      const dz = this.position[2] - serverState.position[2];
      errorDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    if (errorDist > ClientReconciliationEngine.RECONCILIATION_EPSILON) {
      // 1. Snap to authoritative server state
      let replayPos: Vector3D = {
        x: serverState.position[0],
        y: serverState.position[1],
        z: serverState.position[2],
      };
      let replayVel: Vector3D = {
        x: serverState.velocity[0],
        y: serverState.velocity[1],
        z: serverState.velocity[2],
      };

      // 2. Replay all unacknowledged inputs from lastProcessedSequence + 1 up to current
      const pending = this.ringBuffer.getUnacknowledged(serverState.lastProcessedSequence);
      for (const input of pending) {
        const vel: Vector3D = {
          x: input.moveVector[0],
          y: input.moveVector[1],
          z: input.moveVector[2],
        };
        const res = controller.simulateMove(world, replayPos, vel, input.dt);
        replayPos = res.position;
        replayVel = res.velocity;

        // Update predicted state in the buffer
        input.predictedPos = [res.position.x, res.position.y, res.position.z];
        input.predictedVel = [res.velocity.x, res.velocity.y, res.velocity.z];
      }

      this.position = [replayPos.x, replayPos.y, replayPos.z];
      this.velocity = [replayVel.x, replayVel.y, replayVel.z];
      this.ringBuffer.prune(serverState.lastProcessedSequence);

      return { reconciled: true, correctedError: errorDist };
    }

    // Prediction was within tolerance (< 0.05m)
    this.ringBuffer.prune(serverState.lastProcessedSequence);
    return { reconciled: false, correctedError: errorDist };
  }
}

export interface EntitySnapshot {
  timestamp: number;
  position: [number, number, number];
  velocity: [number, number, number];
}

/**
 * State interpolation buffer for remote entities (50-100ms delay) to guarantee jitter-free rendering.
 */
export class EntityInterpolationBuffer {
  public static readonly DEFAULT_DELAY_MS = 75; // 75ms interpolation buffer
  public readonly delayMs: number;
  private snapshots: EntitySnapshot[] = [];

  constructor(delayMs: number = EntityInterpolationBuffer.DEFAULT_DELAY_MS) {
    this.delayMs = delayMs;
  }

  public pushSnapshot(
    timestamp: number,
    position: [number, number, number],
    velocity: [number, number, number] = [0, 0, 0]
  ): void {
    this.snapshots.push({ timestamp, position: [...position], velocity: [...velocity] });
    // Keep max 64 snapshots (~1-2 seconds of data)
    if (this.snapshots.length > 64) {
      this.snapshots.shift();
    }
  }

  /**
   * Evaluates the interpolated position at the given client time.
   */
  public getInterpolatedState(clientTime: number): {
    position: [number, number, number];
    velocity: [number, number, number];
  } {
    if (this.snapshots.length === 0) {
      return { position: [0, 0, 0], velocity: [0, 0, 0] };
    }
    if (this.snapshots.length === 1) {
      return {
        position: [...this.snapshots[0].position],
        velocity: [...this.snapshots[0].velocity],
      };
    }

    const renderTime = clientTime - this.delayMs;

    // Older than oldest snapshot -> clamp to oldest
    if (renderTime <= this.snapshots[0].timestamp) {
      return {
        position: [...this.snapshots[0].position],
        velocity: [...this.snapshots[0].velocity],
      };
    }

    // Newer than newest snapshot -> extrapolate using latest velocity
    const latest = this.snapshots[this.snapshots.length - 1];
    if (renderTime >= latest.timestamp) {
      const dt = Math.min(0.25, (renderTime - latest.timestamp) / 1000);
      return {
        position: [
          latest.position[0] + latest.velocity[0] * dt,
          latest.position[1] + latest.velocity[1] * dt,
          latest.position[2] + latest.velocity[2] * dt,
        ],
        velocity: [...latest.velocity],
      };
    }

    // Find surrounding snapshots S0 and S1
    for (let i = 0; i < this.snapshots.length - 1; i++) {
      const s0 = this.snapshots[i];
      const s1 = this.snapshots[i + 1];
      if (renderTime >= s0.timestamp && renderTime <= s1.timestamp) {
        const span = s1.timestamp - s0.timestamp;
        const alpha = span > 0 ? (renderTime - s0.timestamp) / span : 0;

        return {
          position: [
            s0.position[0] + (s1.position[0] - s0.position[0]) * alpha,
            s0.position[1] + (s1.position[1] - s0.position[1]) * alpha,
            s0.position[2] + (s1.position[2] - s0.position[2]) * alpha,
          ],
          velocity: [
            s0.velocity[0] + (s1.velocity[0] - s0.velocity[0]) * alpha,
            s0.velocity[1] + (s1.velocity[1] - s0.velocity[1]) * alpha,
            s0.velocity[2] + (s1.velocity[2] - s0.velocity[2]) * alpha,
          ],
        };
      }
    }

    return {
      position: [...latest.position],
      velocity: [...latest.velocity],
    };
  }
}
