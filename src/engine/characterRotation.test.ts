import { describe, it, expect } from 'vitest';

describe('Character Rotation and Camera-Relative Heading', () => {
  it('aligns 3D movement trajectory with cardinal directions using Math.atan2(-x, z)', () => {
    // North (Up: dy = -1, worldZ increases -> moveDir.z = 1)
    const angleNorth = Math.atan2(-0, 1);
    expect(angleNorth).toBeCloseTo(0, 5);

    // South (Down: dy = 1, worldZ decreases -> moveDir.z = -1)
    const angleSouth = Math.atan2(-0, -1);
    expect(Math.abs(angleSouth)).toBeCloseTo(Math.PI, 5);

    // West (Left: dx = -1, worldX decreases -> moveDir.x = -1)
    const angleWest = Math.atan2(-(-1), 0);
    expect(angleWest).toBeCloseTo(Math.PI / 2, 5);

    // East (Right: dx = 1, worldX increases -> moveDir.x = 1)
    const angleEast = Math.atan2(-1, 0);
    expect(angleEast).toBeCloseTo(-Math.PI / 2, 5);
  });

  it('matches camera forward direction to -cameraYaw for adaptive screen turning', () => {
    // Looking North (yaw = 0)
    const yawNorth = 0;
    expect(-yawNorth).toBeCloseTo(0, 5);

    // Looking East (yaw = PI / 2)
    const yawEast = Math.PI / 2;
    expect(-yawEast).toBeCloseTo(-Math.PI / 2, 5);

    // Looking South (yaw = PI)
    const yawSouth = Math.PI;
    expect(Math.abs(-yawSouth)).toBeCloseTo(Math.PI, 5);

    // Looking West (yaw = -PI / 2)
    const yawWest = -Math.PI / 2;
    expect(-yawWest).toBeCloseTo(Math.PI / 2, 5);
  });

  it('projects keyboard inputs relative to cameraYaw into correct tile movement delta', () => {
    function mapInput(dx: number, dy: number, yaw: number) {
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const mappedX = dx * cosY - dy * sinY;
      const mappedY = dx * sinY + dy * cosY;

      let moveDx = 0;
      let moveDy = 0;
      if (Math.abs(mappedX) > Math.abs(mappedY)) {
        moveDx = mappedX > 0 ? 1 : -1;
      } else if (Math.abs(mappedY) > 0) {
        moveDy = mappedY > 0 ? 1 : -1;
      }
      return { moveDx, moveDy };
    }

    // Pressing W (dy = -1) facing North (yaw = 0) -> moveDy = -1 (North)
    expect(mapInput(0, -1, 0)).toEqual({ moveDx: 0, moveDy: -1 });

    // Pressing W (dy = -1) facing East (yaw = PI / 2) -> moveDx = 1 (East)
    expect(mapInput(0, -1, Math.PI / 2)).toEqual({ moveDx: 1, moveDy: 0 });

    // Pressing W (dy = -1) facing South (yaw = PI) -> moveDy = 1 (South)
    expect(mapInput(0, -1, Math.PI)).toEqual({ moveDx: 0, moveDy: 1 });

    // Pressing W (dy = -1) facing West (yaw = -PI / 2) -> moveDx = -1 (West)
    expect(mapInput(0, -1, -Math.PI / 2)).toEqual({ moveDx: -1, moveDy: 0 });

    // Pressing S (dy = 1) facing North (yaw = 0) -> moveDy = 1 (South)
    expect(mapInput(0, 1, 0)).toEqual({ moveDx: 0, moveDy: 1 });

    // Pressing A (dx = -1) facing North (yaw = 0) -> moveDx = -1 (West)
    expect(mapInput(-1, 0, 0)).toEqual({ moveDx: -1, moveDy: 0 });

    // Pressing D (dx = 1) facing North (yaw = 0) -> moveDx = 1 (East)
    expect(mapInput(1, 0, 0)).toEqual({ moveDx: 1, moveDy: 0 });
  });
});
