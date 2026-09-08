import { AtlasWorldContext } from '../core/AtlasWorldContext';
import { SimplexNoiseSource, hashSeed } from '../noise/SimplexNoiseSource';
import { FractalNoiseField } from '../fields/FractalNoiseField';
import { RemapField, ConstantField } from '../composition/MathOperations';
import { DomainWarpField } from '../composition/DomainWarpField';

export function buildAtlasWorld(seed: string | number): AtlasWorldContext {
  const numericSeed = hashSeed(seed);

  // 1. Core Noise Sources
  const elevSource = new SimplexNoiseSource(numericSeed + 1);
  const tempSource = new SimplexNoiseSource(numericSeed + 2);
  const moistSource = new SimplexNoiseSource(numericSeed + 3);
  const contSource = new SimplexNoiseSource(numericSeed + 4);
  const erosionSource = new SimplexNoiseSource(numericSeed + 5);
  const ruggedSource = new SimplexNoiseSource(numericSeed + 6);
  const geoSource = new SimplexNoiseSource(numericSeed + 7);
  
  const warpXSource = new SimplexNoiseSource(numericSeed + 100);
  const warpYSource = new SimplexNoiseSource(numericSeed + 101);

  // 2. Base Fractal Fields (outputs roughly -1.0 to 1.0)
  const rawElev = new FractalNoiseField({
    id: 'raw_elevation', name: 'Raw Elevation', dimensions: 2,
    source: elevSource, octaves: 4, scale: 0.005
  });

  const rawTemp = new FractalNoiseField({
    id: 'raw_temperature', name: 'Raw Temperature', dimensions: 2,
    source: tempSource, octaves: 3, scale: 0.002
  });

  const rawMoist = new FractalNoiseField({
    id: 'raw_moisture', name: 'Raw Moisture', dimensions: 2,
    source: moistSource, octaves: 3, scale: 0.002
  });

  const rawCont = new FractalNoiseField({
    id: 'raw_continentalness', name: 'Raw Continentalness', dimensions: 2,
    source: contSource, octaves: 2, scale: 0.001
  });

  const rawErosion = new FractalNoiseField({
    id: 'raw_erosion', name: 'Raw Erosion', dimensions: 2,
    source: erosionSource, octaves: 2, scale: 0.003
  });

  const rawRugged = new FractalNoiseField({
    id: 'raw_ruggedness', name: 'Raw Ruggedness', dimensions: 2,
    source: ruggedSource, octaves: 3, scale: 0.01
  });

  const rawGeo = new FractalNoiseField({
    id: 'raw_geology', name: 'Raw Geology', dimensions: 3,
    source: geoSource, octaves: 2, scale: 0.02
  });

  // 3. Domain Warping setup
  const warpX = new FractalNoiseField({
    id: 'warp_x', name: 'Warp X', dimensions: 2,
    source: warpXSource, octaves: 2, scale: 0.01
  });

  const warpY = new FractalNoiseField({
    id: 'warp_y', name: 'Warp Y', dimensions: 2,
    source: warpYSource, octaves: 2, scale: 0.01
  });

  // 4. Normalized and composed final fields
  // Elevation is typically domain-warped to create more organic mountain ridges
  const warpedElev = new DomainWarpField('warped_elev', rawElev, warpX, warpY, null, 20.0);
  
  // Normalization: Remap all fields to [0.0, 1.0] for standard composition
  // Note: FractalNoiseField outputs between -maxAmp and +maxAmp. 
  // For standard persistence=0.5, octaves=4, maxAmp is ~1.875
  const maxAmp4 = 1.875;
  const maxAmp3 = 1.75;
  const maxAmp2 = 1.5;

  const elevation = new RemapField('elevation', warpedElev, -maxAmp4, maxAmp4, 0.0, 1.0);
  const temperature = new RemapField('temperature', rawTemp, -maxAmp3, maxAmp3, 0.0, 1.0);
  const moisture = new RemapField('moisture', rawMoist, -maxAmp3, maxAmp3, 0.0, 1.0);
  const continentalness = new RemapField('continentalness', rawCont, -maxAmp2, maxAmp2, 0.0, 1.0);
  const erosion = new RemapField('erosion', rawErosion, -maxAmp2, maxAmp2, 0.0, 1.0);
  const ruggedness = new RemapField('ruggedness', rawRugged, -maxAmp3, maxAmp3, 0.0, 1.0);
  const geology = new RemapField('geology', rawGeo, -maxAmp2, maxAmp2, 0.0, 1.0);

  return {
    seed,
    elevation,
    temperature,
    moisture,
    continentalness,
    erosion,
    ruggedness,
    geology
  };
}
