package world

import (
	"bytes"
	"compress/zlib"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

type RegionIdentifier struct {
	MapID   string
	Version int
	RegionX int
	RegionZ int
}

type RegionManifest struct {
	MapID            string `json:"mapId"`
	Version          int    `json:"version"`
	GeneratorID      string `json:"generatorId"`
	GeneratorVersion int    `json:"generatorVersion"`
	Regions          []struct {
		RegionX          int    `json:"regionX"`
		RegionZ          int    `json:"regionZ"`
		ArtifactChecksum string `json:"artifactChecksum"`
	} `json:"regions"`
}

type RegionManager struct {
	mu           sync.RWMutex
	ActiveVersion map[string]int // mapID -> version
	regions      map[RegionIdentifier]*VoxelWorld
	apiBaseURL   string
	apiSecret    string
}

// NewRegionManager creates a new thread-safe RegionManager.
func NewRegionManager(apiBaseURL, apiSecret string) *RegionManager {
	return &RegionManager{
		ActiveVersion: make(map[string]int),
		regions:       make(map[RegionIdentifier]*VoxelWorld),
		apiBaseURL:    apiBaseURL,
		apiSecret:     apiSecret,
	}
}

// GetRegion returns a loaded region, or nil if not loaded/cached.
func (rm *RegionManager) GetRegion(mapID string, version, rx, rz int) *VoxelWorld {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	return rm.regions[RegionIdentifier{mapID, version, rx, rz}]
}

// SetRegion caches a fully decoded VoxelWorld region.
func (rm *RegionManager) SetRegion(mapID string, version, rx, rz int, region *VoxelWorld) {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	rm.regions[RegionIdentifier{mapID, version, rx, rz}] = region
}

// ActivateVersion atomically switches the active published version for a map.
func (rm *RegionManager) ActivateVersion(mapID string, version int) {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	rm.ActiveVersion[mapID] = version
}

// GetActiveVersion returns the currently active published version for a map.
func (rm *RegionManager) GetActiveVersion(mapID string) (int, bool) {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	v, ok := rm.ActiveVersion[mapID]
	return v, ok
}

// EvictOldVersions removes regions that do not belong to the active version.
func (rm *RegionManager) EvictOldVersions(mapID string, activeVersion int) {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	for key := range rm.regions {
		if key.MapID == mapID && key.Version != activeVersion {
			delete(rm.regions, key)
		}
	}
}

// LoadManifest fetches the manifest for a published world version from Next.js.
func (rm *RegionManager) LoadManifest(mapID string, version int) (*RegionManifest, error) {
	vStr := fmt.Sprintf("%d", version)
	if version == 0 {
		vStr = "draft"
	}
	url := fmt.Sprintf("%s/api/internal/worlds/%s/%s/manifest", rm.apiBaseURL, mapID, vStr)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+rm.apiSecret)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("manifest API returned status %d", resp.StatusCode)
	}

	var manifest RegionManifest
	if err := json.NewDecoder(resp.Body).Decode(&manifest); err != nil {
		return nil, err
	}
	return &manifest, nil
}

// FetchAndDecodeRegion fetches a region binary artifact and decodes it.
func (rm *RegionManager) FetchAndDecodeRegion(mapID string, version, rx, rz int, expectedChecksum string) (*VoxelWorld, error) {
	vStr := fmt.Sprintf("%d", version)
	if version == 0 {
		vStr = "draft"
	}
	url := fmt.Sprintf("%s/api/internal/worlds/%s/%s/regions/%d/%d", rm.apiBaseURL, mapID, vStr, rx, rz)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+rm.apiSecret)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("region API returned status %d", resp.StatusCode)
	}

	rawBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// 1. Verify checksum against the exact raw compressed bytes.
	hash := sha256.Sum256(rawBytes)
	actualChecksum := hex.EncodeToString(hash[:])
	if actualChecksum != expectedChecksum {
		return nil, fmt.Errorf("checksum mismatch for region %d,%d: expected %s, got %s", rx, rz, expectedChecksum, actualChecksum)
	}

	// 2. Decompress zlib payload
	reader, err := zlib.NewReader(bytes.NewReader(rawBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create zlib reader: %v", err)
	}
	defer reader.Close()

	decompressed, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to decompress region data: %v", err)
	}

	// 3. Decode JSON voxelDoc into VoxelWorld
	regionWorld, err := ParseVoxelDoc(decompressed)
	if err != nil {
		return nil, fmt.Errorf("failed to parse region voxelDoc: %v", err)
	}

	return regionWorld, nil
}
