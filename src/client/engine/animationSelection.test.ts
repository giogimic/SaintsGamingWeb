import { describe, expect, it } from 'vitest';
import { selectAnimationGroup } from './animationSelection';

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
