import { describe, expect, it } from 'vitest';
import { getLocomotionSpeedRatio } from './locomotionSpeed';

describe('getLocomotionSpeedRatio', () => {
  it('matches playback rate to the run cycle and character stride scale', () => {
	const ratio = getLocomotionSpeedRatio(4, 1.6, 4 / 3);
	expect(ratio).toBeCloseTo(2.0833, 3);
  });

  it('increases cadence with movement speed and decreases it for taller characters', () => {
	const baseline = getLocomotionSpeedRatio(4, 1.6, 4 / 3);
	expect(getLocomotionSpeedRatio(8, 1.6, 4 / 3)).toBeCloseTo(baseline * 2);
	expect(getLocomotionSpeedRatio(4, 3.2, 4 / 3)).toBeCloseTo(baseline / 2);
  });

  it('uses normal playback for invalid clip or model measurements', () => {
	expect(getLocomotionSpeedRatio(4, 0, 4 / 3)).toBe(1);
	expect(getLocomotionSpeedRatio(4, 1.6, 0)).toBe(1);
  });
});
