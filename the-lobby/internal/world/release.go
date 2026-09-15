package world

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
)

type ReleaseManifest struct {
	Version string `json:"version"`
	World   struct {
		Name     string  `json:"name"`
		SpawnMap string  `json:"spawnMap"`
		SpawnX   float64 `json:"spawnX"`
		SpawnY   float64 `json:"spawnY"`
		SpawnZ   float64 `json:"spawnZ"`
	} `json:"world"`
	Maps    []struct {
		ID                 string          `json:"id"`
		Name               string          `json:"name"`
		Version            int             `json:"version"`
		GridData           json.RawMessage `json:"gridData"`
		GatesData          json.RawMessage `json:"gatesData"`
		EncountersData     json.RawMessage `json:"encountersData"`
		EntitiesData       json.RawMessage `json:"entitiesData"`
		TileLayersData     json.RawMessage `json:"tileLayersData"`
		FreeformLayersData json.RawMessage `json:"freeformLayersData"`
		TilesetsData       json.RawMessage `json:"tilesetsData"`
		MapType            string          `json:"mapType"`
		SpawnX             float64         `json:"spawnX"`
		SpawnY             float64         `json:"spawnY"`
		SpawnZ             float64         `json:"spawnZ"`
	} `json:"maps"`
	Atlas  map[string]string `json:"atlas"`
	Actors struct {
		NPCs []struct {
			Slug         string          `json:"slug"`
			Name         string          `json:"name"`
			WorldModel   string          `json:"worldModel"`
			DialogueTree json.RawMessage `json:"dialogueTree"` // Parsed on demand
			Capabilities json.RawMessage `json:"capabilities"`
		} `json:"npcs"`
		Creatures []json.RawMessage `json:"creatures"`
	} `json:"actors"`
	Gameplay struct {
		Abilities []json.RawMessage `json:"abilities"`
		Quests    []json.RawMessage `json:"quests"`
	} `json:"gameplay"`
	Items []json.RawMessage `json:"items"`
	Connections   []WorldConnection `json:"connections"`
}

type WorldConnection struct {
	ConnectionID         string `json:"connectionId"`
	SourceMapID          string `json:"sourceMapId"`
	SourceGateID         string `json:"sourceGateId"`
	Type                 string `json:"type"` // "internal" | "external"
	DestinationName      string `json:"destinationName"`
	Description          string `json:"description"`
	Icon                 string `json:"icon"`
	TargetMapReleaseID   string `json:"targetMapReleaseId,omitempty"`
	TargetEntryPointID   string `json:"targetEntryPointId,omitempty"`
	TargetWorldProjectID string `json:"targetWorldProjectId,omitempty"`
	TargetWorldReleaseID string `json:"targetWorldReleaseId,omitempty"`
}

// LatestReleaseVersion returns the version string for the most recently created project release, or "" if none.
func (m *Manager) LatestReleaseVersion(db *sql.DB, projectID string) (string, error) {
	var version string
	err := db.QueryRow("SELECT version FROM WorldRelease WHERE projectId = ? ORDER BY createdAt DESC LIMIT 1", projectID).Scan(&version)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", nil
		}
		return "", err
	}
	return version, nil
}

// ParseRelease fetches and parses a project release manifest.
func (m *Manager) ParseRelease(db *sql.DB, projectID string, version string) (*ReleaseManifest, error) {
	log.Printf("[WorldManager] Loading release project=%s version=%s", projectID, version)
	
	var manifestStr string
	err := db.QueryRow("SELECT manifestData FROM WorldRelease WHERE projectId = ? AND version = ?", projectID, version).Scan(&manifestStr)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch release manifest from db: %w", err)
	}

	var manifest ReleaseManifest
	if err := json.Unmarshal([]byte(manifestStr), &manifest); err != nil {
		return nil, fmt.Errorf("failed to unmarshal manifest: %w", err)
	}

	return &manifest, nil
}

