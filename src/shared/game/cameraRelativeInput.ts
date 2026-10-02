export function rotateCameraRelativeInput(dx: number, dy: number, yaw: number) {
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);

  return {
	x: dx * cosYaw - dy * sinYaw,
	y: dx * sinYaw - dy * cosYaw,
  };
}
