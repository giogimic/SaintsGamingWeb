export interface NamedAnimationGroup {
  name?: string;
}

const isLocomotionClip = (name: string) =>
  /run|walk|jog|sprint|locomotion|move/i.test(name);
const isIdleClip = (name: string) =>
  /idle|stand|wait|breath|rest|still|default/i.test(name);
const isActionClip = (name: string) =>
  /attack|hit|punch|slash|cast|shoot|death|die|dead|hurt|damage|jump|fall|climb/i.test(name);
const isBackwardOrLateralClip = (name: string) =>
  /back|bwd|reverse|left|right/i.test(name);

export function selectAnimationGroup<T extends NamedAnimationGroup>(
  groups: T[],
  animationState: string | undefined,
  isMoving: boolean,
): T | undefined {
  if (animationState) {
	const explicit = groups.find((group) => group.name === animationState);
	if (explicit) return explicit;
  }

  if (isMoving) {
	for (const name of ['run_fwd', 'walk_fwd', 'run', 'walk']) {
	  const preferred = groups.find((group) => group.name === name);
	  if (preferred) return preferred;
	}

	const forward = groups.find((group) =>
	  isLocomotionClip(group.name || '') && /forward|fwd/i.test(group.name || ''),
	);
	if (forward) return forward;

	const neutralLocomotion = groups.find((group) => {
	  const name = group.name || '';
	  return isLocomotionClip(name) && !isBackwardOrLateralClip(name) && !isActionClip(name);
	});
	if (neutralLocomotion) return neutralLocomotion;
  } else {
	const idle = groups.find((group) => group.name === 'idle') ||
	  groups.find((group) => isIdleClip(group.name || ''));
	if (idle) return idle;
  }

	if (isMoving) {
	return groups.find((group) => {
	  const name = group.name || '';
	  return !isActionClip(name) && !isBackwardOrLateralClip(name);
	});
  }

  return groups.find((group) => !isActionClip(group.name || '')) || groups[0];
}
