package httpapi

import (
	"database/sql"
	"encoding/json"
	"io"
	"net/http"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/protocol"
)

// mapDraftBundle matches the JSON shape of a map in the deploy payload
type mapDraftBundle struct {
	ID             string          `json:"id"`
	Name           string          `json:"name"`
	GridData       json.RawMessage `json:"gridData"`
	GatesData      json.RawMessage `json:"gatesData"`
	NpcsData       json.RawMessage `json:"npcsData"`
	TileLayersData json.RawMessage `json:"tileLayersData"`
	TilesetsData   json.RawMessage `json:"tilesetsData"`
	VoxelData      json.RawMessage `json:"voxelData"`
	MapType        string          `json:"mapType"`
	Version        int             `json:"version"`
}

type deployPayload struct {
	Maps []mapDraftBundle `json:"maps"`
}

func (s *Server) internalDeployRelease(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !s.authorizeInternal(r) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	
	body, err := io.ReadAll(io.LimitReader(r.Body, 50<<20)) // 50MB limit for full bundle
	if err != nil {
		http.Error(w, "bad body", http.StatusBadRequest)
		return
	}
	
	var payload deployPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	tx, err := s.DB.Begin()
	if err != nil {
		http.Error(w, "db transaction failed", http.StatusInternalServerError)
		return
	}

	for _, m := range payload.Maps {
		gates := string(m.GatesData)
		if gates == "" {
			gates = "{}"
		}
		
		var count int
		_ = tx.QueryRow(`SELECT COUNT(1) FROM WorldMap WHERE id = ?`, m.ID).Scan(&count)
		
		if count > 0 {
			_, err = tx.Exec(`UPDATE WorldMap SET name=?, gridData=?, gatesData=?, npcsData=?, tileLayersData=?, tilesetsData=?, voxelData=?, mapType=?, version=?, updatedAt=datetime('now') WHERE id=?`,
				m.Name, string(m.GridData), gates, string(m.NpcsData), string(m.TileLayersData), string(m.TilesetsData), string(m.VoxelData), m.MapType, m.Version, m.ID)
		} else {
			_, err = tx.Exec(`INSERT INTO WorldMap (id, gameId, name, gridData, gatesData, npcsData, encountersData, tileLayersData, tilesetsData, voxelData, mapType, version)
				VALUES (?, 'saints', ?, ?, ?, ?, '[]', ?, ?, ?, ?, ?)`, m.ID, m.Name, string(m.GridData), gates, string(m.NpcsData), string(m.TileLayersData), string(m.TilesetsData), string(m.VoxelData), m.MapType, m.Version)
		}
		if err != nil {
			_ = tx.Rollback()
			http.Error(w, "failed to update world map", http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "commit failed", http.StatusInternalServerError)
		return
	}

	// Hot reload everything safely
	for _, m := range payload.Maps {
		voxelStr := string(m.VoxelData)
		ReloadMapInMemory(s.World, m.ID, m.Name, string(m.GridData), voxelStr)
		
		if s.OnMapSynced != nil {
			s.OnMapSynced(m.ID)
		}
	}

	// Trigger full content reload for all connected clients
	if s.Registry != nil {
		s.Registry.ReloadClasses()
		s.Registry.ReloadCreatures()
		s.Registry.ReloadItems()
	}
	if s.Hub != nil {
		if hub, ok := s.Hub.(interface{ BroadcastAll(string, any) }); ok {
			hub.BroadcastAll(protocol.EvMapReloaded, map[string]any{"forceRefresh": true})
			hub.BroadcastAll(protocol.EvContentReload, map[string]any{"type": "full"})
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "mapsDeployed": len(payload.Maps)})
}
