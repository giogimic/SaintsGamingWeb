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

    // 2 Triangles (p0 -> p1 -> p2, p0 -> p2 -> p3)
    this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
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
        this.addTriangle([x0, y0, z0], [x0, y0, z0], [x1, y1, z0], [0, 0, -1], [sideUv[0], sideUv[3], sideUv[0], sideUv[3], sideUv[2], sideUv[1]], [1, 1, 1], sideLight);
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

  public clear(): void {
    this.positions = [];
    this.normals = [];
    this.uvs = [];
    this.indices = [];
    this.colors = [];
    this.vertexCount = 0;
  }
}
