package aoi

import "fmt"

// RoomName for an AOI zone.
func RoomName(instanceID string, zx, zy int) string {
	return fmt.Sprintf("aoi:%s:%d:%d", instanceID, zx, zy)
}

// NeighborRooms returns the 5x5 AOI rooms (2-sector radius) around a zone.
func NeighborRooms(instanceID string, zx, zy int) []string {
	out := make([]string, 0, 25)
	for dy := -2; dy <= 2; dy++ {
		for dx := -2; dx <= 2; dx++ {
			out = append(out, RoomName(instanceID, zx+dx, zy+dy))
		}
	}
	return out
}
