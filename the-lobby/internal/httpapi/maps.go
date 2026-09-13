package httpapi

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/bootstrap"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/dialogue"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/protocol"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/registry"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/world"
)

// Server exposes REST helpers for maps (parity with /api/maps).
type Server struct {
	DB          *sql.DB
	World       *world.Manager
	Dialogue    *dialogue.Manager
	Secret      string // AUTH_SECRET / internal bearer for Next → Go sync
	OnMapSynced func(mapID string)
	Hub         any // BroadcastHub interface in broadcast.go
	Registry    *registry.Manager
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", s.health)
	mux.HandleFunc("/api/health", s.health)
	mux.HandleFunc("/api/maps", s.mapsRoot)
	mux.HandleFunc("/api/maps/", s.mapByID)
	mux.HandleFunc("/api/internal/sync", s.internalSync)
	mux.HandleFunc("/api/internal/deploy-release", s.internalDeployRelease)
	mux.HandleFunc("/api/internal/maps/diagnostics", s.mapDiagnostics)
	mux.HandleFunc("/internal/broadcast", s.internalBroadcast)
	mux.HandleFunc("/internal/disconnect", s.internalDisconnect)
	mux.HandleFunc("/api/gtc/listings", s.gtcListings)
	mux.HandleFunc("/api/craft/recipes", s.craftRecipes)
	return withCORS(mux)
}


func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"ok": true, "service": "go-mmo", "map": protocol.DemoMapID,
	})
}

