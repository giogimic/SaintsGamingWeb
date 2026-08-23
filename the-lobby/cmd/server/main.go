package main

import (
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/bootstrap"
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
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/player"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/protocol"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/quest"
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

	wm := world.NewManager(cfg.LobbyCapacity)
	pm := player.NewManager(16, sqlDB)
	cm := creature.NewManager()
	deps := mmsocket.Deps{
		Parties:    party.NewManager(),
		Inventory:  inventory.NewManager(sqlDB),
		Combat:     combat.NewManager(),
		Encounters: encounter.NewManager(sqlDB),
		Dialogue:   dialogue.NewManager(sqlDB),
		Quests:     quest.NewManager(sqlDB),
		Craft:      craft.NewManager(),
		GTC:        economy.NewManager(),
		Skills:     skill.NewManager(sqlDB),
		Loot:       world.NewLootManager(),
		SaveMap: func(id, name, grid, npcs, tiles, tilesets string) error {
			return httpapi.PersistMap(sqlDB, wm, id, name, grid, npcs, tiles, tilesets)
		},
	}

	if err := bootstrap.EnsureDemo(sqlDB, wm); err != nil {
		log.Fatalf("bootstrap: %v", err)
	}

	hub := mmsocket.NewHub(cfg, nil, deps)
	eng := engine.New(cfg, wm, pm, cm, hub)
	hub = mmsocket.NewHub(cfg, eng, deps)
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
	_ = srv.Close()
	io.Close(nil)
}
