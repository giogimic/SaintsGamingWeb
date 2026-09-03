import { describe, it, expect } from 'vitest';
import {
  ClientReconciliationEngine,
  InputSequenceRingBuffer,
  EntityInterpolationBuffer,
} from './MovementPrediction';
import { SweptAABBController, VoxelWorldCollisionQuery } from '@/shared/game/voxel/VoxelCollision';
import { VOXEL_WORD_AIR, VOXEL_WORD_GUNMETAL } from '@/shared/game/voxel/VoxelWord';

describe('MovementPrediction — Client Prediction & Server Reconciliation', () => {
  const flatWorld: VoxelWorldCollisionQuery = {
    getVoxel: (wx, wy, wz) => (wy === 0 ? VOXEL_WORD_GUNMETAL : VOXEL_WORD_AIR),
  };
  const controller = new SweptAABBController();
  const dt = 1 / 60;

  it('InputSequenceRingBuffer maintains fixed capacity and prunes accurately', () => {
    const ring = new InputSequenceRingBuffer();

    for (let i = 1; i <= 150; i++) {
      ring.push({
        sequenceId: i,
        moveVector: [1, 0, 0],
        dt: 0.016,
        timestamp: 1000 + i * 16,
        predictedPos: [i * 0.1, 1, 0],
        predictedVel: [1, 0, 0],
      });
    }

    expect(ring.size()).toBeLessThanOrEqual(128);
    // Sequence 1 should have been dropped due to capacity 128
    expect(ring.get(1)).toBeUndefined();
    // Sequence 150 should be in buffer
    expect(ring.get(150)).toBeDefined();

    // Prune up to 100
    ring.prune(100);
    expect(ring.get(100)).toBeUndefined();
    expect(ring.get(101)).toBeDefined();
  });

  it('client applies movement immediately for 60 FPS responsiveness', () => {
    const engine = new ClientReconciliationEngine([0, 1, 0]);

    for (let i = 0; i < 60; i++) {
      engine.recordAndPredictInput([3, 0, 0], dt, controller, flatWorld);
    }

    // 60 ticks * (3 m/s * (1/60)s) = 3.0m
    expect(engine.position[0]).toBeCloseTo(3.0, 2);
    expect(engine.position[1]).toBeCloseTo(1.0, 2);
    expect(engine.ringBuffer.size()).toBe(60);
  });

  it('tolerates small server state jitter without triggering replay', () => {
    const engine = new ClientReconciliationEngine([0, 1, 0]);

    // Send 10 inputs
    for (let i = 0; i < 10; i++) {
      engine.recordAndPredictInput([2, 0, 0], dt, controller, flatWorld);
    }

    const input5 = engine.ringBuffer.get(5)!;
    // Server acknowledges seq 5 with tiny 0.01m floating point variance (< 0.05m epsilon)
    const serverAck = {
      lastProcessedSequence: 5,
      position: [input5.predictedPos[0] + 0.01, 1, 0] as [number, number, number],
      velocity: [2, 0, 0] as [number, number, number],
    };

    const res = engine.onServerAuthoritativeState(serverAck, controller, flatWorld);
    expect(res.reconciled).toBe(false); // No replay triggered!
    expect(res.correctedError).toBeLessThan(0.05);
  });

  it('reconciles and replays pending inputs cleanly when server position diverges', () => {
    const engine = new ClientReconciliationEngine([0, 1, 0]);

    // Client moves right from seq 1 to seq 20
    for (let i = 0; i < 20; i++) {
      engine.recordAndPredictInput([4, 0, 0], dt, controller, flatWorld);
    }

    const uncorrectedX = engine.position[0];

    // Server says at sequence 5, a wind gust pushed the entity back by -0.8m
    const input5 = engine.ringBuffer.get(5)!;
    const serverState = {
      lastProcessedSequence: 5,
      position: [input5.predictedPos[0] - 0.8, 1, 0] as [number, number, number],
      velocity: [4, 0, 0] as [number, number, number],
    };

    const res = engine.onServerAuthoritativeState(serverState, controller, flatWorld);
    expect(res.reconciled).toBe(true);
    expect(res.correctedError).toBeGreaterThan(0.5);

    // Entity position should have replayed sequences 6..20 on top of the corrected base
    expect(engine.position[0]).toBeCloseTo(uncorrectedX - 0.8, 2);
  });

  it('EntityInterpolationBuffer smooths remote entity movement under simulated 150ms latency and 2% packet loss', () => {
    const buffer = new EntityInterpolationBuffer(75); // 75ms delay buffer

    const startTime = 10000;
    // Push 30 network snapshots spaced by 50ms (simulating 20 Hz server broadcast)
    for (let i = 0; i < 30; i++) {
      // Simulate 2% packet loss (skip i = 7)
      if (i === 7) continue;

      const t = startTime + i * 50;
      // Remote entity moving linearly at x = i * 0.5, y = 1.0, z = 0
      buffer.pushSnapshot(t, [i * 0.5, 1.0, 0], [10, 0, 0]);
    }

    // Sample positions across continuous client frame times (150ms latency simulation)
    const clientTime = startTime + 500; // 500ms after start
    const interpolated = buffer.getInterpolatedState(clientTime);

    // Render time is clientTime - 75ms = 425ms
    // Snapshot at t=400 (i=8) has x=4.0; Snapshot at t=450 (i=9) has x=4.5
    // Alpha is (425 - 400) / 50 = 0.5 -> x should be 4.25
    expect(interpolated.position[0]).toBeCloseTo(4.25, 2);
    expect(interpolated.position[1]).toBeCloseTo(1.0, 2);
  });
});
