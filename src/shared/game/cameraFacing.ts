export function getCameraFacingAngle(cameraYaw: number): number {
	return cameraYaw ? -cameraYaw : 0;
}