func (s *Server) mapsRoot(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		if r.URL.Query().Get("action") == "drafts" {
			s.listDraftMaps(w, r)
		} else {
			s.listMaps(w, r)
		}
	case http.MethodPost:
		s.saveMap(w, r, "")
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) mapByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/maps/")
	id = world.ToBaseMapID(id)
	switch r.Method {
	case http.MethodGet:
		s.getMap(w, r, id)
	case http.MethodPut, http.MethodPost:
		s.saveMap(w, r, id)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) listMaps(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(`SELECT id, name, version FROM WorldMap ORDER BY name`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type item struct {
		ID      string `json:"id"`
		Name    string `json:"name"`
		Version int    `json:"version"`
	}
	out := make([]item, 0)
	for rows.Next() {
		var it item
		if err := rows.Scan(&it.ID, &it.Name, &it.Version); err != nil {
			continue
		}
		out = append(out, it)
	}
	if len(out) == 0 {
		_ = bootstrap.EnsureDemo(s.DB, s.World)
		out = append(out, item{ID: protocol.DemoMapID, Name: "The Firmament", Version: 1})
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) listDraftMaps(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(`SELECT id, name, gridData, gatesData, npcsData, tileLayersData, tilesetsData, voxelData, mapType, version FROM WorldMapDraft ORDER BY name`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type item struct {
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
	out := make([]item, 0)
	for rows.Next() {
		var it item
		var grid, gates, npcs, tiles, tilesets, voxel, mapType string
		if err := rows.Scan(&it.ID, &it.Name, &grid, &gates, &npcs, &tiles, &tilesets, &voxel, &mapType, &it.Version); err != nil {
			continue
		}
		it.GridData = json.RawMessage(grid)
		it.GatesData = json.RawMessage(gates)
		it.NpcsData = json.RawMessage(orEmptyArr(npcs))
		it.TileLayersData = json.RawMessage(orEmptyArr(tiles))
		it.TilesetsData = json.RawMessage(orEmptyArr(tilesets))
		it.VoxelData = json.RawMessage(orEmptyObj(voxel))
		it.MapType = mapType
		if it.MapType == "" {
			it.MapType = "HYBRID"
		}
		out = append(out, it)
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) getMap(w http.ResponseWriter, r *http.Request, id string) {
	if id == "" {
		http.NotFound(w, r)
		return
	}
	
	useDraft := r.URL.Query().Get("draft") == "true"
	var name, grid, npcs, tiles, tilesets, voxel, mapType string
	var version int
	
	queryVoxel := `SELECT name, gridData, npcsData, tileLayersData, tilesetsData, voxelData, mapType, version FROM WorldMap WHERE id = ?`
	queryNoVoxel := `SELECT name, gridData, npcsData, tileLayersData, tilesetsData, mapType, version FROM WorldMap WHERE id = ?`
	
	var err error
	if useDraft {
		err = s.DB.QueryRow(`SELECT name, gridData, npcsData, tileLayersData, tilesetsData, voxelData, mapType, version FROM WorldMapDraft WHERE id = ?`, id).
			Scan(&name, &grid, &npcs, &tiles, &tilesets, &voxel, &mapType, &version)
		if err == nil {
			// Found in draft, skip the live map query
			goto Respond
		}
	}

	err = s.DB.QueryRow(queryVoxel, id).
		Scan(&name, &grid, &npcs, &tiles, &tilesets, &voxel, &mapType, &version)
	if err != nil {
		// Fallback without voxelData column
		err = s.DB.QueryRow(queryNoVoxel, id).
			Scan(&name, &grid, &npcs, &tiles, &tilesets, &mapType, &version)
	}
	if err == sql.ErrNoRows {
		if id == protocol.DemoMapID {
			_ = bootstrap.EnsureDemo(s.DB, s.World)
			err = s.DB.QueryRow(queryNoVoxel, id).
				Scan(&name, &grid, &npcs, &tiles, &tilesets, &mapType, &version)
		}
	}
	if err != nil {
		http.Error(w, "map not found", http.StatusNotFound)
		return
	}

Respond:
	if err != nil {
		http.Error(w, "map not found", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id": id, "name": name, "version": version,
		"gridData":       json.RawMessage(grid),
		"npcsData":       json.RawMessage(orEmptyArr(npcs)),
		"tileLayersData": json.RawMessage(orEmptyArr(tiles)),
		"tilesetsData":   json.RawMessage(orEmptyArr(tilesets)),
		"voxelData":      json.RawMessage(orEmptyObj(voxel)),
		"mapType":        mapType,
	})
}

type mapSaveBody struct {
	ID               string          `json:"id"`
	MapID            string          `json:"mapId"`
	Name             string          `json:"name"`
	GridData         json.RawMessage `json:"gridData"`
	GatesData        json.RawMessage `json:"gatesData,omitempty"`
	NpcsData         json.RawMessage `json:"npcsData"`
	TileLayersData   json.RawMessage `json:"tileLayersData"`
	TilesetsData     json.RawMessage `json:"tilesetsData"`
	VoxelData        json.RawMessage `json:"voxelData,omitempty"`
	VoxelDoc         json.RawMessage `json:"voxelDoc,omitempty"`
	MapType          string          `json:"mapType,omitempty"`
	RegionClass      string          `json:"regionClass,omitempty"`
	ProceduralConfig json.RawMessage `json:"proceduralConfig,omitempty"`
}

func (s *Server) saveMap(w http.ResponseWriter, r *http.Request, pathID string) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 8<<20))
	if err != nil {
		http.Error(w, "bad body", http.StatusBadRequest)
		return
	}
	var payload mapSaveBody
	if err := json.Unmarshal(body, &payload); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	id := pathID
	if id == "" {
		id = payload.ID
	}
	if id == "" {
		id = payload.MapID
	}
	id = world.ToBaseMapID(id)
	if id == "" {
		http.Error(w, "missing map id", http.StatusBadRequest)
		return
	}
	name := payload.Name
	if name == "" {
		name = id
	}
	grid := string(payload.GridData)
	if grid == "" {
		grid = "[]"
	}
	gates := string(payload.GatesData)
	if gates == "" {
		gates = "{}"
	}
	npcs := string(payload.NpcsData)
	if npcs == "" {
		npcs = "[]"
	}
	tiles := string(payload.TileLayersData)
	if tiles == "" {
		tiles = "[]"
	}
	tilesets := string(payload.TilesetsData)
	if tilesets == "" {
		tilesets = "[]"
	}

	var voxelStr string
	if len(payload.VoxelData) > 0 && string(payload.VoxelData) != "{}" && string(payload.VoxelData) != "null" {
		voxelStr = string(payload.VoxelData)
	} else if len(payload.VoxelDoc) > 0 && string(payload.VoxelDoc) != "{}" && string(payload.VoxelDoc) != "null" {
		voxelStr = string(payload.VoxelDoc)
	}

	mapType := payload.MapType
	if mapType == "" {
		mapType = "HYBRID"
	}

	if err := PersistMapDraftVoxel(s.DB, id, name, grid, gates, npcs, tiles, tilesets, voxelStr, mapType); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if s.OnMapSynced != nil {
		s.OnMapSynced(id)
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": id, "draft": true})
}


func (s *Server) internalSync(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !s.authorizeInternal(r) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "bad body", http.StatusBadRequest)
		return
	}
	var payload struct {
		Type    string `json:"type"`
		ID      string `json:"id"`
		Version int    `json:"version"`
		Scope   string `json:"scope"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if s.Registry != nil {
		switch payload.Type {
		case "class":
			s.Registry.ReloadClasses()
		case "creature":
			s.Registry.ReloadCreatures()
		case "item":
			s.Registry.ReloadItems()
		case "map":
			if payload.ID != "" && payload.Version > 0 {
				log.Printf("[sync] Request received to pull map release %s v%d", payload.ID, payload.Version)
				err := deployPublishedMapRelease(s.DB, s.World, payload.ID, payload.Version, s.Secret)
				if err != nil {
					log.Printf("[MapReleaseError] map=%s version=%d error=%v", payload.ID, payload.Version, err)
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}
			} else {
				log.Printf("[MapReleaseError] map=%s version=%d error=missing_id_or_version", payload.ID, payload.Version)
				http.Error(w, "missing ID or version", http.StatusBadRequest)
				return
			}
		}
	}

	// Always trigger content reload broadcast for clients to fetch new JSON.
	if s.OnMapSynced != nil && payload.Type == "map" && payload.ID != "" {
		s.OnMapSynced(payload.ID)
	} else if s.Hub != nil {
		// General content broadcast for other types
		if hub, ok := s.Hub.(interface{ BroadcastAll(string, any) }); ok {
			hub.BroadcastAll(protocol.EvContentReload, map[string]any{
				"type": payload.Type,
				"id":   payload.ID,
			})
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "sync": payload})
}

func (s *Server) authorizeInternal(r *http.Request) bool {
	if s.Secret == "" {
		return false
	}
	authz := r.Header.Get("Authorization")
	const prefix = "Bearer "
	if strings.HasPrefix(authz, prefix) && strings.TrimSpace(authz[len(prefix):]) == s.Secret {
		return true
	}
	if r.Header.Get("X-Saints-Internal-Secret") == s.Secret {
		return true
	}
	return false
}

// PersistMap writes WorldMap + refreshes in-memory def.
func PersistMap(db *sql.DB, wm *world.Manager, id, name, grid, gates, npcs, tiles, tilesets string) error {
	return PersistMapVoxel(db, wm, id, name, grid, gates, npcs, tiles, tilesets, "", "HYBRID")
}

// ReloadMapInMemory applies voxel and grid data to the live engine memory without DB writes.
func ReloadMapInMemory(wm *world.Manager, id, name, grid, voxel string) {
	if voxel != "" && voxel != "{}" && voxel != "null" {
		_ = wm.ApplyVoxel(id, name, []byte(voxel))
	}
	if grid != "[]" && grid != "" {
		if err := wm.ApplyGrid(id, name, grid); err != nil {
			_ = err
		}
	}
}

// PersistMapVoxel writes WorldMap with 3D voxelDoc + refreshes in-memory def.
func PersistMapVoxel(db *sql.DB, wm *world.Manager, id, name, grid, gates, npcs, tiles, tilesets, voxel, mapType string) error {
	if voxel != "" && voxel != "{}" && voxel != "null" {
		_ = wm.ApplyVoxel(id, name, []byte(voxel))
	}
	if grid != "[]" && grid != "" {
		if err := wm.ApplyGrid(id, name, grid); err != nil {
			_ = err
		}
	}
	if gates == "" {
		gates = "{}"
	}
	var count int
	_ = db.QueryRow(`SELECT COUNT(1) FROM WorldMap WHERE id = ?`, id).Scan(&count)
	var err error
	if count > 0 {
		_, err = db.Exec(`UPDATE WorldMap SET name=?, gridData=?, gatesData=?, npcsData=?, tileLayersData=?, tilesetsData=?, mapType=?, version=version+1, updatedAt=datetime('now') WHERE id=?`,
			name, grid, gates, npcs, tiles, tilesets, mapType, id)
	} else {
		_, err = db.Exec(`INSERT INTO WorldMap (id, gameId, name, gridData, gatesData, npcsData, encountersData, tileLayersData, tilesetsData, mapType, version)
			VALUES (?, 'saints', ?, ?, ?, ?, '[]', ?, ?, ?, 1)`, id, name, grid, gates, npcs, tiles, tilesets, mapType)
	}
	return err
}

// PersistMapDraftVoxel writes to WorldMapDraft without touching the live memory or WorldMap.
func PersistMapDraftVoxel(db *sql.DB, id, name, grid, gates, npcs, tiles, tilesets, voxel, mapType string) error {
	if gates == "" {
		gates = "{}"
	}
	var count int
	_ = db.QueryRow(`SELECT COUNT(1) FROM WorldMapDraft WHERE id = ?`, id).Scan(&count)
	var err error
	if count > 0 {
		_, err = db.Exec(`UPDATE WorldMapDraft SET name=?, gridData=?, gatesData=?, npcsData=?, tileLayersData=?, tilesetsData=?, mapType=?, version=version+1, updatedAt=datetime('now') WHERE id=?`,
			name, grid, gates, npcs, tiles, tilesets, mapType, id)
	} else {
		_, err = db.Exec(`INSERT INTO WorldMapDraft (id, gameId, name, gridData, gatesData, npcsData, encountersData, tileLayersData, tilesetsData, mapType, version)
			VALUES (?, 'saints', ?, ?, ?, ?, '[]', ?, ?, ?, 1)`, id, name, grid, gates, npcs, tiles, tilesets, mapType)
	}
	return err
}

// LoadMapDefFromDB reads a map from sqlite and creates a MapDef.
func LoadMapDefFromDB(db *sql.DB, wm *world.Manager, id string) (*world.MapDef, error) {
	var name string
	var publishedVersion int
	var data sql.NullString

	query := `SELECT v.name, w.publishedVersion, v.data 
			  FROM WorldMap w 
			  JOIN WorldMapVersion v ON w.id = v.mapId AND w.publishedVersion = v.version 
			  WHERE w.id = ?`
	err := db.QueryRow(query, id).Scan(&name, &publishedVersion, &data)
	if err != nil {
		if err == sql.ErrNoRows {
			var hasMap int
			var pubVersion int
			_ = db.QueryRow("SELECT 1, COALESCE(publishedVersion, 0) FROM WorldMap WHERE id = ?", id).Scan(&hasMap, &pubVersion)
			
			if hasMap == 0 {
				log.Printf("[MapDefDebug] baseMapId=%s cacheHit=false dbMapFound=false publishedVersionFound=false result=error error=map_not_found", id)
				return nil, fmt.Errorf("map_not_found: %s", id)
			}
			
			if pubVersion == 0 {
				log.Printf("[MapDefDebug] baseMapId=%s cacheHit=false dbMapFound=true publishedVersionFound=false result=error error=map_unpublished", id)
				return nil, fmt.Errorf("map_unpublished: %s", id)
			}
			
			log.Printf("[MapDefDebug] baseMapId=%s cacheHit=false dbMapFound=true publishedVersionFound=false result=error error=map_release_missing (v%d)", id, pubVersion)
			return nil, fmt.Errorf("map_release_missing: %s v%d", id, pubVersion)
		}
		log.Printf("[MapDefDebug] baseMapId=%s cacheHit=false dbMapFound=unknown publishedVersionFound=unknown result=error error=%v", id, err)
		return nil, err
	}

	def := &world.MapDef{
		ID:     id,
		Name:   name,
		Width:  128,
		Height: 128,
	}

	var mapType string
	if data.Valid && data.String != "" {
		var snapshot map[string]any
		if jsonErr := json.Unmarshal([]byte(data.String), &snapshot); jsonErr == nil {
			if t, ok := snapshot["mapType"].(string); ok {
				mapType = t
			}

			// If MapType is not FRACTAL/VOXEL, extract true dimensions
			if mapType != "FRACTAL" && mapType != "VOXEL" {
				if gridStr, ok := snapshot["gridData"].(string); ok && gridStr != "" {
					if grid, err := world.ParseGridJSON(gridStr); err == nil {
						def.Grid = grid
						def.Height = len(grid)
						if def.Height > 0 {
							def.Width = len(grid[0])
						}
					}
				}
			}

			// Extract gatesData and spawn point
			if gatesStr, ok := snapshot["gatesData"].(string); ok && gatesStr != "" {
				var gates struct {
					SpawnPoint *struct {
						X float64 `json:"x"`
						Y float64 `json:"y"`
						Z float64 `json:"z"`
					} `json:"spawnPoint"`
					Gates []struct {
						ID       string `json:"id"`
						Category string `json:"category"`
						Position struct {
							X float64 `json:"x"`
							Y float64 `json:"y"`
							Z float64 `json:"z"`
						} `json:"position"`
					} `json:"gates"`
				}
				if err := json.Unmarshal([]byte(gatesStr), &gates); err == nil {
					if gates.SpawnPoint != nil {
						def.SpawnX = gates.SpawnPoint.X
						def.SpawnY = gates.SpawnPoint.Y
						def.SpawnZ = gates.SpawnPoint.Z
					} else {
						found := false
						for _, g := range gates.Gates {
							if g.ID == "spawn" || g.Category == "SPAWN" {
								def.SpawnX = g.Position.X
								def.SpawnY = g.Position.Y
								def.SpawnZ = g.Position.Z
								found = true
								break
							}
						}
						if !found {
							def.SpawnX = float64(def.Width) / 2
							def.SpawnY = float64(def.Height) / 2
							def.SpawnZ = 16
						}
					}
				}
			}
		} else {
			log.Printf("[MapDefDebug] baseMapId=%s cacheHit=false fetchEnabled=true dbMapFound=true publishedVersionFound=true result=error error=malformed_json", id)
			return nil, fmt.Errorf("malformed published snapshot for %s: %v", id, jsonErr)
		}
	} else {
		log.Printf("[MapDefDebug] baseMapId=%s cacheHit=false fetchEnabled=true dbMapFound=true publishedVersionFound=true result=error error=missing_data", id)
		return nil, fmt.Errorf("missing data in published snapshot for %s", id)
	}

	if mapType == "FRACTAL" || mapType == "VOXEL" {
		if wm != nil && wm.RM != nil {
			def.Voxel = &world.VoxelWorld{
				ID:            id,
				RM:            wm.RM,
				ActiveVersion: publishedVersion,
			}
		}
	}

	log.Printf("[MapDefDebug] baseMapId=%s cacheHit=false fetchEnabled=true dbMapFound=true publishedVersionFound=true result=ok error=nil", id)
	return def, nil
}

func (s *Server) gtcListings(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"listings": []any{}, "note": "live listings via socket gtc_* events"})
}

func (s *Server) craftRecipes(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"recipes": []map[string]any{
			{"slug": "field_kit", "name": "Field Kit"},
			{"slug": "capture_film_pack", "name": "Film Pack"},
		},
	})
}

func orEmptyArr(s string) string {
	if s == "" || s == "null" {
		return "[]"
	}
	return s
}

func orEmptyObj(s string) string {
	if s == "" || s == "null" {
		return "{}"
	}
	return s
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
func deployPublishedMapRelease(db *sql.DB, wm *world.Manager, mapID string, version int, secret string) error {
	log.Printf("[MapRelease] map=%s version=%d stage=fetch", mapID, version)
	nextURL := os.Getenv("NEXT_JS_URL")
	if nextURL == "" {
		nextURL = "http://127.0.0.1:3000"
	}
	reqUrl := fmt.Sprintf("%s/api/internal/maps/%s?version=%d", nextURL, mapID, version)
	
	req, err := http.NewRequest("GET", reqUrl, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+secret)
	
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("fetch failed: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("next.js returned status %d", resp.StatusCode)
	}
	
	var syncResp struct {
		Ok      bool `json:"ok"`
		Release struct {
			MapID       string `json:"mapId"`
			Version     int    `json:"version"`
			Name        string `json:"name"`
			Data        string `json:"data"`
			Description string `json:"description"`
			PublishedBy string `json:"publishedBy"`
			Regions     []struct {
				RegionX          int    `json:"regionX"`
				RegionZ          int    `json:"regionZ"`
				ArtifactChecksum string `json:"artifactChecksum"`
			} `json:"regions"`
		} `json:"release"`
	}
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %w", err)
	}
	
	if err := json.Unmarshal(body, &syncResp); err != nil {
		return fmt.Errorf("failed to decode response JSON: %w", err)
	}
	
	if !syncResp.Ok {
		return fmt.Errorf("next.js returned ok=false")
	}

	log.Printf("[MapRelease] map=%s version=%d stage=persist", mapID, version)

	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	versionID := fmt.Sprintf("%s_v%d", syncResp.Release.MapID, syncResp.Release.Version)
	_, err = tx.Exec(`
		INSERT INTO WorldMapVersion (id, mapId, version, name, data, description, publishedBy)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET data=excluded.data, description=excluded.description, publishedBy=excluded.publishedBy
	`, versionID, syncResp.Release.MapID, syncResp.Release.Version, syncResp.Release.Name, syncResp.Release.Data, syncResp.Release.Description, syncResp.Release.PublishedBy)
	if err != nil {
		return fmt.Errorf("failed to insert WorldMapVersion: %w", err)
	}

	for _, r := range syncResp.Release.Regions {
		regionID := fmt.Sprintf("%s_v%d_%d_%d", syncResp.Release.MapID, syncResp.Release.Version, r.RegionX, r.RegionZ)
		_, err = tx.Exec(`
			INSERT INTO WorldMapVersionRegion (id, versionId, regionX, regionZ, artifactChecksum)
			VALUES (?, ?, ?, ?, ?)
			ON CONFLICT(id) DO UPDATE SET artifactChecksum=excluded.artifactChecksum
		`, regionID, versionID, r.RegionX, r.RegionZ, r.ArtifactChecksum)
		if err != nil {
			return fmt.Errorf("failed to insert region %s: %w", regionID, err)
		}
	}

	var count int
	err = tx.QueryRow(`SELECT COUNT(1) FROM WorldMap WHERE id = ?`, mapID).Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to check WorldMap existence: %w", err)
	}
	if count > 0 {
		_, err = tx.Exec(`UPDATE WorldMap SET name=?, publishedVersion=?, publishedData=? WHERE id=?`, syncResp.Release.Name, syncResp.Release.Version, syncResp.Release.Data, mapID)
	} else {
		_, err = tx.Exec(`INSERT INTO WorldMap (id, name, gridData, mapType, publishedVersion, publishedData) VALUES (?, ?, '[]', 'HYBRID', ?, ?)`, mapID, syncResp.Release.Name, syncResp.Release.Version, syncResp.Release.Data)
	}
	if err != nil {
		return fmt.Errorf("failed to update WorldMap: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	log.Printf("[MapRelease] map=%s version=%d stage=regions count=%d", mapID, version, len(syncResp.Release.Regions))

	if wm != nil && wm.RM != nil {
		manifest, err := wm.RM.LoadManifest(mapID, version)
		if err != nil {
			return fmt.Errorf("failed to load manifest: %w", err)
		}

		var wg sync.WaitGroup
		var firstErr error
		var mu sync.Mutex
		workers := 4
		sem := make(chan struct{}, workers)

		for _, r := range manifest.Regions {
			wg.Add(1)
			go func(rx, rz int, checksum string) {
				defer wg.Done()
				sem <- struct{}{}
				defer func() { <-sem }()
				
				region, err := wm.RM.FetchAndDecodeRegion(mapID, version, rx, rz, checksum)
				if err != nil {
					mu.Lock()
					if firstErr == nil {
						firstErr = fmt.Errorf("failed to fetch region %d,%d: %v", rx, rz, err)
					}
					mu.Unlock()
					return
				}
				wm.RM.SetRegion(mapID, version, rx, rz, region)
			}(r.RegionX, r.RegionZ, r.ArtifactChecksum)
		}
		wg.Wait()
		
		if firstErr != nil {
			return fmt.Errorf("region fetch failed: %w", firstErr)
		}
		
		wm.RM.ActivateVersion(mapID, version)
		wm.RM.EvictOldVersions(mapID, version)
	}

	// Reload map metadata into memory if loaded
	var snapshot map[string]any
	if err := json.Unmarshal([]byte(syncResp.Release.Data), &snapshot); err == nil {
		if gridData, ok := snapshot["gridData"].(string); ok {
			ReloadMapInMemory(wm, mapID, syncResp.Release.Name, gridData, "{}")
		}
	}

	log.Printf("[MapRelease] map=%s version=%d stage=activate status=success", mapID, version)
	return nil
}

func StartSyncPoller(db *sql.DB, wm *world.Manager, secret string) {
	log.Printf("[sync] Starting MapSync poller")
	go func() {
		for {
			time.Sleep(15 * time.Second)
			
			nextURL := os.Getenv("NEXT_JS_URL")
			if nextURL == "" {
				nextURL = "http://127.0.0.1:3000"
			}
			reqUrl := fmt.Sprintf("%s/api/internal/sync-queue?limit=10", nextURL)
			
			req, err := http.NewRequest("GET", reqUrl, nil)
			if err != nil {
				continue
			}
			req.Header.Set("Authorization", "Bearer "+secret)
			
			client := &http.Client{Timeout: 10 * time.Second}
			resp, err := client.Do(req)
			if err != nil || resp.StatusCode != 200 {
				if resp != nil {
					resp.Body.Close()
				}
				continue
			}
			
			var queueResp struct {
				Ok      bool `json:"ok"`
				Pending []struct {
					ID      string `json:"id"`
					MapID   string `json:"mapId"`
					Version int    `json:"version"`
				} `json:"pending"`
			}
			
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			if json.Unmarshal(body, &queueResp) != nil || !queueResp.Ok || len(queueResp.Pending) == 0 {
				continue
			}
			
			for _, entry := range queueResp.Pending {
				err := deployPublishedMapRelease(db, wm, entry.MapID, entry.Version, secret)
				
				status := "SYNCED"
				errMsg := ""
				if err != nil {
					log.Printf("[MapReleaseError] map=%s version=%d error=%v", entry.MapID, entry.Version, err)
					status = "FAILED"
					errMsg = err.Error()
				}
				
				// Acknowledge back to Next.js
				ackUrl := fmt.Sprintf("%s/api/internal/sync-queue", nextURL)
				
				payload, _ := json.Marshal(map[string]any{
					"entryIds": []string{entry.ID},
					"status":   status,
					"error":    errMsg,
				})
				ackReq, err := http.NewRequest("POST", ackUrl, strings.NewReader(string(payload)))
				if err == nil {
					ackReq.Header.Set("Authorization", "Bearer "+secret)
					ackReq.Header.Set("Content-Type", "application/json")
					if ackResp, err := client.Do(ackReq); err == nil {
						ackResp.Body.Close()
					}
				}
			}
		}
	}()
}
func (s *Server) mapDiagnostics(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "missing id", http.StatusBadRequest)
		return
	}
	
	var hasMap int
	var pubVersion int
	var runtimeVersion int
	var regionCount int
	
	_ = s.DB.QueryRow("SELECT 1, COALESCE(publishedVersion, 0) FROM WorldMap WHERE id = ?", id).Scan(&hasMap, &pubVersion)
	
	if hasMap == 1 {
		_ = s.DB.QueryRow("SELECT version FROM WorldMapVersion WHERE mapId = ? ORDER BY version DESC LIMIT 1", id).Scan(&runtimeVersion)
		_ = s.DB.QueryRow("SELECT COUNT(1) FROM WorldMapVersionRegion WHERE versionId = ?", fmt.Sprintf("%s_v%d", id, pubVersion)).Scan(&regionCount)
	}

	active := false
	if s.World != nil && s.World.RM != nil {
		if _, err := s.World.RM.LoadManifest(id, pubVersion); err == nil {
			active = true
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"id": id,
		"hasMap": hasMap == 1,
		"publishedVersion": pubVersion,
		"runtimeVersion": runtimeVersion,
		"regions": regionCount,
		"active": active,
	})
}
