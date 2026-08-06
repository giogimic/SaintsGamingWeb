#!/bin/sh
# Runtime entrypoint — handles migration and startup.
# Production MUST run custom server.ts (Next + Socket.io + GameEngine + DemoBootstrap).
# Plain `next start` leaves /socket.io and map bootstrap dead (grass-only lobby).

# Ensure the SQLite DB directory exists (volume mount target)
mkdir -p /app/prisma/db

if [ -z "$DATABASE_URL" ]; then
    export DATABASE_URL="file:./prisma/db/dev.db"
    echo "[*] Warning: DATABASE_URL not set. Defaulting to $DATABASE_URL"
fi

echo "[*] Starting Saints Gaming..."

# Run database migration (unless DB_SKIP_MIGRATION is set)
if [ "$DB_SKIP_MIGRATION" != "true" ]; then
    if [ "$DB_PROVIDER" = "mysql" ]; then
        echo "[*] MySQL/MariaDB mode: swapping Prisma provider and regenerating client..."
        # Swap the provider in schema.prisma from sqlite to mysql
        sed -i 's/provider = "sqlite"/provider = "mysql"/g' prisma/schema.prisma
        # Run the MySQL schema preparation script (converts SQLite-specific types)
        if [ -f scripts/prepare-mysql-schema.js ]; then
            node scripts/prepare-mysql-schema.js || true
        fi
        # Regenerate the Prisma client for MySQL now that the DB is reachable
        if ! npx prisma generate; then
            echo "[!] ERROR: Prisma client generation failed for MySQL! Aborting startup."
            exit 1
        fi
        echo "[*] Ensuring MariaDB is ready (Docker healthcheck already passed)..."
        sleep 3
    fi

    echo "[*] Pushing database schema..."
    rm -rf prisma/migrations 2>/dev/null || true
    if ! npx prisma db push --accept-data-loss; then
        echo "[!] ERROR: Database migration failed! Aborting startup."
        exit 1
    fi
    echo "[✓] Database schema ready."
    echo "[*] Demo maps/NPCs seed via server.ts bootstrapDemoContent() on every boot."
else
    echo "[*] Skipping schema migration (DB_SKIP_MIGRATION=true)."
fi

# Single process: Next.js + Socket.io + MMO GameEngine (see package.json "start").
# Do NOT start legacy game-server.js (removed) or plain `next start` — both break lobby.
echo "[*] Starting Saints Gaming (custom server.ts on port ${PORT:-3000})..."
exec npm run start
