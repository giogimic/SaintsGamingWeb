package world

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
)

type ReleaseMap struct {
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
	RegionClass        string          `json:"regionClass"`
	ProceduralConfig   json.RawMessage `json:"proceduralConfig"`
	SpawnX             float64         `json:"spawnX"`
	SpawnY             float64         `json:"spawnY"`
	SpawnZ             float64         `json:"spawnZ"`
}

type ReleaseManifest struct {
	Version string `json:"version"`
	World   struct {
		Name     string  `json:"name"`
		SpawnMap string  `json:"spawnMap"`
		SpawnX   float64 `json:"spawnX"`
		SpawnY   float64 `json:"spawnY"`
		SpawnZ   float64 `json:"spawnZ"`
	} `json:"world"`
	Maps   []ReleaseMap      `json:"maps"`
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

// ActiveReleaseVersion returns the version string for the most recently created project release, or "" if none.
func (m *Manager) ActiveReleaseVersion(db *sql.DB, projectID string) (string, error) {
	var version string
	// Check for LIVE release matching project ID or slug
	err := db.QueryRow(`
		SELECT wr.version FROM WorldRelease wr
		LEFT JOIN WorldProject wp ON wr.projectId = wp.id
		WHERE (wr.projectId = ? OR wp.slug = ? OR wp.id = ?) AND wr.status = 'LIVE'
		ORDER BY wr.createdAt DESC LIMIT 1
	`, projectID, projectID, projectID).Scan(&version)
	if err == nil && version != "" {
		return version, nil
	}

	// Fallback to most recent release if none explicitly marked LIVE
	err = db.QueryRow(`
		SELECT wr.version FROM WorldRelease wr
		LEFT JOIN WorldProject wp ON wr.projectId = wp.id
		WHERE (wr.projectId = ? OR wp.slug = ? OR wp.id = ?)
		ORDER BY wr.createdAt DESC LIMIT 1
	`, projectID, projectID, projectID).Scan(&version)
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
	err := db.QueryRow(`
		SELECT wr.manifestData FROM WorldRelease wr
		LEFT JOIN WorldProject wp ON wr.projectId = wp.id
		WHERE (wr.projectId = ? OR wp.slug = ? OR wp.id = ?) AND wr.version = ?
		LIMIT 1
	`, projectID, projectID, projectID, version).Scan(&manifestStr)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch release manifest from db: %w", err)
	}

	var manifest ReleaseManifest
	if err := json.Unmarshal([]byte(manifestStr), &manifest); err != nil {
		return nil, fmt.Errorf("failed to unmarshal manifest: %w", err)
	}

	// Fetch heavy map data from WorldMapSnapshot table
	rows, err := db.Query(`
		SELECT mapId, regionClass, proceduralConfig, gridData, gatesData, encountersData, entitiesData, freeformLayersData 
		FROM WorldMapSnapshot 
		WHERE releaseId = (
			SELECT wr.id FROM WorldRelease wr
			LEFT JOIN WorldProject wp ON wr.projectId = wp.id
			WHERE (wr.projectId = ? OR wp.slug = ? OR wp.id = ?) AND wr.version = ?
			LIMIT 1
		)
	`, projectID, projectID, projectID, version)
	
	if err == nil {
		defer rows.Close()
		
		type MapSnap struct {
			RegionClass        sql.NullString
			ProceduralConfig   sql.NullString
			GridData           sql.NullString
			GatesData          sql.NullString
			EncountersData     sql.NullString
			EntitiesData       sql.NullString
			FreeformLayersData sql.NullString
		}
		
		mapSnapshots := make(map[string]MapSnap)
		
		for rows.Next() {
			var mapId string
			var snap MapSnap
			if err := rows.Scan(&mapId, &snap.RegionClass, &snap.ProceduralConfig, &snap.GridData, &snap.GatesData, &snap.EncountersData, &snap.EntitiesData, &snap.FreeformLayersData); err == nil {
				mapSnapshots[mapId] = snap
			}
		}
		
		for i := range manifest.Maps {
			if snap, ok := mapSnapshots[manifest.Maps[i].ID]; ok {
				manifest.Maps[i].RegionClass = snap.RegionClass.String
				if snap.ProceduralConfig.Valid && snap.ProceduralConfig.String != "" && snap.ProceduralConfig.String != "null" {
					manifest.Maps[i].ProceduralConfig = json.RawMessage(snap.ProceduralConfig.String)
				}
				if snap.GridData.Valid && snap.GridData.String != "" && snap.GridData.String != "null" {
					manifest.Maps[i].GridData = json.RawMessage(snap.GridData.String)
				}
				if snap.GatesData.Valid && snap.GatesData.String != "" && snap.GatesData.String != "null" {
					manifest.Maps[i].GatesData = json.RawMessage(snap.GatesData.String)
				}
				if snap.EncountersData.Valid && snap.EncountersData.String != "" && snap.EncountersData.String != "null" {
					manifest.Maps[i].EncountersData = json.RawMessage(snap.EncountersData.String)
				}
				if snap.EntitiesData.Valid && snap.EntitiesData.String != "" && snap.EntitiesData.String != "null" {
					manifest.Maps[i].EntitiesData = json.RawMessage(snap.EntitiesData.String)
				}
				if snap.FreeformLayersData.Valid && snap.FreeformLayersData.String != "" && snap.FreeformLayersData.String != "null" {
					manifest.Maps[i].FreeformLayersData = json.RawMessage(snap.FreeformLayersData.String)
				}
			}
		}
	} else {
		log.Printf("[WorldManager] Warning: failed to fetch map snapshots: %v", err)
	}

	return &manifest, nil
}

