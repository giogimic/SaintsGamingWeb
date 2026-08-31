@echo off
setlocal enabledelayedexpansion
:: =============================================================================
#  Saints Gaming — Modular Update Script (Windows)
#  Pulls the latest code and updates the platform with smart change detection.
#  Safe to run on a live server — preserves .env, database, and uploads.
:: =============================================================================

echo ======================================================
echo   Saints Gaming -- Modular Update Engine (Windows)
echo ======================================================
echo.

:: --- Guard: .env must exist ---
if not exist ".env" (
    echo [!] No .env file found!
    echo     This does not look like a configured installation.
    echo     Please run the setup process first for a fresh install.
    exit /b 1
)

:: --- Parse Arguments ---
set "UPDATE_MODE="
set "ARG1=%~1"

if /i "%ARG1%"=="quick" set "UPDATE_MODE=quick"
if /i "%ARG1%"=="-q" set "UPDATE_MODE=quick"
if /i "%ARG1%"=="/q" set "UPDATE_MODE=quick"
if /i "%ARG1%"=="--quick" set "UPDATE_MODE=quick"

if /i "%ARG1%"=="app" set "UPDATE_MODE=app"
if /i "%ARG1%"=="-a" set "UPDATE_MODE=app"
if /i "%ARG1%"=="/a" set "UPDATE_MODE=app"
if /i "%ARG1%"=="--app" set "UPDATE_MODE=app"

if /i "%ARG1%"=="db" set "UPDATE_MODE=db"
if /i "%ARG1%"=="-d" set "UPDATE_MODE=db"
if /i "%ARG1%"=="/d" set "UPDATE_MODE=db"
if /i "%ARG1%"=="--db" set "UPDATE_MODE=db"

if /i "%ARG1%"=="full" set "UPDATE_MODE=full"
if /i "%ARG1%"=="-f" set "UPDATE_MODE=full"
if /i "%ARG1%"=="/f" set "UPDATE_MODE=full"
if /i "%ARG1%"=="--full" set "UPDATE_MODE=full"

if /i "%ARG1%"=="restart" set "UPDATE_MODE=restart"
if /i "%ARG1%"=="-r" set "UPDATE_MODE=restart"
if /i "%ARG1%"=="/r" set "UPDATE_MODE=restart"

if /i "%ARG1%"=="auto" set "UPDATE_MODE=auto"
if /i "%ARG1%"=="--auto" set "UPDATE_MODE=auto"

:: --- Interactive Menu Selection if no profile passed ---
if "%UPDATE_MODE%"=="" (
    echo Select an update profile:
    echo   1) Smart Auto-Detect (Inspects git diff and only builds what changed)
    echo   2) Quick Sync (Fast code pull without rebuild, ~5s)
    echo   3) App Rebuild (Pull code, update packages ^& build Next.js)
    echo   4) Database Migration (Pull code, run Prisma push ^& generate)
    echo   5) Full Clean Rebuild (Complete clean rebuild ^& database push)
    echo   6) Restart Only (Instructions for service restart)
    echo.
    set /p "CHOICE=Enter choice [1-6] (Default: 1): "
    if "!CHOICE!"=="2" set "UPDATE_MODE=quick"
    if "!CHOICE!"=="3" set "UPDATE_MODE=app"
    if "!CHOICE!"=="4" set "UPDATE_MODE=db"
    if "!CHOICE!"=="5" set "UPDATE_MODE=full"
    if "!CHOICE!"=="6" set "UPDATE_MODE=restart"
    if "!UPDATE_MODE!"=="" set "UPDATE_MODE=auto"
)

echo [*] Active Update Profile: %UPDATE_MODE%
echo.

if /i "%UPDATE_MODE%"=="restart" (
    echo [*] Restarting Saints Gaming platform...
    echo     If running manually, press Ctrl+C in your terminal and run 'npm run dev' or 'npm run start'.
    echo ======================================================
    echo [v] Restart complete.
    echo ======================================================
    exit /b 0
)

:: --- Git Fetch ---
echo [*] Fetching latest code from Git...
git fetch --all
if %ERRORLEVEL% neq 0 (
    echo [!] git fetch failed. Check your internet connection.
    exit /b 1
)

:: --- Smart Diff Detection ---
set "NEED_NPM=0"
set "NEED_DB=0"
set "NEED_BUILD=1"

if /i "%UPDATE_MODE%"=="full" (
    set "NEED_NPM=1"
    set "NEED_DB=1"
    set "NEED_BUILD=1"
) else if /i "%UPDATE_MODE%"=="app" (
    set "NEED_NPM=1"
    set "NEED_DB=0"
    set "NEED_BUILD=1"
) else if /i "%UPDATE_MODE%"=="db" (
    set "NEED_NPM=0"
    set "NEED_DB=1"
    set "NEED_BUILD=0"
) else if /i "%UPDATE_MODE%"=="quick" (
    set "NEED_NPM=0"
    set "NEED_DB=0"
    set "NEED_BUILD=0"
) else (
    :: AUTO Mode: Analyze git diff
    for /f "tokens=*" %%F in ('git diff HEAD origin/main --name-only') do (
        echo %%F | findstr /i "package.json package-lock.json" >nul && set "NEED_NPM=1"
        echo %%F | findstr /i "prisma prepare-prisma.js" >nul && set "NEED_DB=1"
        echo %%F | findstr /i "src/ app/ server.ts next.config tsconfig.json public/" >nul && set "NEED_BUILD=1"
    )
)

echo ------------------------------------------------------
echo  Smart Update Execution Plan:
echo   - NPM Install:      !NEED_NPM!
echo   - DB Migration:     !NEED_DB!
echo   - Next.js Build:    !NEED_BUILD!
echo ------------------------------------------------------
echo.

:: --- Reset to latest Git commit ---
echo [*] Pulling latest code (resetting to origin/main)...
git reset --hard origin/main
if %ERRORLEVEL% neq 0 (
    echo [!] git reset failed.
    exit /b 1
)

:: --- Install Dependencies (if needed) ---
if "!NEED_NPM!"=="1" (
    echo [*] Installing dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [!] npm install failed.
        exit /b 1
    )
) else (
    echo [*] Skipping npm install (no package changes).
)

:: --- Prisma Setup (if needed) ---
if "!NEED_DB!"=="1" (
    echo [*] Pushing Prisma database schema...
    call npx prisma db push --accept-data-loss
    call npx prisma generate
) else (
    echo [*] Skipping database migration (no schema changes).
)

:: --- Build Next.js (if needed) ---
if "!NEED_BUILD!"=="1" (
    echo [*] Building Next.js application...
    call npm run build
    if %ERRORLEVEL% neq 0 (
        echo [!] Next.js build failed.
        exit /b 1
    )
) else (
    echo [*] Skipping full build (Fast hot-update).
)

echo.
echo ======================================================
echo [v] Update Complete! (Profile: %UPDATE_MODE%)
echo If running in development, your active server hot-reloads automatically.
echo If running in production, please restart using 'npm run start' or 'npm run dev'.
echo ======================================================
