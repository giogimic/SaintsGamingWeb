export interface INoiseSource {
  /**
   * Samples the noise source at the given 2D coordinates.
   * Expected output range is typically -1.0 to 1.0.
   */
  sample2D(x: number, y: number): number;

  /**
   * Samples the noise source at the given 3D coordinates.
   * Expected output range is typically -1.0 to 1.0.
   */
  sample3D(x: number, y: number, z: number): number;
}
