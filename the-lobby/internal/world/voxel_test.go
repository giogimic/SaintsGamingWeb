package world

import (
	"testing"
)

func TestVoxelBitpacking(t *testing.T) {
	matID := uint16(255)
	shape := uint8(ShapeSlope45)
	orient := uint8(2)
	ao := uint8(9)
	phys := uint8(PhysicsWalkableSlope)
	logic := uint8(LogicWarpGate)

	packed := PackVoxel(matID, shape, orient, ao, phys, logic)

	if VoxelMaterial(packed) != matID {
		t.Fatalf("expected matID %d, got %d", matID, VoxelMaterial(packed))
	}
	if VoxelShape(packed) != shape {
		t.Fatalf("expected shape %d, got %d", shape, VoxelShape(packed))
	}
	if VoxelPhysics(packed) != phys {
		t.Fatalf("expected phys %d, got %d", phys, VoxelPhysics(packed))
	}
	if VoxelLogic(packed) != logic {
		t.Fatalf("expected logic %d, got %d", logic, VoxelLogic(packed))
	}
}

func TestVoxelChunkIndexBitwise(t *testing.T) {
	lx, ly, lz := 17, 23, 29
	idx := ChunkIndex(lx, ly, lz)

	if idx < 0 || idx >= ChunkTotalCells {
		t.Fatalf("index %d out of bounds (0..%d)", idx, ChunkTotalCells)
	}

	decomposedLx := idx & ChunkMask
	decomposedLz := (idx >> ChunkShiftZ) & ChunkMask
	decomposedLy := (idx >> (ChunkShiftX + ChunkShiftZ)) & ChunkMask

	if decomposedLx != lx || decomposedLy != ly || decomposedLz != lz {
		t.Fatalf("decomposed (%d,%d,%d) != original (%d,%d,%d)", decomposedLx, decomposedLy, decomposedLz, lx, ly, lz)
	}
}

func TestVoxelRLEDecoding(t *testing.T) {
	stone := PackVoxel(1, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)

	// RLE stream: 100 air, 1 stone, remainder air
	remainder := ChunkTotalCells - 101
	rle := []int{100, 0, 1, int(stone), remainder, 0}

	chunk := DecodeChunkRLE(rle, 0, 0, 0)
	if chunk.Data[100] != stone {
		t.Fatalf("expected cell 100 to be stone, got %d", chunk.Data[100])
	}
	if chunk.Data[99] != 0 {
		t.Fatalf("expected cell 99 to be air, got %d", chunk.Data[99])
	}
	if chunk.Data[101] != 0 {
		t.Fatalf("expected cell 101 to be air, got %d", chunk.Data[101])
	}
}

func TestVoxelWorldTraversability(t *testing.T) {
	demo := BuildDemoVoxelWorld(32, 32)

	// Interior position (10, 10): ground is at Y=15, body at Y=16 is air
	// Standing at Y=16 should be traversable
	if !demo.IsTraversableAt(10, 16, 10) {
		t.Fatalf("expected interior position (10, 16, 10) to be traversable")
	}

	// Boundary wall at (0, 10): wall exists at Y=16
	// Standing at Y=16 should be blocked by wall
	if demo.IsTraversableAt(0, 16, 10) {
		t.Fatalf("expected perimeter wall at (0, 16, 10) to be impassable")
	}

	// Mid-air position at Y=25 (no ground support below at Y=24)
	if demo.IsTraversableAt(10, 25, 10) {
		t.Fatalf("expected mid-air position without ground support to be impassable")
	}
}
