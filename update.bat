@echo off
echo Starting System Update...
git pull

npm install
npx prisma db push --accept-data-loss
npm run build

where pm2 >nul 2>nul
if %ERRORLEVEL% == 0 (
    pm2 reload all
)
echo Update Complete.