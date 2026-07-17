@echo off
echo Starting System Update...
git pull

where bun >nul 2>nul
if %ERRORLEVEL% == 0 (
    bun install
    bun run build
) else (
    npm install
    npm run build
)

where pm2 >nul 2>nul
if %ERRORLEVEL% == 0 (
    pm2 reload all
)
echo Update Complete.
