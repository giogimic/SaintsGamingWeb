#!/bin/bash
echo "Starting System Update..."
git pull
# Detect if using Docker
if [ -f "docker-compose.yml" ] && command -v docker &> /dev/null; then
    echo "Docker environment detected. Rebuilding web container..."
    sudo docker compose build --no-cache web
    sudo docker compose up -d web
    if command -v systemctl &> /dev/null; then
        echo "Reloading web proxies if present..."
        sudo systemctl reload caddy 2>/dev/null || sudo systemctl restart caddy 2>/dev/null || true
        sudo systemctl reload nginx 2>/dev/null || sudo systemctl restart nginx 2>/dev/null || true
    fi
else
    # Non-Docker: use npm
    echo "Installing dependencies with npm..."
    npm install
    npx prisma db push --accept-data-loss
    npm run build
    # Check if pm2 is running and reload
    if command -v pm2 &> /dev/null; then
        pm2 reload all
    fi
fi
echo "Update Complete."