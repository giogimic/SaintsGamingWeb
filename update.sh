#!/bin/bash
echo "Starting System Update..."
git pull
# Check if bun or npm is available
if command -v bun &> /dev/null; then
    bun install
    bun run build
else
    npm install
    npm run build
fi
# Check if pm2 is running and reload
if command -v pm2 &> /dev/null; then
    pm2 reload all
fi
echo "Update Complete."
