package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/combat"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/config"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/craft"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/creature"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/db"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/dialogue"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/economy"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/encounter"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/engine"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/httpapi"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/inventory"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/party"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/persist"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/player"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/protocol"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/quest"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/registry"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/skill"
	mmsocket "github.com/giogimic/SaintsGamingWeb/the-lobby/internal/socket"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/world"
	enginetypes "github.com/zishang520/engine.io/v2/types"
	"github.com/zishang520/socket.io/v2/socket"
)

func main() {
	cfg := config.Load()
	log.Printf("[go-mmo] starting on %s (dev auth bypass=%v)", cfg.HTTPAddr, cfg.DevAuthBypass)

	sqlDB, err := db.OpenSQLite(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db open: %v", err)
	}
	defer sqlDB.Close()

	// Legacy ServerSpawnMapID from database removed due to migration v6

	wm := world.NewManager(cfg.LobbyCapacity)
	wm.DB = sqlDB
	wm.FetchMapDef = func(id string) (*world.MapDef, error) {
		var snap struct {
			MapID              string
			RegionClass        sql.NullString
			ProceduralConfig   sql.NullString
			GridData           sql.NullString
			GatesData          sql.NullString
			EncountersData     sql.NullString
			EntitiesData       sql.NullString
			FreeformLayersData sql.NullString
		}
		err := sqlDB.QueryRow(`
			SELECT mapId, regionClass, proceduralConfig, gridData, gatesData, encountersData, entitiesData, freeformLayersData
			FROM WorldMapSnapshot
			WHERE mapId = ? OR mapId = ? OR mapId = ?
			ORDER BY id DESC LIMIT 1
		`, id, strings.ToUpper(id), strings.ToLower(id)).Scan(
			&snap.MapID, &snap.RegionClass, &snap.ProceduralConfig, &snap.GridData,
			&snap.GatesData, &snap.EncountersData, &snap.EntitiesData, &snap.FreeformLayersData,
		)
		if err != nil {
			return nil, err
		}

		def := &world.MapDef{
			ID:          snap.MapID,
			Name:        snap.MapID,
			Width:       128,
			Height:      128,
			SpawnX:      float64(protocol.DefaultSpawnX),
			SpawnY:      float64(protocol.DefaultSpawnY),
			SpawnZ:      0,
			RegionClass: snap.RegionClass.String,
		}

		if snap.GridData.Valid && snap.GridData.String != "" && snap.GridData.String != "null" {
			if grid, err := world.ParseGridJSON(snap.GridData.String); err == nil {
				def.Grid = grid
				def.Height = len(grid)
				if def.Height > 0 {
					def.Width = len(grid[0])
				}
			}
		}

		if snap.GatesData.Valid && snap.GatesData.String != "" {
			var gates struct {
				Gates []world.GateDef `json:"gates"`
			}
			if err := json.Unmarshal([]byte(snap.GatesData.String), &gates); err == nil {
				def.Gates = gates.Gates
			}
		}

		return def, nil
	}
	pm := player.NewManager(cfg.AOIZoneSize, sqlDB)
	cm := creature.NewManager()

	reg := registry.NewManager(sqlDB)

	deps := mmsocket.Deps{
		Parties:    party.NewManager(),
		Inventory:  inventory.NewManager(sqlDB),
		Combat:     combat.NewManager(reg),
		Encounters: encounter.NewManager(sqlDB),
		Dialogue:   dialogue.NewManager(sqlDB),
		Quests:     quest.NewManager(sqlDB),
		Craft:      craft.NewManager(),
		GTC:        economy.NewManager(),
		Skills:     skill.NewManager(sqlDB),
		Loot:       world.NewLootManager(),
		Registry:   reg,
		SaveMap: func(id, name, grid string) error {
			return httpapi.PersistMap(sqlDB, wm, id, name, grid, "{}")
		},
	}

	// Load latest saints release on boot
	if version, err := wm.ActiveReleaseVersion(sqlDB, "saints"); err == nil && version != "" {
		if manifest, err := wm.ParseRelease(sqlDB, "saints", version); err == nil {
			_ = wm.ApplyReleaseMaps(manifest)
			deps.Registry.LoadFromManifest(manifest.Actors.Creatures, manifest.Items)
			
			npcMap := make(map[string]struct{ Name string; Data string })
			for _, npc := range manifest.Actors.NPCs {
				if len(npc.DialogueTree) > 0 {
					npcMap[npc.Slug] = struct{ Name string; Data string }{
						Name: npc.Name,
						Data: string(npc.DialogueTree),
					}
				}
			}
			deps.Dialogue.LoadFromNPCs(npcMap)
		} else {
			log.Printf("[bootstrap] Failed to parse latest release %s: %v", version, err)
		}
	}

	hub := mmsocket.NewHub(cfg, nil, deps)
	wm.InitJit(cfg.NextJsUrl, cfg.InternalRpcSecret, hub.EmitToRoom)
	eng := engine.New(cfg, wm, pm, cm, hub)
	hub = mmsocket.NewHub(cfg, eng, deps) // Re-attach because eng needs hub
	wm.InitJit(cfg.NextJsUrl, cfg.InternalRpcSecret, hub.EmitToRoom)
	eng = engine.New(cfg, wm, pm, cm, hub)

	var socketOrigin any = cfg.CORSOrigin
	if cfg.CORSOrigin == "*" {
		socketOrigin = true
	}
	ioOpts := socket.DefaultServerOptions()
	ioOpts.SetCors(&enginetypes.Cors{
		Origin:      socketOrigin,
		Credentials: true,
	})
	io := socket.NewServer(nil, ioOpts)
	hub.Attach(io)

	api := &httpapi.Server{
		DB:       sqlDB,
		World:    wm,
		Dialogue: deps.Dialogue,
		Secret:   cfg.AuthSecret,
		Hub:      hub,
		Registry: deps.Registry,
		OnMapSynced: func(mapID string) {
			hub.BroadcastAll(protocol.EvContentReload, map[string]any{
				"type":    "map",
				"mapId":   mapID,
				"version": 0,
				"at":      time.Now().Format(time.RFC3339),
			})
		},
	}
	

	root := http.NewServeMux()
	root.Handle("/", api.Handler())
	root.Handle("/socket.io/", io.ServeHandler(nil))

	srv := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           root,
		ReadHeaderTimeout: 10 * time.Second,
	}

	eng.Start()
	defer eng.Stop()

	workerCtx, workerCancel := context.WithCancel(context.Background())
	outboxWorker := persist.NewOutboxWorker(sqlDB, cfg.NextJsUrl, cfg.AuthSecret)
	go outboxWorker.Start(workerCtx)

	go func() {
		log.Printf("[go-mmo] listening http+socket.io on %s", cfg.HTTPAddr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	ch := make(chan os.Signal, 1)
	signal.Notify(ch, syscall.SIGINT, syscall.SIGTERM)
	<-ch
	log.Printf("[go-mmo] shutting down")
	workerCancel()
	_ = srv.Close()
	io.Close(nil)
}

