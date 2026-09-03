import { VoxelShape, VoxelOrientation, VoxelShapeType, VoxelOrientationType } from '@/shared/game/voxel/VoxelWord';

export interface VoxelQuadMesh {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  colors: number[];
}

export class VoxelMeshBuilder {
  public positions: number[] = [];
  public normals: number[] = [];
  public uvs: number[] = [];
  public indices: number[] = [];
  public colors: number[] = [];
  private vertexCount = 0;

  public addQuad(
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number],
    normal: [number, number, number],
    uvRange: [number, number, number, number] = [0, 0, 1, 1],
    aoValues: [number, number, number, number] = [1, 1, 1, 1],
    rgba: [number, number, number, number] = [1, 1, 1, 1]
  ): void {
    const base = this.vertexCount;

    // 4 Vertices
    this.positions.push(...p0, ...p1, ...p2, ...p3);
    this.normals.push(...normal, ...normal, ...normal, ...normal);

    // UVs: [uMin, vMin, uMax, vMax]
    const [u0, v0, u1, v1] = uvRange;
    this.uvs.push(u0, v1, u1, v1, u1, v0, u0, v0);

    // Vertex colors (combines material RGBA with Ambient Occlusion)
    for (let i = 0; i < 4; i++) {
      const ao = aoValues[i] ?? 1.0;
      this.colors.push(rgba[0] * ao, rgba[1] * ao, rgba[2] * ao, rgba[3]);
    }

    // 2 Triangles (p0 -> p2 -> p1, p0 -> p3 -> p2) for outward front-facing normals
    this.indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
    this.vertexCount += 4;
  }

  public addTriangle(
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    normal: [number, number, number],
    uvs: [number, number, number, number, number, number] = [0, 1, 1, 1, 0, 0],
    aoValues: [number, number, number] = [1, 1, 1],
    rgba: [number, number, number, number] = [1, 1, 1, 1]
  ): void {
    const base = this.vertexCount;

    this.positions.push(...p0, ...p1, ...p2);
    this.normals.push(...normal, ...normal, ...normal);
    this.uvs.push(...uvs);

    for (let i = 0; i < 3; i++) {
      const ao = aoValues[i] ?? 1.0;
      this.colors.push(rgba[0] * ao, rgba[1] * ao, rgba[2] * ao, rgba[3]);
    }

    this.indices.push(base, base + 1, base + 2);
    this.vertexCount += 3;
  }

  /**
   * Generates standard 3D slope ramp geometry (45 deg) inside unit bounding box [x, y, z] to [x+1, y+1, z+1].
   */
  public addSlope45(
    x: number,
    y: number,
    z: number,
    orientation: VoxelOrientationType = VoxelOrientation.NORTH,
    rgba: [number, number, number, number] = [1, 1, 1, 1],
    topUv: [number, number, number, number] = [0, 0, 1, 1],
    sideUv: [number, number, number, number] = [0, 0, 1, 1],
    bottomUv: [number, number, number, number] = [0, 0, 1, 1]
  ): void {
    // Standard coordinates
    const x0 = x, x1 = x + 1;
    const y0 = y, y1 = y + 1;
    const z0 = z, z1 = z + 1;

    const topLight: [number, number, number, number] = [rgba[0] * 0.95, rgba[1] * 0.95, rgba[2] * 0.95, rgba[3]];
    const sideLight: [number, number, number, number] = [rgba[0] * 0.8, rgba[1] * 0.8, rgba[2] * 0.8, rgba[3]];
    const botLight: [number, number, number, number] = [rgba[0] * 0.55, rgba[1] * 0.55, rgba[2] * 0.55, rgba[3]];

    switch (orientation) {
      case VoxelOrientation.SOUTH: // Incline goes UP to North (z+), DOWN to South (z-)
        // Angled top face
        this.addQuad(
          [x0, y0, z0],
          [x1, y0, z0],
          [x1, y1, z1],
          [x0, y1, z1],
          [0, 0.707, -0.707],
          topUv,
          [1, 1, 1, 1],
          topLight
        );
        // Back wall (North)
        this.addQuad([x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [0, 0, 1], sideUv, [1, 1, 1, 1], sideLight);
        // Bottom ground
        this.addQuad([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], [0, -1, 0], bottomUv, [1, 1, 1, 1], botLight);
        // Left side triangle (West)
        this.addTriangle([x0, y0, z0], [x0, y1, z1], [x0, y0, z1], [-1, 0, 0], [sideUv[0], sideUv[3], sideUv[2], sideUv[3], sideUv[0], sideUv[1]], [1, 1, 1], sideLight);
        // Right side triangle (East)
        this.addTriangle([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [1, 0, 0], [sideUv[0], sideUv[3], sideUv[2], sideUv[3], sideUv[2], sideUv[1]], [1, 1, 1], sideLight);
        break;

      case VoxelOrientation.NORTH: // Incline goes UP to South (z-), DOWN to North (z+)
        this.addQuad(
          [x1, y0, z1],
          [x0, y0, z1],
          [x0, y1, z0],
          [x1, y1, z0],
          [0, 0.707, 0.707],
          topUv,
          [1, 1, 1, 1],
          topLight
        );
        // Back wall (South)
        this.addQuad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1], sideUv, [1, 1, 1, 1], sideLight);
        // Bottom ground
        this.addQuad([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], [0, -1, 0], bottomUv, [1, 1, 1, 1], botLight);
        // Left side triangle (West)
        this.addTriangle([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [-1, 0, 0], [sideUv[2], sideUv[3], sideUv[0], sideUv[3], sideUv[0], sideUv[1]], [1, 1, 1], sideLight);
        // Right side triangle (East)
        this.addTriangle([x1, y0, z1], [x1, y1, z0], [x1, y0, z0], [1, 0, 0], [sideUv[0], sideUv[3], sideUv[0], sideUv[1], sideUv[2], sideUv[3]], [1, 1, 1], sideLight);
        break;

      case VoxelOrientation.EAST: // Incline goes UP to West (x-), DOWN to East (x+)
        this.addQuad(
          [x1, y0, z0],
          [x1, y0, z1],
          [x0, y1, z1],
          [x0, y1, z0],
          [0.707, 0.707, 0],
          topUv,
          [1, 1, 1, 1],
          topLight
        );
        // Back wall (West)
        this.addQuad([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [-1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        // Bottom
        this.addQuad([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], [0, -1, 0], bottomUv, [1, 1, 1, 1], botLight);
        // Front/Back triangles
        this.addTriangle([x1, y0, z0], [x0, y1, z0], [x0, y0, z0], [0, 0, -1], [sideUv[2], sideUv[3], sideUv[0], sideUv[1], sideUv[0], sideUv[3]], [1, 1, 1], sideLight);
        this.addTriangle([x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [0, 0, 1], [sideUv[0], sideUv[3], sideUv[2], sideUv[3], sideUv[2], sideUv[1]], [1, 1, 1], sideLight);
        break;

      case VoxelOrientation.WEST: // Incline goes UP to East (x+), DOWN to West (x-)
      default:
        this.addQuad(
          [x0, y0, z1],
          [x0, y0, z0],
          [x1, y1, z0],
          [x1, y1, z1],
          [-0.707, 0.707, 0],
          topUv,
          [1, 1, 1, 1],
          topLight
        );
        // Back wall (East)
        this.addQuad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        // Bottom
        this.addQuad([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], [0, -1, 0], bottomUv, [1, 1, 1, 1], botLight);
        // Front/Back triangles
        this.addTriangle([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [0, 0, -1], [sideUv[0], sideUv[3], sideUv[0], sideUv[3], sideUv[2], sideUv[1]], [1, 1, 1], sideLight);
        this.addTriangle([x0, y0, z1], [x1, y1, z1], [x1, y0, z1], [0, 0, 1], [sideUv[0], sideUv[3], sideUv[2], sideUv[1], sideUv[2], sideUv[3]], [1, 1, 1], sideLight);
        break;
    }
  }

  /**
   * Generates Half-Slab geometry (height = 0.5)
   */
  public addHalfSlab(
    x: number,
    y: number,
    z: number,
    isTop: boolean = false,
    rgba: [number, number, number, number] = [1, 1, 1, 1],
    topUv: [number, number, number, number] = [0, 0, 1, 1],
    sideUv: [number, number, number, number] = [0, 0, 1, 1],
    bottomUv: [number, number, number, number] = [0, 0, 1, 1]
  ): void {
    const y0 = isTop ? y + 0.5 : y;
    const y1 = isTop ? y + 1.0 : y + 0.5;

    const topLight: [number, number, number, number] = [rgba[0], rgba[1], rgba[2], rgba[3]];
    const sideLight: [number, number, number, number] = [rgba[0] * 0.82, rgba[1] * 0.82, rgba[2] * 0.82, rgba[3]];
    const botLight: [number, number, number, number] = [rgba[0] * 0.55, rgba[1] * 0.55, rgba[2] * 0.55, rgba[3]];

    // Top
    this.addQuad([x, y1, z], [x + 1, y1, z], [x + 1, y1, z + 1], [x, y1, z + 1], [0, 1, 0], topUv, [1, 1, 1, 1], topLight);
    // Bottom
    this.addQuad([x, y0, z + 1], [x + 1, y0, z + 1], [x + 1, y0, z], [x, y0, z], [0, -1, 0], bottomUv, [1, 1, 1, 1], botLight);
    // 4 Sides
    this.addQuad([x, y0, z], [x + 1, y0, z], [x + 1, y1, z], [x, y1, z], [0, 0, -1], sideUv, [1, 1, 1, 1], sideLight);
    this.addQuad([x + 1, y0, z + 1], [x, y0, z + 1], [x, y1, z + 1], [x + 1, y1, z + 1], [0, 0, 1], sideUv, [1, 1, 1, 1], sideLight);
    this.addQuad([x, y0, z + 1], [x, y0, z], [x, y1, z], [x, y1, z + 1], [-1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
    this.addQuad([x + 1, y0, z], [x + 1, y0, z + 1], [x + 1, y1, z + 1], [x + 1, y1, z], [1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
  }

  /**
   * Generates 2-step staircase geometry inside a unit bounding box.
   * Bottom step: y..y+0.5, full depth along orientation.
   * Top step: y+0.5..y+1.0, half depth along orientation.
   */
  public addStairsStraight(
    x: number,
    y: number,
    z: number,
    orientation: VoxelOrientationType = VoxelOrientation.NORTH,
    rgba: [number, number, number, number] = [1, 1, 1, 1],
    topUv: [number, number, number, number] = [0, 0, 1, 1],
    sideUv: [number, number, number, number] = [0, 0, 1, 1],
    bottomUv: [number, number, number, number] = [0, 0, 1, 1]
  ): void {
    const topLight: [number, number, number, number] = [rgba[0], rgba[1], rgba[2], rgba[3]];
    const sideLight: [number, number, number, number] = [rgba[0] * 0.8, rgba[1] * 0.8, rgba[2] * 0.8, rgba[3]];
    const botLight: [number, number, number, number] = [rgba[0] * 0.55, rgba[1] * 0.55, rgba[2] * 0.55, rgba[3]];

    const x0 = x, x1 = x + 1;
    const y0 = y, yH = y + 0.5, y1 = y + 1;
    const z0 = z, zH = z + 0.5, z1 = z + 1;

    // Orientation determines which direction stairs ascend.
    // NORTH = ascending toward +Z, SOUTH = ascending toward -Z, etc.
    switch (orientation) {
      case VoxelOrientation.SOUTH: {
        // Bottom step: z0..z1, y0..yH (full width, full depth, half height)
        this.addQuad([x0, yH, z0], [x1, yH, z0], [x1, yH, z1], [x0, yH, z1], [0, 1, 0], topUv, [1, 1, 1, 1], topLight);
        this.addQuad([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], [0, -1, 0], bottomUv, [1, 1, 1, 1], botLight);
        // Top step: z0..zH, yH..y1
        this.addQuad([x0, y1, z0], [x1, y1, z0], [x1, y1, zH], [x0, y1, zH], [0, 1, 0], topUv, [1, 1, 1, 1], topLight);
        // Front face of top step
        this.addQuad([x0, yH, zH], [x1, yH, zH], [x1, y1, zH], [x0, y1, zH], [0, 0, 1], sideUv, [1, 1, 1, 1], sideLight);
        // Side faces
        this.addQuad([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [-1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        // Back face
        this.addQuad([x1, y0, z1], [x0, y0, z1], [x0, yH, z1], [x1, yH, z1], [0, 0, 1], sideUv, [1, 1, 1, 1], sideLight);
        // Front face bottom step
        this.addQuad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1], sideUv, [1, 1, 1, 1], sideLight);
        break;
      }
      case VoxelOrientation.EAST: {
        this.addQuad([x0, yH, z0], [x1, yH, z0], [x1, yH, z1], [x0, yH, z1], [0, 1, 0], topUv, [1, 1, 1, 1], topLight);
        this.addQuad([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], [0, -1, 0], bottomUv, [1, 1, 1, 1], botLight);
        // Top step: xH..x1, yH..y1
        const xH = x + 0.5;
        this.addQuad([xH, y1, z0], [x1, y1, z0], [x1, y1, z1], [xH, y1, z1], [0, 1, 0], topUv, [1, 1, 1, 1], topLight);
        this.addQuad([xH, yH, z0], [xH, yH, z1], [xH, y1, z1], [xH, y1, z0], [-1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [0, 0, 1], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x0, y0, z1], [x0, y0, z0], [x0, yH, z0], [x0, yH, z1], [-1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        break;
      }
      case VoxelOrientation.WEST: {
        this.addQuad([x0, yH, z0], [x1, yH, z0], [x1, yH, z1], [x0, yH, z1], [0, 1, 0], topUv, [1, 1, 1, 1], topLight);
        this.addQuad([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], [0, -1, 0], bottomUv, [1, 1, 1, 1], botLight);
        const xH2 = x + 0.5;
        this.addQuad([x0, y1, z0], [xH2, y1, z0], [xH2, y1, z1], [x0, y1, z1], [0, 1, 0], topUv, [1, 1, 1, 1], topLight);
        this.addQuad([xH2, yH, z1], [xH2, yH, z0], [xH2, y1, z0], [xH2, y1, z1], [1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [0, 0, 1], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [-1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x1, y0, z0], [x1, y0, z1], [x1, yH, z1], [x1, yH, z0], [1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        break;
      }
      default: { // NORTH — ascending toward +Z
        this.addQuad([x0, yH, z0], [x1, yH, z0], [x1, yH, z1], [x0, yH, z1], [0, 1, 0], topUv, [1, 1, 1, 1], topLight);
        this.addQuad([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], [0, -1, 0], bottomUv, [1, 1, 1, 1], botLight);
        this.addQuad([x0, y1, zH], [x1, y1, zH], [x1, y1, z1], [x0, y1, z1], [0, 1, 0], topUv, [1, 1, 1, 1], topLight);
        this.addQuad([x1, yH, zH], [x0, yH, zH], [x0, y1, zH], [x1, y1, zH], [0, 0, -1], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [-1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x0, y0, z0], [x1, y0, z0], [x1, yH, z0], [x0, yH, z0], [0, 0, -1], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [0, 0, 1], sideUv, [1, 1, 1, 1], sideLight);
        break;
      }
    }
  }

  /**
   * Generates L-shaped corner staircase geometry.
   * Bottom slab fills the whole XZ footprint at half height; top slab fills one corner quadrant.
   */
  public addStairsCorner(
    x: number,
    y: number,
    z: number,
    orientation: VoxelOrientationType = VoxelOrientation.NORTH,
    rgba: [number, number, number, number] = [1, 1, 1, 1],
    topUv: [number, number, number, number] = [0, 0, 1, 1],
    sideUv: [number, number, number, number] = [0, 0, 1, 1],
    bottomUv: [number, number, number, number] = [0, 0, 1, 1]
  ): void {
    // Bottom half-slab (full footprint)
    this.addHalfSlab(x, y, z, false, rgba, topUv, sideUv, bottomUv);

    const topLight: [number, number, number, number] = [rgba[0], rgba[1], rgba[2], rgba[3]];
    const sideLight: [number, number, number, number] = [rgba[0] * 0.8, rgba[1] * 0.8, rgba[2] * 0.8, rgba[3]];

    // Top quarter block positioned by orientation
    const yH = y + 0.5;
    const y1 = y + 1.0;
    const xH = x + 0.5;
    const zH = z + 0.5;

    let qx0: number, qx1: number, qz0: number, qz1: number;
    switch (orientation) {
      case VoxelOrientation.SOUTH: qx0 = x; qx1 = xH; qz0 = z; qz1 = zH; break;
      case VoxelOrientation.EAST:  qx0 = xH; qx1 = x + 1; qz0 = z; qz1 = zH; break;
      case VoxelOrientation.WEST:  qx0 = x; qx1 = xH; qz0 = zH; qz1 = z + 1; break;
      default:                     qx0 = xH; qx1 = x + 1; qz0 = zH; qz1 = z + 1; break; // NORTH
    }

    // Top face
    this.addQuad([qx0, y1, qz0], [qx1, y1, qz0], [qx1, y1, qz1], [qx0, y1, qz1], [0, 1, 0], topUv, [1, 1, 1, 1], topLight);
    // 4 sides of quarter block
    this.addQuad([qx0, yH, qz0], [qx1, yH, qz0], [qx1, y1, qz0], [qx0, y1, qz0], [0, 0, -1], sideUv, [1, 1, 1, 1], sideLight);
    this.addQuad([qx1, yH, qz1], [qx0, yH, qz1], [qx0, y1, qz1], [qx1, y1, qz1], [0, 0, 1], sideUv, [1, 1, 1, 1], sideLight);
    this.addQuad([qx0, yH, qz1], [qx0, yH, qz0], [qx0, y1, qz0], [qx0, y1, qz1], [-1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
    this.addQuad([qx1, yH, qz0], [qx1, yH, qz1], [qx1, y1, qz1], [qx1, y1, qz0], [1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
  }

  /**
   * Generates gentle slope base geometry (bottom half of a 2-block gentle ramp, ~22.5°).
   * Full cube width, half height, angled top face from y to y+0.5.
   */
  public addSlopeGentleBase(
    x: number,
    y: number,
    z: number,
    orientation: VoxelOrientationType = VoxelOrientation.NORTH,
    rgba: [number, number, number, number] = [1, 1, 1, 1],
    topUv: [number, number, number, number] = [0, 0, 1, 1],
    sideUv: [number, number, number, number] = [0, 0, 1, 1],
    bottomUv: [number, number, number, number] = [0, 0, 1, 1]
  ): void {
    const x0 = x, x1 = x + 1;
    const y0 = y, yH = y + 0.5;
    const z0 = z, z1 = z + 1;

    const topLight: [number, number, number, number] = [rgba[0] * 0.95, rgba[1] * 0.95, rgba[2] * 0.95, rgba[3]];
    const sideLight: [number, number, number, number] = [rgba[0] * 0.8, rgba[1] * 0.8, rgba[2] * 0.8, rgba[3]];
    const botLight: [number, number, number, number] = [rgba[0] * 0.55, rgba[1] * 0.55, rgba[2] * 0.55, rgba[3]];

    // Bottom face
    this.addQuad([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], [0, -1, 0], bottomUv, [1, 1, 1, 1], botLight);

    switch (orientation) {
      case VoxelOrientation.SOUTH: // Low at z0, rises to yH at z1
        this.addQuad([x0, y0, z0], [x1, y0, z0], [x1, yH, z1], [x0, yH, z1], [0, 0.894, -0.447], topUv, [1, 1, 1, 1], topLight);
        this.addQuad([x1, y0, z1], [x0, y0, z1], [x0, yH, z1], [x1, yH, z1], [0, 0, 1], sideUv, [1, 1, 1, 1], sideLight);
        this.addTriangle([x0, y0, z0], [x0, yH, z1], [x0, y0, z1], [-1, 0, 0], [sideUv[0], sideUv[3], sideUv[2], sideUv[3], sideUv[0], sideUv[1]], [1, 1, 1], sideLight);
        this.addTriangle([x1, y0, z0], [x1, y0, z1], [x1, yH, z1], [1, 0, 0], [sideUv[0], sideUv[3], sideUv[2], sideUv[3], sideUv[2], sideUv[1]], [1, 1, 1], sideLight);
        break;
      case VoxelOrientation.EAST: // Low at x0, rises to yH at x1
        this.addQuad([x0, y0, z1], [x0, y0, z0], [x1, yH, z0], [x1, yH, z1], [0.894, 0.447, 0], topUv, [1, 1, 1, 1], topLight);
        this.addQuad([x1, y0, z0], [x1, y0, z1], [x1, yH, z1], [x1, yH, z0], [1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        this.addTriangle([x0, y0, z0], [x1, yH, z0], [x1, y0, z0], [0, 0, -1], [sideUv[0], sideUv[3], sideUv[2], sideUv[1], sideUv[2], sideUv[3]], [1, 1, 1], sideLight);
        this.addTriangle([x0, y0, z1], [x1, y0, z1], [x1, yH, z1], [0, 0, 1], [sideUv[0], sideUv[3], sideUv[2], sideUv[3], sideUv[2], sideUv[1]], [1, 1, 1], sideLight);
        break;
      case VoxelOrientation.WEST: // Low at x1, rises to yH at x0
        this.addQuad([x1, y0, z0], [x1, y0, z1], [x0, yH, z1], [x0, yH, z0], [-0.894, 0.447, 0], topUv, [1, 1, 1, 1], topLight);
        this.addQuad([x0, y0, z1], [x0, y0, z0], [x0, yH, z0], [x0, yH, z1], [-1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        this.addTriangle([x1, y0, z0], [x0, yH, z0], [x0, y0, z0], [0, 0, -1], [sideUv[2], sideUv[3], sideUv[0], sideUv[1], sideUv[0], sideUv[3]], [1, 1, 1], sideLight);
        this.addTriangle([x1, y0, z1], [x0, y0, z1], [x0, yH, z1], [0, 0, 1], [sideUv[0], sideUv[3], sideUv[2], sideUv[3], sideUv[2], sideUv[1]], [1, 1, 1], sideLight);
        break;
      default: // NORTH: Low at z1, rises to yH at z0
        this.addQuad([x1, y0, z1], [x0, y0, z1], [x0, yH, z0], [x1, yH, z0], [0, 0.894, 0.447], topUv, [1, 1, 1, 1], topLight);
        this.addQuad([x0, y0, z0], [x1, y0, z0], [x1, yH, z0], [x0, yH, z0], [0, 0, -1], sideUv, [1, 1, 1, 1], sideLight);
        this.addTriangle([x0, y0, z1], [x0, y0, z0], [x0, yH, z0], [-1, 0, 0], [sideUv[2], sideUv[3], sideUv[0], sideUv[3], sideUv[0], sideUv[1]], [1, 1, 1], sideLight);
        this.addTriangle([x1, y0, z1], [x1, yH, z0], [x1, y0, z0], [1, 0, 0], [sideUv[0], sideUv[3], sideUv[0], sideUv[1], sideUv[2], sideUv[3]], [1, 1, 1], sideLight);
        break;
    }
  }

  /**
   * Generates gentle slope top geometry (top half of a 2-block gentle ramp, ~22.5°).
   * Angled top face from y+0.5 to y+1.0.
   */
  public addSlopeGentleTop(
    x: number,
    y: number,
    z: number,
    orientation: VoxelOrientationType = VoxelOrientation.NORTH,
    rgba: [number, number, number, number] = [1, 1, 1, 1],
    topUv: [number, number, number, number] = [0, 0, 1, 1],
    sideUv: [number, number, number, number] = [0, 0, 1, 1],
    bottomUv: [number, number, number, number] = [0, 0, 1, 1]
  ): void {
    const x0 = x, x1 = x + 1;
    const y0 = y, yH = y + 0.5, y1 = y + 1;
    const z0 = z, z1 = z + 1;

    const topLight: [number, number, number, number] = [rgba[0] * 0.95, rgba[1] * 0.95, rgba[2] * 0.95, rgba[3]];
    const sideLight: [number, number, number, number] = [rgba[0] * 0.8, rgba[1] * 0.8, rgba[2] * 0.8, rgba[3]];
    const botLight: [number, number, number, number] = [rgba[0] * 0.55, rgba[1] * 0.55, rgba[2] * 0.55, rgba[3]];

    // Bottom face (full)
    this.addQuad([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], [0, -1, 0], bottomUv, [1, 1, 1, 1], botLight);

    switch (orientation) {
      case VoxelOrientation.SOUTH:
        this.addQuad([x0, yH, z0], [x1, yH, z0], [x1, y1, z1], [x0, y1, z1], [0, 0.894, -0.447], topUv, [1, 1, 1, 1], topLight);
        // Back wall
        this.addQuad([x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [0, 0, 1], sideUv, [1, 1, 1, 1], sideLight);
        // Front (partial)
        this.addQuad([x0, y0, z0], [x1, y0, z0], [x1, yH, z0], [x0, yH, z0], [0, 0, -1], sideUv, [1, 1, 1, 1], sideLight);
        // Sides
        this.addQuad([x0, y0, z1], [x0, y0, z0], [x0, yH, z0], [x0, y1, z1], [-1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, yH, z0], [1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        break;
      case VoxelOrientation.EAST:
        this.addQuad([x0, yH, z1], [x0, yH, z0], [x1, y1, z0], [x1, y1, z1], [0.894, 0.447, 0], topUv, [1, 1, 1, 1], topLight);
        this.addQuad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x0, y0, z1], [x0, y0, z0], [x0, yH, z0], [x0, yH, z1], [-1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, yH, z0], [0, 0, -1], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x1, y0, z1], [x0, y0, z1], [x0, yH, z1], [x1, y1, z1], [0, 0, 1], sideUv, [1, 1, 1, 1], sideLight);
        break;
      case VoxelOrientation.WEST:
        this.addQuad([x1, yH, z0], [x1, yH, z1], [x0, y1, z1], [x0, y1, z0], [-0.894, 0.447, 0], topUv, [1, 1, 1, 1], topLight);
        this.addQuad([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [-1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x1, y0, z0], [x1, y0, z1], [x1, yH, z1], [x1, yH, z0], [1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x0, y0, z0], [x1, y0, z0], [x1, yH, z0], [x0, y1, z0], [0, 0, -1], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, yH, z1], [0, 0, 1], sideUv, [1, 1, 1, 1], sideLight);
        break;
      default: // NORTH
        this.addQuad([x1, yH, z1], [x0, yH, z1], [x0, y1, z0], [x1, y1, z0], [0, 0.894, 0.447], topUv, [1, 1, 1, 1], topLight);
        this.addQuad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x1, y0, z1], [x0, y0, z1], [x0, yH, z1], [x1, yH, z1], [0, 0, 1], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, yH, z1], [-1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x1, y0, z0], [x1, y0, z1], [x1, yH, z1], [x1, y1, z0], [1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        break;
    }
  }

  /**
   * Generates exterior corner slope wedge — a triangular prism filling one corner.
   */
  public addSlopeCornerOuter(
    x: number,
    y: number,
    z: number,
    orientation: VoxelOrientationType = VoxelOrientation.NORTH,
    rgba: [number, number, number, number] = [1, 1, 1, 1],
    topUv: [number, number, number, number] = [0, 0, 1, 1],
    sideUv: [number, number, number, number] = [0, 0, 1, 1],
    bottomUv: [number, number, number, number] = [0, 0, 1, 1]
  ): void {
    const x0 = x, x1 = x + 1;
    const y0 = y, y1 = y + 1;
    const z0 = z, z1 = z + 1;

    const topLight: [number, number, number, number] = [rgba[0] * 0.95, rgba[1] * 0.95, rgba[2] * 0.95, rgba[3]];
    const sideLight: [number, number, number, number] = [rgba[0] * 0.8, rgba[1] * 0.8, rgba[2] * 0.8, rgba[3]];
    const botLight: [number, number, number, number] = [rgba[0] * 0.55, rgba[1] * 0.55, rgba[2] * 0.55, rgba[3]];

    // Bottom face triangle
    // Apex point is at y1, two base points at y0
    // Orientation determines which corner has the apex
    let apex: [number, number, number];
    let base0: [number, number, number];
    let base1: [number, number, number];
    let base2: [number, number, number];

    switch (orientation) {
      case VoxelOrientation.SOUTH: // Apex at (x1, y1, z0)
        apex = [x1, y1, z0]; base0 = [x0, y0, z0]; base1 = [x1, y0, z1]; base2 = [x0, y0, z1];
        break;
      case VoxelOrientation.EAST: // Apex at (x1, y1, z1)
        apex = [x1, y1, z1]; base0 = [x1, y0, z0]; base1 = [x0, y0, z1]; base2 = [x0, y0, z0];
        break;
      case VoxelOrientation.WEST: // Apex at (x0, y1, z0)
        apex = [x0, y1, z0]; base0 = [x0, y0, z1]; base1 = [x1, y0, z0]; base2 = [x1, y0, z1];
        break;
      default: // NORTH: Apex at (x0, y1, z1)
        apex = [x0, y1, z1]; base0 = [x1, y0, z1]; base1 = [x0, y0, z0]; base2 = [x1, y0, z0];
        break;
    }

    // Bottom face (triangle)
    this.addTriangle(base0, base2, base1, [0, -1, 0],
      [bottomUv[0], bottomUv[3], bottomUv[2], bottomUv[3], bottomUv[2], bottomUv[1]], [1, 1, 1], botLight);

    // 3 sloped faces (triangles from apex to each base edge)
    this.addTriangle(apex, base0, base1, [0, 0.577, 0.577],
      [topUv[0], topUv[1], topUv[2], topUv[3], topUv[0], topUv[3]], [1, 1, 1], topLight);
    this.addTriangle(apex, base1, base2, [0, 0.577, 0.577],
      [topUv[0], topUv[1], topUv[0], topUv[3], topUv[2], topUv[3]], [1, 1, 1], sideLight);
    this.addTriangle(apex, base2, base0, [0, 0.577, 0.577],
      [topUv[2], topUv[1], topUv[0], topUv[3], topUv[2], topUv[3]], [1, 1, 1], sideLight);
  }

  /**
   * Generates interior corner slope — fills the concave void where two slopes meet.
   * This is essentially a full cube minus one triangular wedge at the top.
   */
  public addSlopeCornerInner(
    x: number,
    y: number,
    z: number,
    orientation: VoxelOrientationType = VoxelOrientation.NORTH,
    rgba: [number, number, number, number] = [1, 1, 1, 1],
    topUv: [number, number, number, number] = [0, 0, 1, 1],
    sideUv: [number, number, number, number] = [0, 0, 1, 1],
    bottomUv: [number, number, number, number] = [0, 0, 1, 1]
  ): void {
    const x0 = x, x1 = x + 1;
    const y0 = y, y1 = y + 1;
    const z0 = z, z1 = z + 1;

    const topLight: [number, number, number, number] = [rgba[0] * 0.95, rgba[1] * 0.95, rgba[2] * 0.95, rgba[3]];
    const sideLight: [number, number, number, number] = [rgba[0] * 0.8, rgba[1] * 0.8, rgba[2] * 0.8, rgba[3]];
    const botLight: [number, number, number, number] = [rgba[0] * 0.55, rgba[1] * 0.55, rgba[2] * 0.55, rgba[3]];

    // Bottom face (full quad)
    this.addQuad([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], [0, -1, 0], bottomUv, [1, 1, 1, 1], botLight);

    // 3 of 4 top vertices at y1, one "cut" vertex at y0
    // Which corner is cut depends on orientation
    let topA: [number, number, number], topB: [number, number, number], topC: [number, number, number];
    let cutBot: [number, number, number];

    switch (orientation) {
      case VoxelOrientation.SOUTH: // Cut corner at (x0, z1)
        topA = [x0, y1, z0]; topB = [x1, y1, z0]; topC = [x1, y1, z1]; cutBot = [x0, y0, z1];
        break;
      case VoxelOrientation.EAST: // Cut corner at (x0, z0)
        topA = [x0, y1, z1]; topB = [x1, y1, z0]; topC = [x1, y1, z1]; cutBot = [x0, y0, z0];
        break;
      case VoxelOrientation.WEST: // Cut corner at (x1, z1)
        topA = [x0, y1, z0]; topB = [x0, y1, z1]; topC = [x1, y1, z0]; cutBot = [x1, y0, z1];
        break;
      default: // NORTH: Cut corner at (x1, z0)
        topA = [x0, y1, z0]; topB = [x0, y1, z1]; topC = [x1, y1, z1]; cutBot = [x1, y0, z0];
        break;
    }

    // Top face (triangle of 3 top verts)
    this.addTriangle(topA, topB, topC, [0, 1, 0],
      [topUv[0], topUv[1], topUv[0], topUv[3], topUv[2], topUv[3]], [1, 1, 1], topLight);

    // Sloped face (triangle from two adjacent top verts to cut corner)
    this.addTriangle(topA, topC, cutBot, [0, 0.577, -0.577],
      [sideUv[0], sideUv[1], sideUv[2], sideUv[1], sideUv[1], sideUv[3]], [1, 1, 1], sideLight);

    // Full side walls (the 2 walls that go full height)
    // These need to be determined by orientation — both walls adjacent to the high corner
    this.addQuad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1], sideUv, [1, 1, 1, 1], [rgba[0] * 0.84, rgba[1] * 0.84, rgba[2] * 0.84, rgba[3]]);
    this.addQuad([x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [0, 0, 1], sideUv, [1, 1, 1, 1], [rgba[0] * 0.88, rgba[1] * 0.88, rgba[2] * 0.88, rgba[3]]);
    this.addQuad([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [-1, 0, 0], sideUv, [1, 1, 1, 1], [rgba[0] * 0.74, rgba[1] * 0.74, rgba[2] * 0.74, rgba[3]]);
    this.addQuad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0], sideUv, [1, 1, 1, 1], [rgba[0] * 0.78, rgba[1] * 0.78, rgba[2] * 0.78, rgba[3]]);
  }

  /**
   * Generates diagonal half-cube prism — cuts the block diagonally from one edge to the opposite.
   */
  public addPrismDiagonal(
    x: number,
    y: number,
    z: number,
    orientation: VoxelOrientationType = VoxelOrientation.NORTH,
    rgba: [number, number, number, number] = [1, 1, 1, 1],
    topUv: [number, number, number, number] = [0, 0, 1, 1],
    sideUv: [number, number, number, number] = [0, 0, 1, 1],
    bottomUv: [number, number, number, number] = [0, 0, 1, 1]
  ): void {
    const x0 = x, x1 = x + 1;
    const y0 = y, y1 = y + 1;
    const z0 = z, z1 = z + 1;

    const sideLight: [number, number, number, number] = [rgba[0] * 0.82, rgba[1] * 0.82, rgba[2] * 0.82, rgba[3]];
    const botLight: [number, number, number, number] = [rgba[0] * 0.55, rgba[1] * 0.55, rgba[2] * 0.55, rgba[3]];

    switch (orientation) {
      case VoxelOrientation.EAST: // Diagonal from (x0,z0) to (x1,z1)
        this.addQuad([x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0], [0.707, 0, -0.707], topUv, [1, 1, 1, 1], rgba);
        this.addTriangle([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [0, -1, 0], [bottomUv[0], bottomUv[3], bottomUv[2], bottomUv[3], bottomUv[2], bottomUv[1]], [1, 1, 1], botLight);
        this.addTriangle([x0, y1, z0], [x1, y1, z1], [x1, y1, z0], [0, 1, 0], [topUv[0], topUv[1], topUv[2], topUv[3], topUv[2], topUv[1]], [1, 1, 1], rgba);
        this.addQuad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        break;
      case VoxelOrientation.WEST: // Diagonal from (x1,z0) to (x0,z1)
        this.addQuad([x1, y0, z0], [x0, y0, z1], [x0, y1, z1], [x1, y1, z0], [-0.707, 0, -0.707], topUv, [1, 1, 1, 1], rgba);
        this.addTriangle([x0, y0, z0], [x0, y0, z1], [x1, y0, z0], [0, -1, 0], [bottomUv[0], bottomUv[1], bottomUv[0], bottomUv[3], bottomUv[2], bottomUv[3]], [1, 1, 1], botLight);
        this.addTriangle([x0, y1, z0], [x1, y1, z0], [x0, y1, z1], [0, 1, 0], [topUv[0], topUv[3], topUv[2], topUv[1], topUv[0], topUv[1]], [1, 1, 1], rgba);
        this.addQuad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [-1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        break;
      case VoxelOrientation.SOUTH: // Diagonal from (x0,z1) to (x1,z0)
        this.addQuad([x0, y0, z1], [x1, y0, z0], [x1, y1, z0], [x0, y1, z1], [0.707, 0, 0.707], topUv, [1, 1, 1, 1], rgba);
        this.addTriangle([x0, y0, z0], [x0, y0, z1], [x1, y0, z0], [0, -1, 0], [bottomUv[0], bottomUv[3], bottomUv[0], bottomUv[1], bottomUv[2], bottomUv[3]], [1, 1, 1], botLight);
        this.addTriangle([x0, y1, z0], [x1, y1, z0], [x0, y1, z1], [0, 1, 0], [topUv[0], topUv[3], topUv[2], topUv[3], topUv[0], topUv[1]], [1, 1, 1], rgba);
        this.addQuad([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [-1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
        break;
      default: // NORTH: Diagonal from (x0,z0) to (x1,z1) — same as EAST but flipped
        this.addQuad([x1, y0, z1], [x0, y0, z0], [x0, y1, z0], [x1, y1, z1], [-0.707, 0, 0.707], topUv, [1, 1, 1, 1], rgba);
        this.addTriangle([x0, y0, z1], [x1, y0, z1], [x0, y0, z0], [0, -1, 0], [bottomUv[0], bottomUv[1], bottomUv[2], bottomUv[1], bottomUv[0], bottomUv[3]], [1, 1, 1], botLight);
        this.addTriangle([x0, y1, z1], [x0, y1, z0], [x1, y1, z1], [0, 1, 0], [topUv[0], topUv[1], topUv[0], topUv[3], topUv[2], topUv[1]], [1, 1, 1], rgba);
        this.addQuad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1], sideUv, [1, 1, 1, 1], sideLight);
        this.addQuad([x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [0, 0, 1], sideUv, [1, 1, 1, 1], sideLight);
        break;
    }
  }

  /**
   * Generates centered column/pillar geometry (0.25..0.75 in X and Z, full height).
   */
  public addColumnCenter(
    x: number,
    y: number,
    z: number,
    rgba: [number, number, number, number] = [1, 1, 1, 1],
    topUv: [number, number, number, number] = [0, 0, 1, 1],
    sideUv: [number, number, number, number] = [0, 0, 1, 1],
    bottomUv: [number, number, number, number] = [0, 0, 1, 1]
  ): void {
    const inset = 0.25;
    const cx0 = x + inset, cx1 = x + 1 - inset;
    const cz0 = z + inset, cz1 = z + 1 - inset;
    const y0 = y, y1 = y + 1;

    const topLight: [number, number, number, number] = [rgba[0], rgba[1], rgba[2], rgba[3]];
    const sideLight: [number, number, number, number] = [rgba[0] * 0.82, rgba[1] * 0.82, rgba[2] * 0.82, rgba[3]];
    const botLight: [number, number, number, number] = [rgba[0] * 0.55, rgba[1] * 0.55, rgba[2] * 0.55, rgba[3]];

    // Top
    this.addQuad([cx0, y1, cz0], [cx1, y1, cz0], [cx1, y1, cz1], [cx0, y1, cz1], [0, 1, 0], topUv, [1, 1, 1, 1], topLight);
    // Bottom
    this.addQuad([cx0, y0, cz1], [cx1, y0, cz1], [cx1, y0, cz0], [cx0, y0, cz0], [0, -1, 0], bottomUv, [1, 1, 1, 1], botLight);
    // 4 Sides
    this.addQuad([cx0, y0, cz0], [cx1, y0, cz0], [cx1, y1, cz0], [cx0, y1, cz0], [0, 0, -1], sideUv, [1, 1, 1, 1], sideLight);
    this.addQuad([cx1, y0, cz1], [cx0, y0, cz1], [cx0, y1, cz1], [cx1, y1, cz1], [0, 0, 1], sideUv, [1, 1, 1, 1], sideLight);
    this.addQuad([cx0, y0, cz1], [cx0, y0, cz0], [cx0, y1, cz0], [cx0, y1, cz1], [-1, 0, 0], sideUv, [1, 1, 1, 1], [rgba[0] * 0.74, rgba[1] * 0.74, rgba[2] * 0.74, rgba[3]]);
    this.addQuad([cx1, y0, cz0], [cx1, y0, cz1], [cx1, y1, cz1], [cx1, y1, cz0], [1, 0, 0], sideUv, [1, 1, 1, 1], [rgba[0] * 0.78, rgba[1] * 0.78, rgba[2] * 0.78, rgba[3]]);
  }

  /**
   * Generates thin fence rail/post geometry (0.4375..0.5625 width, full height, centered).
   */
  public addFenceRail(
    x: number,
    y: number,
    z: number,
    orientation: VoxelOrientationType = VoxelOrientation.NORTH,
    rgba: [number, number, number, number] = [1, 1, 1, 1],
    topUv: [number, number, number, number] = [0, 0, 1, 1],
    sideUv: [number, number, number, number] = [0, 0, 1, 1],
    bottomUv: [number, number, number, number] = [0, 0, 1, 1]
  ): void {
    const thick = 0.125; // 1/8 of a block
    const y0 = y, y1 = y + 1;

    const topLight: [number, number, number, number] = [rgba[0], rgba[1], rgba[2], rgba[3]];
    const sideLight: [number, number, number, number] = [rgba[0] * 0.82, rgba[1] * 0.82, rgba[2] * 0.82, rgba[3]];
    const botLight: [number, number, number, number] = [rgba[0] * 0.55, rgba[1] * 0.55, rgba[2] * 0.55, rgba[3]];

    let fx0: number, fx1: number, fz0: number, fz1: number;

    // Fence post (center pillar) always present
    const postInset = 0.375;
    const px0 = x + postInset, px1 = x + 1 - postInset;
    const pz0 = z + postInset, pz1 = z + 1 - postInset;

    // Post top & bottom
    this.addQuad([px0, y1, pz0], [px1, y1, pz0], [px1, y1, pz1], [px0, y1, pz1], [0, 1, 0], topUv, [1, 1, 1, 1], topLight);
    this.addQuad([px0, y0, pz1], [px1, y0, pz1], [px1, y0, pz0], [px0, y0, pz0], [0, -1, 0], bottomUv, [1, 1, 1, 1], botLight);
    // Post sides
    this.addQuad([px0, y0, pz0], [px1, y0, pz0], [px1, y1, pz0], [px0, y1, pz0], [0, 0, -1], sideUv, [1, 1, 1, 1], sideLight);
    this.addQuad([px1, y0, pz1], [px0, y0, pz1], [px0, y1, pz1], [px1, y1, pz1], [0, 0, 1], sideUv, [1, 1, 1, 1], sideLight);
    this.addQuad([px0, y0, pz1], [px0, y0, pz0], [px0, y1, pz0], [px0, y1, pz1], [-1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
    this.addQuad([px1, y0, pz0], [px1, y0, pz1], [px1, y1, pz1], [px1, y1, pz0], [1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);

    // Rail bar extending in the orientation direction (thin cross-beam at y+0.5..y+0.75)
    const rY0 = y + 0.4375, rY1 = y + 0.8125;
    if (orientation === VoxelOrientation.NORTH || orientation === VoxelOrientation.SOUTH) {
      // Rail along Z axis
      fx0 = x + 0.5 - thick; fx1 = x + 0.5 + thick;
      fz0 = z; fz1 = z + 1;
    } else {
      // Rail along X axis
      fx0 = x; fx1 = x + 1;
      fz0 = z + 0.5 - thick; fz1 = z + 0.5 + thick;
    }

    this.addQuad([fx0, rY1, fz0], [fx1, rY1, fz0], [fx1, rY1, fz1], [fx0, rY1, fz1], [0, 1, 0], topUv, [1, 1, 1, 1], topLight);
    this.addQuad([fx0, rY0, fz1], [fx1, rY0, fz1], [fx1, rY0, fz0], [fx0, rY0, fz0], [0, -1, 0], bottomUv, [1, 1, 1, 1], botLight);
    this.addQuad([fx0, rY0, fz0], [fx1, rY0, fz0], [fx1, rY1, fz0], [fx0, rY1, fz0], [0, 0, -1], sideUv, [1, 1, 1, 1], sideLight);
    this.addQuad([fx1, rY0, fz1], [fx0, rY0, fz1], [fx0, rY1, fz1], [fx1, rY1, fz1], [0, 0, 1], sideUv, [1, 1, 1, 1], sideLight);
    this.addQuad([fx0, rY0, fz1], [fx0, rY0, fz0], [fx0, rY1, fz0], [fx0, rY1, fz1], [-1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
    this.addQuad([fx1, rY0, fz0], [fx1, rY0, fz1], [fx1, rY1, fz1], [fx1, rY1, fz0], [1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
  }

  /**
   * Generates Farmland (tilled soil) geometry.
   * Recessed top surface (15/16 height = 0.9375y) with moisture tinting.
   */
  public addFarmland(
    x: number,
    y: number,
    z: number,
    isMoist: boolean = false,
    rgba: [number, number, number, number] = [1, 1, 1, 1],
    topUv: [number, number, number, number] = [0, 0, 1, 1],
    sideUv: [number, number, number, number] = [0, 0, 1, 1],
    bottomUv: [number, number, number, number] = [0, 0, 1, 1]
  ): void {
    const x0 = x, x1 = x + 1;
    const z0 = z, z1 = z + 1;
    const y0 = y, y1 = y + 0.9375; // 15/16 height

    const topTint: [number, number, number, number] = isMoist
      ? [rgba[0] * 0.58, rgba[1] * 0.48, rgba[2] * 0.38, rgba[3]]
      : [rgba[0], rgba[1], rgba[2], rgba[3]];

    const sideLight: [number, number, number, number] = [rgba[0] * 0.82, rgba[1] * 0.82, rgba[2] * 0.82, rgba[3]];
    const botLight: [number, number, number, number] = [rgba[0] * 0.55, rgba[1] * 0.55, rgba[2] * 0.55, rgba[3]];

    // Top (sunken surface)
    this.addQuad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [0, 1, 0], topUv, [1, 1, 1, 1], topTint);
    // Bottom
    this.addQuad([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], [0, -1, 0], bottomUv, [1, 1, 1, 1], botLight);
    // North (+Z)
    this.addQuad([x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [0, 0, 1], sideUv, [1, 1, 1, 1], sideLight);
    // South (-Z)
    this.addQuad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1], sideUv, [1, 1, 1, 1], sideLight);
    // East (+X)
    this.addQuad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
    // West (-X)
    this.addQuad([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [-1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
  }

  /**
   * Generates double-sided Cross-Quad geometry for crops, foliage, herbs, and wild plants.
   * Two intersecting diagonal vertical planes forming an X.
   */
  public addCrossQuad(
    x: number,
    y: number,
    z: number,
    stageHeightRatio: number = 1.0,
    rgba: [number, number, number, number] = [1, 1, 1, 1],
    uvRange: [number, number, number, number] = [0, 0, 1, 1]
  ): void {
    const x0 = x, x1 = x + 1;
    const z0 = z, z1 = z + 1;
    const y0 = y;
    const y1 = y + Math.max(0.25, Math.min(1.0, stageHeightRatio));

    // Diagonal Plane 1: (x0, z0) -> (x1, z1)
    // Forward face
    this.addQuad([x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0], [0.707, 0, -0.707], uvRange, [1, 1, 1, 1], rgba);
    // Reverse face (for double-sided visibility)
    this.addQuad([x1, y0, z1], [x0, y0, z0], [x0, y1, z0], [x1, y1, z1], [-0.707, 0, 0.707], uvRange, [1, 1, 1, 1], rgba);

    // Diagonal Plane 2: (x0, z1) -> (x1, z0)
    // Forward face
    this.addQuad([x0, y0, z1], [x1, y0, z0], [x1, y1, z0], [x0, y1, z1], [0.707, 0, 0.707], uvRange, [1, 1, 1, 1], rgba);
    // Reverse face (for double-sided visibility)
    this.addQuad([x1, y0, z0], [x0, y0, z1], [x0, y1, z1], [x1, y1, z0], [-0.707, 0, -0.707], uvRange, [1, 1, 1, 1], rgba);
  }

  /**
   * Generates thin carpet/layer geometry (e.g. path overlay, snow crust, mulch).
   */
  public addThinLayer(
    x: number,
    y: number,
    z: number,
    thickness: number = 0.125,
    rgba: [number, number, number, number] = [1, 1, 1, 1],
    topUv: [number, number, number, number] = [0, 0, 1, 1],
    sideUv: [number, number, number, number] = [0, 0, 1, 1],
    bottomUv: [number, number, number, number] = [0, 0, 1, 1]
  ): void {
    const x0 = x, x1 = x + 1;
    const z0 = z, z1 = z + 1;
    const y0 = y, y1 = y + Math.max(0.0625, Math.min(0.5, thickness));

    const topLight = rgba;
    const sideLight: [number, number, number, number] = [rgba[0] * 0.85, rgba[1] * 0.85, rgba[2] * 0.85, rgba[3]];
    const botLight: [number, number, number, number] = [rgba[0] * 0.55, rgba[1] * 0.55, rgba[2] * 0.55, rgba[3]];

    this.addQuad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [0, 1, 0], topUv, [1, 1, 1, 1], topLight);
    this.addQuad([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], [0, -1, 0], bottomUv, [1, 1, 1, 1], botLight);
    this.addQuad([x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [0, 0, 1], sideUv, [1, 1, 1, 1], sideLight);
    this.addQuad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1], sideUv, [1, 1, 1, 1], sideLight);
    this.addQuad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
    this.addQuad([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [-1, 0, 0], sideUv, [1, 1, 1, 1], sideLight);
  }

  /**
   * Generates slightly sunken fluid surface geometry (e.g. water canals, pools).
   */
  public addFluidSurface(
    x: number,
    y: number,
    z: number,
    level: number = 0.875,
    rgba: [number, number, number, number] = [1, 1, 1, 1],
    topUv: [number, number, number, number] = [0, 0, 1, 1],
    sideUv: [number, number, number, number] = [0, 0, 1, 1],
    bottomUv: [number, number, number, number] = [0, 0, 1, 1]
  ): void {
    const x0 = x, x1 = x + 1;
    const z0 = z, z1 = z + 1;
    const y0 = y, y1 = y + Math.max(0.1, Math.min(1.0, level));

    this.addQuad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [0, 1, 0], topUv, [1, 1, 1, 1], rgba);
    this.addQuad([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], [0, -1, 0], bottomUv, [1, 1, 1, 1], [rgba[0] * 0.5, rgba[1] * 0.5, rgba[2] * 0.5, rgba[3]]);
    this.addQuad([x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [0, 0, 1], sideUv, [1, 1, 1, 1], [rgba[0] * 0.8, rgba[1] * 0.8, rgba[2] * 0.8, rgba[3]]);
    this.addQuad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1], sideUv, [1, 1, 1, 1], [rgba[0] * 0.8, rgba[1] * 0.8, rgba[2] * 0.8, rgba[3]]);
    this.addQuad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0], sideUv, [1, 1, 1, 1], [rgba[0] * 0.75, rgba[1] * 0.75, rgba[2] * 0.75, rgba[3]]);
    this.addQuad([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [-1, 0, 0], sideUv, [1, 1, 1, 1], [rgba[0] * 0.75, rgba[1] * 0.75, rgba[2] * 0.75, rgba[3]]);
  }

  public clear(): void {
    this.positions = [];
    this.normals = [];
    this.uvs = [];
    this.indices = [];
    this.colors = [];
    this.vertexCount = 0;
  }
}
