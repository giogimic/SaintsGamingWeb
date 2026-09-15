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

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/dialogue"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/protocol"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/registry"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/world"
)

// Server exposes REST helpers for internal communications and some game APIs.
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
	mux.HandleFunc("/api/internal/sync", s.internalSync)
	mux.HandleFunc("/internal/broadcast", s.internalBroadcast)
	mux.HandleFunc("/internal/disconnect", s.internalDisconnect)
	mux.HandleFunc("/api/gtc/listings", s.gtcListings)
	mux.HandleFunc("/api/craft/recipes", s.craftRecipes)
	return withCORS(mux)
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"ok": true, "service": "go-mmo", "map": s.World.DefaultSpawnMap(),
	})
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
	// NOTE: Because of v6 DB migration, this function will no longer write to WorldMap database table.
	// We only apply it in memory now for admin_save_map/voxel_edit via sockets during dev, until full WorldCompiler runs.
	// So we omit the SQLite inserts.
	return nil
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

	log.Printf("[ProjectRelease] project=%s version=%s stage=validate", projectID, version)

	// Validate the manifest before making any DB changes.
	var manifest world.ReleaseManifest
	if err := json.Unmarshal([]byte(syncResp.Release.ManifestData), &manifest); err != nil {
		return fmt.Errorf("failed to parse release manifest JSON: %w", err)
	}

	// Guardrail: Ensure the canonical spawn map actually exists in the release
	hasSpawn := false
	for _, m := range manifest.Maps {
		if m.ID == manifest.World.SpawnMap {
			hasSpawn = true
			break
		}
	}
	if !hasSpawn && len(manifest.Maps) > 0 {
		return fmt.Errorf("invalid release: spawn map '%s' does not exist in release", manifest.World.SpawnMap)
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
		// Use the already parsed manifest rather than reading from DB again
		if err := wm.ApplyReleaseMaps(&manifest); err != nil {
			return fmt.Errorf("failed to load release maps into manager: %w", err)
		}
		
		if reg != nil {
			reg.LoadFromManifest(manifest.Actors.Creatures, manifest.Items)
		}
		if dm != nil {
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
