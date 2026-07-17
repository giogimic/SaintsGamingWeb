@echo off
echo Starting System Update...
git pull

where bun >nul 2>nul
if %ERRORLEVEL% == 0 (
    bun install
    bunx prisma db push --accept-data-loss
    bun run build
) else (
    npm install
    npx prisma db push --accept-data-loss
    npm run build
)

where pm2 >nul 2>nul
if %ERRORLEVEL% == 0 (
    pm2 reload all
)
echo Update Complete.
