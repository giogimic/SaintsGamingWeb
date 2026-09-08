import { AtlasWorldContext } from '../core/AtlasWorldContext';
import { AtlasRegionResolver } from './AtlasRegionResolver';

/**
 * Calculates the final mathematical terrain elevation (0.0 to 1.0+)
 * at a specific X/Z coordinate.
 * 
 * Formula:
 * Base Elevation + (Continentalness * Erosion * Ruggedness * RegionRuggedMultiplier) + RegionOffset
 */
export function calculateTerrainElevation(
  context: AtlasWorldContext,
  resolver: AtlasRegionResolver,
  x: number,
  z: number
): number {
  const sample = { x, y: 0, z };
  
  // 1. Get raw mathematical fields
  const elev = context.elevation.sample(sample);
  const cont = context.continentalness.sample(sample);
  const erosion = context.erosion.sample(sample);
  const rugged = context.ruggedness.sample(sample);

  // 2. Resolve the geographic region to get terrain modifiers
  const area = resolver.resolveArea(context, x, z);
  const mods = area.terrainModifiers;

  // 3. Apply geographic interactions
  // Erosion smooths out ruggedness. High erosion (1.0) means low rugged impact.
  // Continentalness boosts the base height inland.
  const erosionFactor = (1.0 - erosion); // 0.0 means completely eroded
  
  const ruggedImpact = rugged * erosionFactor * cont * mods.ruggednessMultiplier;
  
  // 4. Calculate final height
  let finalHeight = elev + ruggedImpact;
  
  // 5. Apply region-specific mathematical overrides
  finalHeight = finalHeight * mods.heightMultiplier + mods.heightOffset;
  
  return finalHeight;
}
