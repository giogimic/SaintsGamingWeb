package config

import (
	"os"
	"strconv"
)

// Config holds Go MMO runtime settings (dev ports until further notice).
type Config struct {
	Host           string
	Port           int
	HTTPAddr       string
	DatabaseURL    string
	AuthSecret     string
	DevAuthBypass  bool
	SimTPS         int
	NetTPS         int
	MaxPlayers     int
	LobbyCapacity  int
	CORSOrigin     string
	PublicBaseURL  string
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getenvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func getenvBool(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	switch v {
	case "1", "true", "TRUE", "yes", "YES", "on", "ON":
		return true
	case "0", "false", "FALSE", "no", "NO", "off", "OFF":
		return false
	default:
		return fallback
	}
}

// Load reads environment. Default listen :3100 so Next can keep :3000.
func Load() Config {
	port := getenvInt("GO_MMO_PORT", getenvInt("PORT", 3100))
	host := getenv("GO_MMO_HOST", getenv("HOSTNAME", "0.0.0.0"))
	return Config{
		Host:          host,
		Port:          port,
		HTTPAddr:      host + ":" + strconv.Itoa(port),
		DatabaseURL:   getenv("GO_MMO_DATABASE_URL", getenv("DATABASE_URL", "file:../prisma/db/dev.db")),
		AuthSecret:    getenv("AUTH_SECRET", "dev-secret-change-me"),
		DevAuthBypass: getenvBool("GO_MMO_DEV_AUTH", true),
		SimTPS:        getenvInt("GO_MMO_SIM_TPS", 20),
		NetTPS:        getenvInt("GO_MMO_NET_TPS", 10),
		MaxPlayers:    getenvInt("GO_MMO_MAX_PLAYERS", 500),
		LobbyCapacity: getenvInt("GO_MMO_LOBBY_CAPACITY", 50),
		CORSOrigin:    getenv("GO_MMO_CORS_ORIGIN", "*"),
		PublicBaseURL: getenv("GO_MMO_PUBLIC_URL", "http://127.0.0.1:3100"),
	}
}
