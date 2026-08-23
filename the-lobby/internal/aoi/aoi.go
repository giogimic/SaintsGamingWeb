package aoi

import "fmt"

// RoomName for an AOI zone.
func RoomName(instanceID string, zx, zy int) string {
	return fmt.Sprintf("aoi:%s:%d:%d", instanceID, zx, zy)
}

// NeighborRooms returns the 3x3 AOI rooms around a zone.
func NeighborRooms(instanceID string, zx, zy int) []string {
	out := make([]string, 0, 9)
	for dy := -1; dy <= 1; dy++ {
		for dx := -1; dx <= 1; dx++ {
			out = append(out, RoomName(instanceID, zx+dx, zy+dy))
		}
	}
	return out
}
