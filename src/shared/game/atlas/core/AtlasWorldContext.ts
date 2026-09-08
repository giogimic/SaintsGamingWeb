import { IWorldField } from './IWorldField';

export interface AtlasWorldContext {
  seed: string | number;
  
  // Base Macro Fields
  elevation: IWorldField;
  temperature: IWorldField;
  moisture: IWorldField;
  continentalness: IWorldField;
  erosion: IWorldField;
  ruggedness: IWorldField;
  geology: IWorldField;

  // Extensible dynamic fields
  [key: string]: IWorldField | string | number;
}
