import { IWorldField, WorldFieldDefinition } from '../core/IWorldField';
import { FieldSample } from '../core/FieldSample';
import { INoiseSource } from '../noise/INoiseSource';

export interface FractalNoiseConfig {
  id: string;
  name: string;
  dimensions: 2 | 3;
  source: INoiseSource;
  octaves?: number;
  persistence?: number;
  lacunarity?: number;
  scale?: number;
}

export class FractalNoiseField implements IWorldField {
  public readonly definition: WorldFieldDefinition;

  private source: INoiseSource;
  private octaves: number;
  private persistence: number;
  private lacunarity: number;
  private scale: number;

  constructor(config: FractalNoiseConfig) {
    this.source = config.source;
    this.octaves = config.octaves ?? 3;
    this.persistence = config.persistence ?? 0.5;
    this.lacunarity = config.lacunarity ?? 2.0;
    this.scale = config.scale ?? 1.0;

    // Fractional Brownian Motion (fBm) has a theoretical max amplitude of 1 / (1 - persistence)
    // Assuming base noise is -1.0 to 1.0
    const maxAmplitude = (1 - Math.pow(this.persistence, this.octaves)) / (1 - this.persistence);

    this.definition = {
      id: config.id,
      name: config.name,
      dimensions: config.dimensions,
      outputRange: {
        min: -maxAmplitude,
        max: maxAmplitude,
      },
    };
  }

  public sample(position: FieldSample): number {
    let total = 0;
    let frequency = this.scale;
    let amplitude = 1;

    for (let i = 0; i < this.octaves; i++) {
      let noiseVal = 0;
      if (this.definition.dimensions === 2) {
        noiseVal = this.source.sample2D(position.x * frequency, position.z * frequency);
      } else {
        noiseVal = this.source.sample3D(position.x * frequency, position.y * frequency, position.z * frequency);
      }
      
      total += noiseVal * amplitude;
      amplitude *= this.persistence;
      frequency *= this.lacunarity;
    }

    return total;
  }
}
