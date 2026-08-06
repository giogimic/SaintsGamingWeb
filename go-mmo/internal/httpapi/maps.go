package httpapi

import (
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/bootstrap"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/protocol"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/world"
)

// Server exposes REST helpers for maps (parity with /api/maps).
type Server struct {
	DB          *sql.DB
	World       *world.Manager
	Secret      string // AUTH_SECRET / internal bearer for Next → Go sync
	OnMapSynced func(mapID string)
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", s.health)
	mux.HandleFunc("/api/health", s.health)
	mux.HandleFunc("/api/maps", s.mapsRoot)
	mux.HandleFunc("/api/maps/", s.mapByID)
	mux.HandleFunc("/api/internal/sync-map", s.internalSyncMap)
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
		out = append(out, item{ID: protocol.DemoMapID, Name: "Demo Sandbox", Version: 1})
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) getMap(w http.ResponseWriter, r *http.Request, id string) {
	if id == "" {
		http.NotFound(w, r)
		return
	}
	var name, grid, npcs, tiles, tilesets string
	var version int
	err := s.DB.QueryRow(`SELECT name, gridData, npcsData, tileLayersData, tilesetsData, version FROM WorldMap WHERE id = ?`, id).
		Scan(&name, &grid, &npcs, &tiles, &tilesets, &version)
	if err == sql.ErrNoRows {
		if id == protocol.DemoMapID {
			_ = bootstrap.EnsureDemo(s.DB, s.World)
			err = s.DB.QueryRow(`SELECT name, gridData, npcsData, tileLayersData, tilesetsData, version FROM WorldMap WHERE id = ?`, id).
				Scan(&name, &grid, &npcs, &tiles, &tilesets, &version)
		}
	}
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
	})
}

type mapSaveBody struct {
	ID             string          `json:"id"`
	MapID          string          `json:"mapId"`
	Name           string          `json:"name"`
	GridData       json.RawMessage `json:"gridData"`
	NpcsData       json.RawMessage `json:"npcsData"`
	TileLayersData json.RawMessage `json:"tileLayersData"`
	TilesetsData   json.RawMessage `json:"tilesetsData"`
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
	if err := PersistMap(s.DB, s.World, id, name, grid, npcs, tiles, tilesets); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if s.OnMapSynced != nil {
		s.OnMapSynced(id)
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": id})
}

// internalSyncMap accepts map payloads from Next after Prisma save (Bearer AUTH_SECRET).
func (s *Server) internalSyncMap(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !s.authorizeInternal(r) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	s.saveMap(w, r, "")
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
func PersistMap(db *sql.DB, wm *world.Manager, id, name, grid, npcs, tiles, tilesets string) error {
	if grid != "[]" && grid != "" {
		if err := wm.ApplyGrid(id, name, grid); err != nil {
			// still persist even if parse fails for empty
			_ = err
		}
	}
	var count int
	_ = db.QueryRow(`SELECT COUNT(1) FROM WorldMap WHERE id = ?`, id).Scan(&count)
	var err error
	if count > 0 {
		_, err = db.Exec(`UPDATE WorldMap SET name=?, gridData=?, npcsData=?, tileLayersData=?, tilesetsData=?, version=version+1, updatedAt=datetime('now') WHERE id=?`,
			name, grid, npcs, tiles, tilesets, id)
	} else {
		_, err = db.Exec(`INSERT INTO WorldMap (id, gameId, name, gridData, gatesData, npcsData, encountersData, tileLayersData, tilesetsData, version)
			VALUES (?, 'tuxemon', ?, ?, '{}', ?, '[]', ?, ?, 1)`, id, name, grid, npcs, tiles, tilesets)
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
	if s == "" {
		return "[]"
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
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
