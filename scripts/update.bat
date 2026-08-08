@echo off
:: =============================================================================
::  Saints Gaming — Update Script (Windows)
::  Pulls the latest code and rebuilds the web container in-place.
::  Safe to run on a live server — preserves .env, database, and uploads.
:: =============================================================================

echo ========================================
echo   Saints Gaming — Update Script
echo ========================================
echo.

:: --- Guard: .env must exist ---
if not exist ".env" (
    echo [!] No .env file found!
    echo     This does not look like a configured installation.
    echo     Please run the setup process first for a fresh install.
    exit /b 1
)

:: --- Git Pull ---
echo [*] Fetching latest code from Git...
git fetch --all
if %ERRORLEVEL% neq 0 (
    echo [!] git fetch failed. Check your internet connection.
    exit /b 1
)

:: We assume users on Windows using this script want to sync to main.
git reset --hard origin/main

:: --- Install Dependencies ---
echo [*] Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [!] npm install failed.
    exit /b 1
)

:: --- Prisma Setup ---
echo [*] Pushing Prisma database schema...
call npx prisma db push
call npx prisma generate

:: --- Build Next.js ---
echo [*] Building Next.js application...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [!] Next.js build failed.
    exit /b 1
)

echo.
echo ========================================
echo [✓] Update Complete!
echo If you are running the server manually, please restart it using 'npm run dev' or 'npm run start'.
echo If using a process manager, it may restart automatically.
echo ========================================