// ApplyReleaseMaps loads the map definitions into the manager.
func (m *Manager) ApplyReleaseMaps(manifest *ReleaseManifest) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.ActiveRelease = manifest

	// Clear and rebuild registries for this release
	m.NPCRegistry = make(map[string]NPCSchemaDef)
	for _, npc := range manifest.Actors.NPCs {
		m.NPCRegistry[npc.Slug] = NPCSchemaDef{
			Slug:         npc.Slug,
			Name:         npc.Name,
			WorldModel:   npc.WorldModel,
			DialogueTree: npc.DialogueTree,
			Capabilities: npc.Capabilities,
		}
	}

	// 20. MapSync Hardening: Evict outdated in-memory cache versions
	// By creating a fresh defs map, we ensure maps deleted in this release are fully evicted from memory.
	newDefs := make(map[string]*MapDef)

	for _, mapData := range manifest.Maps {
		def := &MapDef{
			ID:     mapData.ID,
			Name:   mapData.Name,
			Width:  128,
			Height: 128,
			SpawnX: mapData.SpawnX,
			SpawnY: mapData.SpawnY,
			SpawnZ: mapData.SpawnZ,
		}

		if mapData.MapType != "FRACTAL" && mapData.MapType != "VOXEL" {
			if len(mapData.GridData) > 0 {
				if grid, err := ParseGridJSON(string(mapData.GridData)); err == nil {
					def.Grid = grid
					def.Height = len(grid)
					if def.Height > 0 {
						def.Width = len(grid[0])
					}
				}
			}
		}

		// Parse Gates
		if len(mapData.GatesData) > 0 {
			var gates struct {
				Gates []GateDef `json:"gates"`
			}
			if err := json.Unmarshal(mapData.GatesData, &gates); err == nil {
				def.Gates = gates.Gates
			}
		}

		// Parse Entities (NPCs)
		if len(mapData.EntitiesData) > 0 && string(mapData.EntitiesData) != "null" {
			var entities []struct {
				ID        string `json:"id"`
				Archetype string `json:"archetype"`
				Components struct {
					Identity struct {
						Slug string `json:"slug"`
					} `json:"identity"`
					Transform struct {
						X float64 `json:"x"`
						Y float64 `json:"y"`
					} `json:"transform"`
				} `json:"components"`
				// Legacy fields
				Type     string `json:"type"`
				DefID    string `json:"defId"`
				Position struct {
					X float64 `json:"x"`
					Y float64 `json:"y"`
				} `json:"position"`
			}
			if err := json.Unmarshal(mapData.EntitiesData, &entities); err == nil {
				var npcs []NPCDef
				for _, e := range entities {
					isNPC := e.Archetype == "npc" || e.Type == "npc"
					if !isNPC {
						continue
					}

					var slug string
					var x, y float64

					if e.Archetype == "npc" {
						slug = e.Components.Identity.Slug
						x = e.Components.Transform.X
						y = e.Components.Transform.Y
					} else {
						slug = e.DefID
						x = e.Position.X
						y = e.Position.Y
					}

					if schemaDef, ok := m.NPCRegistry[slug]; ok {
						npcs = append(npcs, NPCDef{
							ID:        e.ID,
							X:         x,
							Y:         y,
							SchemaDef: schemaDef,
						})
					} else {
						log.Printf("[WorldManager] Warning: Map %s placed NPC slug '%s' but it was missing from the Release Registry.", def.ID, slug)
					}
				}
				def.NPCs = npcs
			}
		}

		if mapData.MapType == "FRACTAL" || mapData.MapType == "VOXEL" {
			if m.RM != nil {
				def.Voxel = &VoxelWorld{
					ID:            def.ID,
					RM:            m.RM,
					ActiveVersion: mapData.Version,
				}
			}
		}

		newDefs[def.ID] = def
	}

	m.defs = newDefs

	// Apply Connections Graph to Gates and build Connection Registry
	m.Connections = make(map[string]map[string][]WorldConnection)
	for _, c := range manifest.Connections {
		if _, ok := m.Connections[c.SourceMapID]; !ok {
			m.Connections[c.SourceMapID] = make(map[string][]WorldConnection)
		}
		m.Connections[c.SourceMapID][c.SourceGateID] = append(m.Connections[c.SourceMapID][c.SourceGateID], c)
	}

	for mapID, def := range m.defs {
		if gatesConn, ok := m.Connections[mapID]; ok {
			for i, g := range def.Gates {
				if conns, ok := gatesConn[g.ID]; ok && len(conns) > 0 {
					// Apply legacy backward-compat fields to the gate definition (just takes the first connection)
					conn := conns[0]
					def.Gates[i].Type = conn.Type
					def.Gates[i].TargetMapReleaseID = conn.TargetMapReleaseID
					def.Gates[i].TargetEntryPointID = conn.TargetEntryPointID
					def.Gates[i].TargetWorldProjectID = conn.TargetWorldProjectID
					def.Gates[i].TargetWorldReleaseID = conn.TargetWorldReleaseID
				}
			}
		}
	}

	log.Printf("[WorldManager] Release maps loaded: %d maps, %d connections", len(manifest.Maps), len(manifest.Connections))

	return nil
}
