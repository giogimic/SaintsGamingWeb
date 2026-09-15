package httpapi

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
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
		s.listMaps(w, r)
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



func (s *Server) getMap(w http.ResponseWriter, r *http.Request, id string) {
	if id == "" {
		http.NotFound(w, r)
		return
	}
	
	var name, grid, voxel, mapType string
	var version int
	
	queryVoxel := `SELECT name, gridData, voxelData, mapType, version FROM WorldMap WHERE id = ?`
	queryNoVoxel := `SELECT name, gridData, mapType, version FROM WorldMap WHERE id = ?`
	
	err := s.DB.QueryRow(queryVoxel, id).
		Scan(&name, &grid, &voxel, &mapType, &version)
	if err != nil {
		err = s.DB.QueryRow(queryNoVoxel, id).
			Scan(&name, &grid, &mapType, &version)
		voxel = "{}" // fallback empty voxel data
	}
	if err == sql.ErrNoRows {
		if id == protocol.DemoMapID {
			_ = bootstrap.EnsureDemo(s.DB, s.World)
			err = s.DB.QueryRow(queryNoVoxel, id).
				Scan(&name, &grid, &mapType, &version)
			voxel = "{}"
		}
	}
	if err != nil {
		http.Error(w, "map not found", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id":        id,
		"name":      name,
		"version":   version,
		"gridData":  json.RawMessage(grid),
		"voxelData": json.RawMessage(orEmptyObj(voxel)),
		"mapType":   mapType,
	})
}

type mapSaveBody struct {
	ID               string          `json:"id"`
	MapID            string          `json:"mapId"`
	Name             string          `json:"name"`
	GridData         json.RawMessage `json:"gridData"`
	GatesData        json.RawMessage `json:"gatesData,omitempty"`
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

	if err := PersistMapVoxel(s.DB, s.World, id, name, grid, gates, voxelStr, mapType); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if s.OnMapSynced != nil {
		s.OnMapSynced(id)
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": id, "draft": false})
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
		Type       string `json:"type"`
		ID         string `json:"id"`
		Version    int    `json:"version"`
		VersionStr string `json:"versionStr"`
		Scope      string `json:"scope"`
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

		case "project":
			if payload.ID != "" && payload.VersionStr != "" {
				log.Printf("[sync] Request received to pull project release %s %s", payload.ID, payload.VersionStr)
				err := deployPublishedProjectRelease(s.DB, s.World, s.Registry, s.Dialogue, payload.ID, payload.VersionStr, s.Secret)
				if err != nil {
					log.Printf("[ProjectReleaseError] project=%s version=%s error=%v", payload.ID, payload.VersionStr, err)
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}
			} else {
				log.Printf("[ProjectReleaseError] project=%s version=%s error=missing_id_or_versionStr", payload.ID, payload.VersionStr)
				http.Error(w, "missing ID or versionStr", http.StatusBadRequest)
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
func PersistMap(db *sql.DB, wm *world.Manager, id, name, grid, gates string) error {
	return PersistMapVoxel(db, wm, id, name, grid, gates, "", "HYBRID")
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
func PersistMapVoxel(db *sql.DB, wm *world.Manager, id, name, grid, gates, voxel, mapType string) error {
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
		_, err = db.Exec(`UPDATE WorldMap SET name=?, gridData=?, gatesData=?, mapType=?, version=version+1, updatedAt=datetime('now') WHERE id=?`,
			name, grid, gates, mapType, id)
	} else {
		_, err = db.Exec(`INSERT INTO WorldMap (id, gameId, name, gridData, gatesData, encountersData, mapType, version)
			VALUES (?, 'saints', ?, ?, ?, '[]', ?, 1)`, id, name, grid, gates, mapType)
	}
	return err
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

func deployPublishedProjectRelease(db *sql.DB, wm *world.Manager, reg *registry.Manager, dm *dialogue.Manager, projectID string, version string, secret string) error {
	log.Printf("[ProjectRelease] project=%s version=%s stage=fetch", projectID, version)
	nextURL := os.Getenv("NEXT_JS_URL")
	if nextURL == "" {
		nextURL = "http://127.0.0.1:3000"
	}
	reqUrl := fmt.Sprintf("%s/api/internal/projects/%s?version=%s", nextURL, projectID, url.QueryEscape(version))
	
	req, err := http.NewRequest("GET", reqUrl, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+secret)
	
	client := &http.Client{Timeout: 60 * time.Second}
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
			ProjectID    string `json:"projectId"`
			Version      string `json:"version"`
			ManifestData string `json:"manifestData"`
			PublishedBy  string `json:"publishedBy"`
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

	log.Printf("[ProjectRelease] project=%s version=%s stage=persist", projectID, version)

	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Ensure WorldRelease table exists and insert it
	_, err = tx.Exec(`
		CREATE TABLE IF NOT EXISTS WorldRelease (
			projectId TEXT,
			version TEXT,
			manifestData TEXT,
			publishedBy TEXT,
			PRIMARY KEY (projectId, version)
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to create WorldRelease table: %w", err)
	}

	_, err = tx.Exec(`
		INSERT INTO WorldRelease (projectId, version, manifestData, publishedBy)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(projectId, version) DO UPDATE SET manifestData=excluded.manifestData, publishedBy=excluded.publishedBy
	`, syncResp.Release.ProjectID, syncResp.Release.Version, syncResp.Release.ManifestData, syncResp.Release.PublishedBy)
	if err != nil {
		return fmt.Errorf("failed to insert WorldRelease: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

		// Trigger the catalog to load this release
	if wm != nil {
		manifest, err := wm.ParseRelease(db, projectID, version)
		if err != nil {
			return fmt.Errorf("failed to parse release from db: %w", err)
		}
		if err := wm.ApplyReleaseMaps(manifest); err != nil {
			return fmt.Errorf("failed to load release maps into manager: %w", err)
		}
		
		if reg != nil {
			reg.LoadFromManifest(manifest.Actors.Creatures, manifest.Items)
		}
		if dm != nil && wm != nil {
			npcMap := make(map[string]struct{ Name string; Data string })
			for slug, npc := range wm.NPCRegistry {
				if len(npc.DialogueTree) > 0 {
					npcMap[slug] = struct{ Name string; Data string }{
						Name: npc.Name,
						Data: string(npc.DialogueTree),
					}
				}
			}
			dm.LoadFromNPCs(npcMap)
		}
	}

	return nil
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
