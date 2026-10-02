import { getCameraFacingAngle } from './cameraFacing';

export function isMovingBackward(moveAngle: number, cameraYaw: number): boolean {
  const facingAngle = getCameraFacingAngle(cameraYaw);
  return Math.cos(moveAngle - facingAngle) < -0.7;
}
