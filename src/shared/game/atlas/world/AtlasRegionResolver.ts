import { AtlasWorldContext } from '../core/AtlasWorldContext';
import { FractalArea, CANONICAL_FRACTAL_AREAS } from './FractalArea';

export class AtlasRegionResolver {
  private areas: FractalArea[];

  constructor(areas: FractalArea[] = CANONICAL_FRACTAL_AREAS) {
    this.areas = areas;
  }

  /**
   * Resolves the dominant Fractal Area at the given coordinates.
   * Uses Euclidean distance in a normalized 3D climate space (Temperature, Moisture, Elevation).
   * All fields are expected to be normalized 0.0 to 1.0.
   */
  public resolveArea(context: AtlasWorldContext, x: number, z: number): FractalArea {
    const sample = { x, y: 0, z };
    const t = context.temperature.sample(sample);
    const m = context.moisture.sample(sample);
    const e = context.elevation.sample(sample);

    let closestArea: FractalArea | null = null;
    let minDistance = Number.MAX_VALUE;

    for (const area of this.areas) {
      const { minTemp, maxTemp, minMoisture, maxMoisture, minElevation, maxElevation } = area.climateRules;
      
      // Calculate center points of the area's climate bounding box
      const centerT = (minTemp + maxTemp) / 2;
      const centerM = (minMoisture + maxMoisture) / 2;
      const centerE = (minElevation + maxElevation) / 2;

      // Simple Euclidean distance to the center of the area's preferred climate
      const distT = t - centerT;
      const distM = m - centerM;
      const distE = e - centerE;
      
      const distanceSq = distT * distT + distM * distM + distE * distE;

      if (distanceSq < minDistance) {
        minDistance = distanceSq;
        closestArea = area;
      }
    }

    // Fallback to the first area if something goes horribly wrong (empty list, etc)
    return closestArea || this.areas[0];
  }
}
