import { describe, expect, it } from 'vitest';
import { getCameraFacingAngle } from './cameraFacing';

describe('getCameraFacingAngle', () => {
  it.each([
	[0, 0],
	[Math.PI / 2, -Math.PI / 2],
	[Math.PI, -Math.PI],
	[-Math.PI / 2, Math.PI / 2],
  ])('faces the camera heading for camera yaw %s', (yaw, expected) => {
	expect(getCameraFacingAngle(yaw)).toBeCloseTo(expected, 5);
  });

  it('defaults missing or zero-like yaw to forward', () => {
	expect(getCameraFacingAngle(0)).toBe(0);
  });
});
