package world

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"
)

type GenRequest struct {
	MapID string
	CX    int
	CZ    int
}

type GeneratorClient struct {
	nextJsURL string
	secret    string
	queue     chan GenRequest
	active    map[string]bool
	mu        sync.Mutex
	worldMgr  *Manager
	httpClient *http.Client
	EmitToRoom func(room, event string, payload any)
}

func NewGeneratorClient(nextJsURL, secret string, wm *Manager) *GeneratorClient {
	gc := &GeneratorClient{
		nextJsURL:  nextJsURL,
		secret:     secret,
		queue:      make(chan GenRequest, 100),
		active:     make(map[string]bool),
		worldMgr:   wm,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
	go gc.worker()
	return gc
}

func (gc *GeneratorClient) RequestChunk(mapID string, cx, cz int) {
	key := fmt.Sprintf("%s:%d:%d", mapID, cx, cz)
	
	gc.mu.Lock()
	if gc.active[key] {
		gc.mu.Unlock()
		return
	}
	gc.active[key] = true
	gc.mu.Unlock()

	select {
	case gc.queue <- GenRequest{MapID: mapID, CX: cx, CZ: cz}:
	default:
		// Queue full, drop request and unset active so it can be requested again later
		gc.mu.Lock()
		delete(gc.active, key)
		gc.mu.Unlock()
		log.Printf("[generator] queue full, dropped chunk request %s", key)
	}
}

func (gc *GeneratorClient) worker() {
	for req := range gc.queue {
		gc.processRequest(req)
		
		key := fmt.Sprintf("%s:%d:%d", req.MapID, req.CX, req.CZ)
		gc.mu.Lock()
		delete(gc.active, key)
		gc.mu.Unlock()
	}
}

func (gc *GeneratorClient) processRequest(req GenRequest) {
	url := fmt.Sprintf("%s/api/internal/generate-chunks", gc.nextJsURL)
	
	payload := map[string]any{
		"mapId": req.MapID,
		"chunks": []map[string]any{
			{"cx": req.CX, "cz": req.CZ},
		},
	}
	
	bodyBytes, _ := json.Marshal(payload)
	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(bodyBytes))
	if err != nil {
		log.Printf("[generator] failed to create request: %v", err)
		return
	}
	
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-internal-secret", gc.secret)
	
	resp, err := gc.httpClient.Do(httpReq)
	if err != nil {
		log.Printf("[generator] request failed: %v", err)
		return
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		log.Printf("[generator] non-200 status: %d %s", resp.StatusCode, string(respBody))
		return
	}
	
	var result struct {
		Ok             bool  `json:"ok"`
		GeneratedChunks [][]int `json:"generatedChunks"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		log.Printf("[generator] decode failed: %v", err)
		return
	}
	
	if len(result.GeneratedChunks) > 0 {
		// Inject into VoxelWorld
		def, ok := gc.worldMgr.GetDef(req.MapID)
		if ok && def.Voxel != nil {
			def.Voxel.mu.Lock()
			// Append the new chunks
			var broadcastChunks [][]int
			for _, rleInts := range result.GeneratedChunks {
				rleBytes := make([]byte, len(rleInts))
				for i, v := range rleInts {
					rleBytes[i] = byte(v)
				}
				chunk, err := DecodePaletteRLEBinary(rleBytes)
				if err == nil {
					ckey := fmt.Sprintf("%d_%d_%d", chunk.CX, chunk.CY, chunk.CZ)
					def.Voxel.Chunks[ckey] = chunk
					broadcastChunks = append(broadcastChunks, rleInts)
				}
			}
			def.Voxel.mu.Unlock()
			
			// Broadcast to room
			if gc.EmitToRoom != nil && len(broadcastChunks) > 0 {
				gc.EmitToRoom("map:"+req.MapID, "chunk_loaded", map[string]any{
					"mapId": req.MapID,
					"chunks": broadcastChunks,
				})
			}
			log.Printf("[generator] successfully injected %d chunks for %s", len(broadcastChunks), req.MapID)
		}
	}
}
