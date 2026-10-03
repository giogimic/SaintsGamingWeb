import { describe, expect, it } from 'vitest';
import { selectAnimationGroup, resolveLocomotionAnimationState, shouldLoopAnimationState } from './animationSelection';

describe('selectAnimationGroup', () => {
  it('prefers forward locomotion when backward clips load first', () => {
	const backward = { name: 'run_bwd' };
	const forward = { name: 'run_fwd' };

	expect(selectAnimationGroup([backward, forward], undefined, true)).toBe(forward);
  });

  it('uses a native forward run clip when no named forward slot exists', () => {
	const backward = { name: 'Jog_Bwd' };
	const running = { name: 'Running' };

	expect(selectAnimationGroup([backward, running], undefined, true)).toBe(running);
  });

  it('does not substitute a backward cycle when no forward cycle is available', () => {
	const idle = { name: 'idle' };
	const backward = { name: 'run_bwd' };

	expect(selectAnimationGroup([backward, idle], undefined, true)).toBe(idle);
  });

  it('respects an explicitly requested animation slot', () => {
	const forward = { name: 'run_fwd' };
	const backward = { name: 'run_bwd' };

	expect(selectAnimationGroup([forward, backward], 'run_bwd', true)).toBe(backward);
  });
});

describe('locomotion animation state', () => {
  it('distinguishes run, sprint, walking and lateral camera-relative movement', () => {
    expect(resolveLocomotionAnimationState({ moving: true, direction: 'left' })).toBe('run_left');
    expect(resolveLocomotionAnimationState({ moving: true, direction: 'bwd', walking: true })).toBe('walk_bwd');
    expect(resolveLocomotionAnimationState({ moving: true, sprinting: true })).toBe('sprint');
  });
  it('prioritizes jump and landing phases over horizontal movement', () => {
    expect(resolveLocomotionAnimationState({ moving: true, grounded: false, airborneSeconds: 0.1, verticalVelocity: 8 })).toBe('jump_start');
    expect(resolveLocomotionAnimationState({ moving: true, grounded: false, airborneSeconds: 0.3, verticalVelocity: 3 })).toBe('jump_mid');
    expect(resolveLocomotionAnimationState({ moving: false, grounded: false, airborneSeconds: 0.6, verticalVelocity: -3 })).toBe('jump_fall');
    expect(resolveLocomotionAnimationState({ moving: true, landed: true })).toBe('jump_land');
  });
  it('honors loop metadata for sustained jump, sprint and social states', () => {
    expect(shouldLoopAnimationState('jump_mid', true)).toBe(true);
    expect(shouldLoopAnimationState('sprint', true)).toBe(true);
    expect(shouldLoopAnimationState('sit', true)).toBe(true);
    expect(shouldLoopAnimationState('attack_light', true)).toBe(false);
    expect(shouldLoopAnimationState('jump_land', false)).toBe(false);
  });
});
