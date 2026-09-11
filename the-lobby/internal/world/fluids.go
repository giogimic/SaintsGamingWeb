package world

const (
	MaterialWater1 = 201 // 1 mass
	MaterialWater2 = 202
	MaterialWater3 = 203
	MaterialWater4 = 204
	MaterialWater5 = 205 // 5 mass (full)
	
	MaterialMagma1 = 211
	MaterialMagma2 = 212
	MaterialMagma3 = 213
	MaterialMagma4 = 214
	MaterialMagma5 = 215

	MaterialBasalt = 6 // from BiomeStrataConfig Basement
	MaterialSteam  = 220
)

func IsFluid(material uint32) bool {
	return (material >= MaterialWater1 && material <= MaterialWater5) ||
		(material >= MaterialMagma1 && material <= MaterialMagma5)
}

func GetFluidMass(material uint32) int {
	if material >= MaterialWater1 && material <= MaterialWater5 {
		return int(material - MaterialWater1 + 1)
	}
	if material >= MaterialMagma1 && material <= MaterialMagma5 {
		return int(material - MaterialMagma1 + 1)
	}
	return 0
}

func GetFluidTypeBase(material uint32) uint32 {
	if material >= MaterialWater1 && material <= MaterialWater5 {
		return MaterialWater1
	}
	if material >= MaterialMagma1 && material <= MaterialMagma5 {
		return MaterialMagma1
	}
	return 0
}

func MakeFluidMaterial(base uint32, mass int) uint32 {
	if mass <= 0 {
		return 0
	}
	if mass > 5 {
		mass = 5
	}
	return base + uint32(mass) - 1
}

// TickFluid runs the cellular automata rules for a single voxel position.
// Returns true if the voxel changed state (to broadcast update).
func TickFluid(m *Manager, instanceID string, x, y, z int, now int64) bool {
	inst, ok := m.instances[instanceID]
	if !ok {
		return false
	}
	worldBlocks := m.GetVoxelMapBlocks(inst.BaseMapID)
	if worldBlocks == nil {
		return false
	}

	word := worldBlocks.GetVoxel(x, y, z)
	if IsVoxelAir(word) {
		return false
	}
	mat := VoxelMaterial(word)
	if !IsFluid(mat) {
		return false
	}
	mass := GetFluidMass(mat)
	if mass <= 0 {
		return false
	}

	baseType := GetFluidTypeBase(mat)
	changed := false

	// Flow Down (Gravity)
	belowWord := worldBlocks.GetVoxel(x, y-1, z)
	if IsVoxelAir(belowWord) || (IsFluid(VoxelMaterial(belowWord)) && GetFluidTypeBase(VoxelMaterial(belowWord)) == baseType && GetFluidMass(VoxelMaterial(belowWord)) < 5) {
		transfer := 5 // Try to move all mass
		if !IsVoxelAir(belowWord) {
			belowMass := GetFluidMass(VoxelMaterial(belowWord))
			transfer = 5 - belowMass
		}
		if transfer > mass {
			transfer = mass
		}
		if transfer > 0 {
			// Move mass down
			newBelowMass := transfer
			if !IsVoxelAir(belowWord) {
				newBelowMass += GetFluidMass(VoxelMaterial(belowWord))
			}
			newBelowMat := MakeFluidMaterial(baseType, newBelowMass)
			worldBlocks.SetVoxel(x, y-1, z, PackVoxel(newBelowMat, ShapeFullCube, 0, 0, PhysicsSwimmableFluid, LogicNone))
			m.ScheduleVoxel(instanceID, x, y-1, z, now+200)

			mass -= transfer
			if mass == 0 {
				worldBlocks.SetVoxel(x, y, z, VoxelWordAir)
				return true // We are empty, done.
			}
			mat = MakeFluidMaterial(baseType, mass)
			worldBlocks.SetVoxel(x, y, z, PackVoxel(mat, ShapeFullCube, 0, 0, PhysicsSwimmableFluid, LogicNone))
			changed = true
		}
	}

	// Lateral Flow
	if mass > 1 {
		neighbors := [][3]int{{x + 1, y, z}, {x - 1, y, z}, {x, y, z + 1}, {x, y, z - 1}}
		for _, n := range neighbors {
			if mass <= 1 {
				break
			}
			nWord := worldBlocks.GetVoxel(n[0], n[1], n[2])
			canFlow := IsVoxelAir(nWord)
			if !canFlow && IsFluid(VoxelMaterial(nWord)) && GetFluidTypeBase(VoxelMaterial(nWord)) == baseType {
				if GetFluidMass(VoxelMaterial(nWord)) < mass-1 {
					canFlow = true
				}
			}

			if canFlow {
				transfer := 1
				nMass := 0
				if !IsVoxelAir(nWord) {
					nMass = GetFluidMass(VoxelMaterial(nWord))
				}
				newNMat := MakeFluidMaterial(baseType, nMass+transfer)
				worldBlocks.SetVoxel(n[0], n[1], n[2], PackVoxel(newNMat, ShapeFullCube, 0, 0, PhysicsSwimmableFluid, LogicNone))
				m.ScheduleVoxel(instanceID, n[0], n[1], n[2], now+200)

				mass -= transfer
				mat = MakeFluidMaterial(baseType, mass)
				worldBlocks.SetVoxel(x, y, z, PackVoxel(mat, ShapeFullCube, 0, 0, PhysicsSwimmableFluid, LogicNone))
				changed = true
			}
		}
	}

	// Magma / Water Reaction
	// Simplification: Check 6 neighbors for opposite fluid
	if baseType == MaterialWater1 || baseType == MaterialMagma1 {
		neighbors := [][3]int{{x + 1, y, z}, {x - 1, y, z}, {x, y, z + 1}, {x, y, z - 1}, {x, y + 1, z}, {x, y - 1, z}}
		for _, n := range neighbors {
			nWord := worldBlocks.GetVoxel(n[0], n[1], n[2])
			if !IsVoxelAir(nWord) {
				nMat := VoxelMaterial(nWord)
				if IsFluid(nMat) && GetFluidTypeBase(nMat) != baseType {
					// Reaction! Turn both into Basalt and Steam (if we wanted to be complex)
					// Simple rule: Water turns into Steam, Magma turns into Basalt
					if baseType == MaterialWater1 {
						worldBlocks.SetVoxel(x, y, z, PackVoxel(MaterialSteam, ShapeAir, 0, 0, PhysicsPassThrough, LogicNone))
						worldBlocks.SetVoxel(n[0], n[1], n[2], PackVoxel(MaterialBasalt, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone))
					} else {
						worldBlocks.SetVoxel(x, y, z, PackVoxel(MaterialBasalt, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone))
						worldBlocks.SetVoxel(n[0], n[1], n[2], PackVoxel(MaterialSteam, ShapeAir, 0, 0, PhysicsPassThrough, LogicNone))
					}
					return true
				}
			}
		}
	}

	if changed {
		m.ScheduleVoxel(instanceID, x, y, z, now+200)
	}
	return changed
}
