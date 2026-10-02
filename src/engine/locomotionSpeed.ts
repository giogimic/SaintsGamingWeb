const RUN_CYCLE_HEIGHTS = 1.6;

export function getLocomotionSpeedRatio(
  worldSpeed: number,
  characterHeight: number,
  cycleDuration: number,
): number {
  if (
	!Number.isFinite(worldSpeed) || worldSpeed <= 0 ||
	!Number.isFinite(characterHeight) || characterHeight <= 0 ||
	!Number.isFinite(cycleDuration) || cycleDuration <= 0
  ) {
	return 1;
  }

  const cycleDistance = characterHeight * RUN_CYCLE_HEIGHTS;
  return Math.max(0.1, (worldSpeed * cycleDuration) / cycleDistance);
}
