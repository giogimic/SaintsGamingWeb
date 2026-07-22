#!/bin/sh
# Runtime entrypoint — handles migration and startup

if [ -z "$DATABASE_URL" ]; then
    export DATABASE_URL="file:./prisma/db/dev.db"
    echo "[*] Warning: DATABASE_URL not set. Defaulting to $DATABASE_URL"
fi

echo "[*] Starting Saints Gaming..."

# Run database migration (unless DB_SKIP_MIGRATION is set)
if [ "$DB_SKIP_MIGRATION" != "true" ]; then
    if [ "$DB_PROVIDER" = "mysql" ]; then
        echo "[*] Ensuring MariaDB is ready (Docker healthcheck already passed)..."
        sleep 3
    fi
    echo "[*] Pushing database schema..."
    if ! bunx prisma db push --accept-data-loss; then
        echo "[!] ERROR: Database migration failed! Aborting startup."
        exit 1
    fi
    echo "[✓] Database schema ready."
    echo "[*] Seeding Tuxemon species, techniques, and campaign maps into database..."
    bun run scripts/import-tuxemon-data.ts || true
else
    echo "[*] Skipping schema migration (DB_SKIP_MIGRATION=true)."
fi

# Start the standalone MMO WebSockets server in the background
echo "[*] Starting Saints Tamer MMO Server (port 3001)..."
bun run game-server.js &

# Start the application
echo "[*] Starting Next.js server..."
exec bun run start
