import { FieldSample } from './FieldSample';

export interface WorldFieldDefinition {
  id: string;
  name: string;
  dimensions: 2 | 3;
  outputRange: {
    min: number;
    max: number;
  };
}

export interface IWorldField {
  readonly definition: WorldFieldDefinition;
  
  /**
   * Samples the field at the given 3D coordinates.
   * If the field is 2D, it will typically ignore the Y coordinate.
   */
  sample(position: FieldSample): number;
}
