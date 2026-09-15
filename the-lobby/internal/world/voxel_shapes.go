package world

// BoundingBox represents an AABB volume relative to a voxel's [0,0,0]-[1,1,1] boundaries.
type BoundingBox struct {
	MinX float64
	MinY float64
	MinZ float64
	MaxX float64
	MaxY float64
	MaxZ float64
}

// ShapeDefinition defines the collision and physics contract for a voxel shape.
type ShapeDefinition struct {
	ShapeID uint8
	// GetSurfaceHeight returns the walkable surface height (0.0 to 1.0) given local X/Z coordinates [0.0, 1.0) within the block.
	// Returns -1.0 if the block cannot be walked on at this coordinate.
	GetSurfaceHeight func(orientation uint8, localX, localZ float64) float64
	// GetCollisionVolumes returns the array of bounding boxes representing the solid, impassable volume.
	GetCollisionVolumes func(orientation uint8) []BoundingBox
}

var ShapeRegistry = make(map[uint8]ShapeDefinition)

func init() {
	// 0: Air
	ShapeRegistry[ShapeAir] = ShapeDefinition{
		ShapeID: ShapeAir,
		GetSurfaceHeight: func(orientation uint8, localX, localZ float64) float64 { return -1.0 },
		GetCollisionVolumes: func(orientation uint8) []BoundingBox { return nil },
	}

	// 1: Full Cube
	ShapeRegistry[ShapeFullCube] = ShapeDefinition{
		ShapeID: ShapeFullCube,
		GetSurfaceHeight: func(orientation uint8, localX, localZ float64) float64 { return 1.0 },
		GetCollisionVolumes: func(orientation uint8) []BoundingBox {
			return []BoundingBox{{0, 0, 0, 1, 1, 1}}
		},
	}

	// 2: Slope 45
	ShapeRegistry[ShapeSlope45] = ShapeDefinition{
		ShapeID: ShapeSlope45,
		GetSurfaceHeight: func(orientation uint8, localX, localZ float64) float64 {
			switch orientation {
			case 0: // NORTH
				return 1.0 - localZ
			case 2: // SOUTH
				return localZ
			case 1: // EAST
				return 1.0 - localX
			case 3: // WEST
				return localX
			default:
				return -1.0 // Inverted slopes not walkable
			}
		},
		GetCollisionVolumes: func(orientation uint8) []BoundingBox {
			return []BoundingBox{{0, 0, 0, 1, 1, 1}}
		},
	}

	// 7: Slab Bottom
	ShapeRegistry[ShapeSlabBottom] = ShapeDefinition{
		ShapeID: ShapeSlabBottom,
		GetSurfaceHeight: func(orientation uint8, localX, localZ float64) float64 { return 0.5 },
		GetCollisionVolumes: func(orientation uint8) []BoundingBox {
			return []BoundingBox{{0, 0, 0, 1, 0.5, 1}}
		},
	}

	// 8: Slab Top
	ShapeRegistry[ShapeSlabTop] = ShapeDefinition{
		ShapeID: ShapeSlabTop,
		GetSurfaceHeight: func(orientation uint8, localX, localZ float64) float64 { return 1.0 },
		GetCollisionVolumes: func(orientation uint8) []BoundingBox {
			return []BoundingBox{{0, 0.5, 0, 1, 1, 1}}
		},
	}

	// 9: Stairs Straight
	ShapeRegistry[ShapeStairsStraight] = ShapeDefinition{
		ShapeID: ShapeStairsStraight,
		GetSurfaceHeight: func(orientation uint8, localX, localZ float64) float64 {
			switch orientation {
			case 0: // NORTH (rises to -Z)
				if localZ < 0.5 {
					return 1.0
				}
				return 0.5
			case 2: // SOUTH (rises to +Z)
				if localZ > 0.5 {
					return 1.0
				}
				return 0.5
			case 1: // EAST (rises to -X)
				if localX < 0.5 {
					return 1.0
				}
				return 0.5
			case 3: // WEST (rises to +X)
				if localX > 0.5 {
					return 1.0
				}
				return 0.5
			default:
				return 1.0
			}
		},
		GetCollisionVolumes: func(orientation uint8) []BoundingBox {
			return []BoundingBox{{0, 0, 0, 1, 1, 1}}
		},
	}
}
