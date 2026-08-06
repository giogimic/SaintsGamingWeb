package httpapi

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/bootstrap"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/protocol"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/world"
)

// Server exposes REST helpers for maps (parity with /api/maps).
type Server struct {
	DB    *sql.DB
	World *world.Manager
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", s.health)
	mux.HandleFunc("/api/health", s.health)
	mux.HandleFunc("/api/maps", s.listMaps)
	mux.HandleFunc("/api/maps/", s.getMap)
	return withCORS(mux)
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"ok": true, "service": "go-mmo", "map": protocol.DemoMapID,
	})
}

func (s *Server) listMaps(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
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

func (s *Server) getMap(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/api/maps/")
	id = world.ToBaseMapID(id)
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
		"gridData": json.RawMessage(grid),
		"npcsData": json.RawMessage(orEmptyArr(npcs)),
		"tileLayersData": json.RawMessage(orEmptyArr(tiles)),
		"tilesetsData": json.RawMessage(orEmptyArr(tilesets)),
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
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
