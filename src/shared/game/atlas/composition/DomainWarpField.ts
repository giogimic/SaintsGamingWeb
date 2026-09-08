import { IWorldField, WorldFieldDefinition } from '../core/IWorldField';
import { FieldSample } from '../core/FieldSample';

export class DomainWarpField implements IWorldField {
  public readonly definition: WorldFieldDefinition;

  constructor(
    id: string,
    private sourceField: IWorldField,
    private warpFieldX: IWorldField,
    private warpFieldY: IWorldField,
    private warpFieldZ: IWorldField | null,
    private strength: number
  ) {
    this.definition = {
      id,
      name: `DomainWarp(${sourceField.definition.name})`,
      dimensions: sourceField.definition.dimensions,
      outputRange: sourceField.definition.outputRange
    };
  }

  public sample(position: FieldSample): number {
    const warpX = this.warpFieldX.sample(position) * this.strength;
    const warpY = this.warpFieldY.sample(position) * this.strength;
    const warpZ = this.warpFieldZ ? this.warpFieldZ.sample(position) * this.strength : 0;

    const warpedPosition: FieldSample = {
      x: position.x + warpX,
      y: position.y + warpY,
      z: position.z + warpZ
    };

    return this.sourceField.sample(warpedPosition);
  }
}
