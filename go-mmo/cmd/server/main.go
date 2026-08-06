package main

import (
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/bootstrap"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/combat"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/config"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/creature"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/db"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/encounter"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/engine"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/httpapi"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/inventory"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/party"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/player"
	mmsocket "github.com/giogimic/SaintsGamingWeb/go-mmo/internal/socket"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/world"
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
	pm := player.NewManager(16)
	cm := creature.NewManager()
	deps := mmsocket.Deps{
		Parties:    party.NewManager(),
		Inventory:  inventory.NewManager(),
		Combat:     combat.NewManager(),
		Encounters: encounter.NewManager(),
	}

	if err := bootstrap.EnsureDemo(sqlDB, wm); err != nil {
		log.Fatalf("bootstrap: %v", err)
	}

	hub := mmsocket.NewHub(cfg, nil, deps)
	eng := engine.New(cfg, wm, pm, cm, hub)
	hub = mmsocket.NewHub(cfg, eng, deps)
	eng = engine.New(cfg, wm, pm, cm, hub)

	ioOpts := socket.DefaultServerOptions()
	ioOpts.SetCors(&enginetypes.Cors{
		Origin:      cfg.CORSOrigin,
		Credentials: true,
	})
	io := socket.NewServer(nil, ioOpts)
	hub.Attach(io)

	api := &httpapi.Server{DB: sqlDB, World: wm}
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
