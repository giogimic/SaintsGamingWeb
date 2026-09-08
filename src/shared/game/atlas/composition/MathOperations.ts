import { IWorldField, WorldFieldDefinition } from '../core/IWorldField';
import { FieldSample } from '../core/FieldSample';

export class ConstantField implements IWorldField {
  public readonly definition: WorldFieldDefinition;
  
  constructor(id: string, private value: number) {
    this.definition = {
      id,
      name: `Constant(${value})`,
      dimensions: 2,
      outputRange: { min: value, max: value }
    };
  }

  public sample(): number {
    return this.value;
  }
}

export class AddField implements IWorldField {
  public readonly definition: WorldFieldDefinition;

  constructor(id: string, private fieldA: IWorldField, private fieldB: IWorldField) {
    this.definition = {
      id,
      name: `Add(${fieldA.definition.name}, ${fieldB.definition.name})`,
      dimensions: Math.max(fieldA.definition.dimensions, fieldB.definition.dimensions) as 2 | 3,
      outputRange: {
        min: fieldA.definition.outputRange.min + fieldB.definition.outputRange.min,
        max: fieldA.definition.outputRange.max + fieldB.definition.outputRange.max
      }
    };
  }

  public sample(position: FieldSample): number {
    return this.fieldA.sample(position) + this.fieldB.sample(position);
  }
}

export class MultiplyField implements IWorldField {
  public readonly definition: WorldFieldDefinition;

  constructor(id: string, private fieldA: IWorldField, private fieldB: IWorldField) {
    this.definition = {
      id,
      name: `Multiply(${fieldA.definition.name}, ${fieldB.definition.name})`,
      dimensions: Math.max(fieldA.definition.dimensions, fieldB.definition.dimensions) as 2 | 3,
      outputRange: {
        // Technically depends on signs, but estimating max potential bound
        min: Number.NEGATIVE_INFINITY,
        max: Number.POSITIVE_INFINITY
      }
    };
  }

  public sample(position: FieldSample): number {
    return this.fieldA.sample(position) * this.fieldB.sample(position);
  }
}

export class RemapField implements IWorldField {
  public readonly definition: WorldFieldDefinition;

  constructor(
    id: string,
    private source: IWorldField,
    private fromMin: number,
    private fromMax: number,
    private toMin: number,
    private toMax: number
  ) {
    this.definition = {
      id,
      name: `Remap(${source.definition.name})`,
      dimensions: source.definition.dimensions,
      outputRange: { min: Math.min(toMin, toMax), max: Math.max(toMin, toMax) }
    };
  }

  public sample(position: FieldSample): number {
    const val = this.source.sample(position);
    if (this.fromMin === this.fromMax) return this.toMin;
    const t = (val - this.fromMin) / (this.fromMax - this.fromMin);
    return this.toMin + t * (this.toMax - this.toMin);
  }
}

export class ClampField implements IWorldField {
  public readonly definition: WorldFieldDefinition;

  constructor(id: string, private source: IWorldField, private min: number, private max: number) {
    this.definition = {
      id,
      name: `Clamp(${source.definition.name})`,
      dimensions: source.definition.dimensions,
      outputRange: { min, max }
    };
  }

  public sample(position: FieldSample): number {
    const val = this.source.sample(position);
    return Math.max(this.min, Math.min(this.max, val));
  }
}

export class MaskField implements IWorldField {
  public readonly definition: WorldFieldDefinition;

  constructor(id: string, private source: IWorldField, private mask: IWorldField) {
    this.definition = {
      id,
      name: `Mask(${source.definition.name} x ${mask.definition.name})`,
      dimensions: Math.max(source.definition.dimensions, mask.definition.dimensions) as 2 | 3,
      outputRange: source.definition.outputRange // mask conceptually cuts away
    };
  }

  public sample(position: FieldSample): number {
    return this.source.sample(position) * this.mask.sample(position);
  }
}

export class LerpField implements IWorldField {
  public readonly definition: WorldFieldDefinition;

  constructor(
    id: string, 
    private fieldA: IWorldField, 
    private fieldB: IWorldField, 
    private interpolator: IWorldField
  ) {
    this.definition = {
      id,
      name: `Lerp(${fieldA.definition.name}, ${fieldB.definition.name})`,
      dimensions: Math.max(fieldA.definition.dimensions, fieldB.definition.dimensions, interpolator.definition.dimensions) as 2 | 3,
      outputRange: {
        min: Math.min(fieldA.definition.outputRange.min, fieldB.definition.outputRange.min),
        max: Math.max(fieldA.definition.outputRange.max, fieldB.definition.outputRange.max)
      }
    };
  }

  public sample(position: FieldSample): number {
    const a = this.fieldA.sample(position);
    const b = this.fieldB.sample(position);
    const t = this.interpolator.sample(position);
    return a + t * (b - a);
  }
}