// ApplyReleaseMaps loads the map definitions into the manager.
func (m *Manager) ApplyReleaseMaps(manifest *ReleaseManifest) error {
	if manifest == nil {
		return fmt.Errorf("invalid manifest: manifest is nil")
	}
	if manifest.World.SpawnMap == "" {
		return fmt.Errorf("invalid manifest: missing world spawn map (manifest.World.SpawnMap is empty)")
	}

	spawnMapExists := false
	for _, mapData := range manifest.Maps {
		if mapData.ID == manifest.World.SpawnMap {
			spawnMapExists = true
			break
		}
	}
	if !spawnMapExists {
		return fmt.Errorf("invalid manifest: world spawn map '%s' does not exist in manifest.Maps", manifest.World.SpawnMap)
	}
	// Build registries for this release in local variables
	newNPCRegistry := make(map[string]NPCSchemaDef)
	for _, npc := range manifest.Actors.NPCs {
		newNPCRegistry[npc.Slug] = NPCSchemaDef{
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
			ID:          mapData.ID,
			Name:        mapData.Name,
			Width:       128,
			Height:      128,
			SpawnX:      mapData.SpawnX,
			SpawnY:      mapData.SpawnY,
			SpawnZ:      mapData.SpawnZ,
			RegionClass: mapData.RegionClass,
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

					if schemaDef, ok := newNPCRegistry[slug]; ok {
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
				var config struct {
					Seed uint32 `json:"seed"`
				}
				if len(mapData.ProceduralConfig) > 0 {
					_ = json.Unmarshal(mapData.ProceduralConfig, &config)
				}
				
				def.Voxel = &VoxelWorld{
					ID:            def.ID,
					RM:            m.RM,
					ActiveVersion: mapData.Version,
					ProceduralSeed: config.Seed,
				}
			}
		}

		newDefs[def.ID] = def
	}

	// Apply Connections Graph to Gates and build Connection Registry
	newConnections := make(map[string]map[string][]WorldConnection)
	for _, c := range manifest.Connections {
		if _, ok := newConnections[c.SourceMapID]; !ok {
			newConnections[c.SourceMapID] = make(map[string][]WorldConnection)
		}
		newConnections[c.SourceMapID][c.SourceGateID] = append(newConnections[c.SourceMapID][c.SourceGateID], c)
	}

	for mapID, def := range newDefs {
		if gatesConn, ok := newConnections[mapID]; ok {
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

	// Lock and swap the state atomically
	m.mu.Lock()
	defer m.mu.Unlock()

	m.ActiveRelease = manifest
	m.NPCRegistry = newNPCRegistry
	m.defs = newDefs
	m.Connections = newConnections

	return nil
}
