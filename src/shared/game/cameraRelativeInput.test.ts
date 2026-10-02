import { describe, expect, it } from 'vitest';
import { rotateCameraRelativeInput } from './cameraRelativeInput';

describe('rotateCameraRelativeInput', () => {
  it('maps up to camera-forward and down to camera-backward at zero yaw', () => {
	expect(rotateCameraRelativeInput(0, -1, 0)).toEqual({ x: 0, y: 1 });
	expect(rotateCameraRelativeInput(0, 1, 0)).toEqual({ x: 0, y: -1 });
  });

  it('maps up along the camera heading at ninety-degree yaw', () => {
	const movement = rotateCameraRelativeInput(0, -1, Math.PI / 2);
	expect(movement.x).toBeCloseTo(1);
	expect(movement.y).toBeCloseTo(0);
  });

  it('keeps right input camera-relative', () => {
	expect(rotateCameraRelativeInput(1, 0, 0)).toEqual({ x: 1, y: 0 });
	const movement = rotateCameraRelativeInput(1, 0, Math.PI / 2);
	expect(movement.x).toBeCloseTo(0);
	expect(movement.y).toBeCloseTo(1);
  });
});
