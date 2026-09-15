package socket

import (
	"testing"
)

func TestDistanceExploit(t *testing.T) {
	// Inside 3 tiles (Euclidean)
	if !isWithinInteractionRange(10.0, 10.0, 11.0, 10.0, 3.0) {
		t.Fatal("expected 1-tile distance to be valid")
	}
	// Diagonal
	if !isWithinInteractionRange(10.0, 10.0, 12.0, 12.0, 3.0) {
		t.Fatal("expected 2-tile diagonal (2.82) to be valid")
	}
	// Out of bounds
	if isWithinInteractionRange(10.0, 10.0, 14.0, 10.0, 3.0) {
		t.Fatal("expected 4-tile distance to be invalid")
	}
	if isWithinInteractionRange(10.0, 10.0, 13.0, 13.0, 3.0) {
		t.Fatal("expected 3-tile diagonal (4.24) to be invalid")
	}
}
