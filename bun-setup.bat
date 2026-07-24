@echo off
setlocal EnableDelayedExpansion

echo ========================================
echo   Saints Gaming - Windows Docker Setup
echo ========================================
echo.

:: Ctrl+C Message
echo Tip: Press Ctrl+C at any time to safely abort.
echo.

:: Permission Check Start
echo test > .perm_test
if %errorlevel% neq 0 (
    echo [!] Error: Please ensure you have write permissions in this directory.
    pause
    exit /b
)
del .perm_test

:: Port Auto-Discovery
set HTTP_PORT=80
set HTTPS_PORT=443
set WEB_PORT=3000

set CONFLICT=0
netstat -ano | findstr :!HTTP_PORT! >nul
if %errorlevel% equ 0 set CONFLICT=1
netstat -ano | findstr :!HTTPS_PORT! >nul
if %errorlevel% equ 0 set CONFLICT=1
netstat -ano | findstr :!WEB_PORT! >nul
if %errorlevel% equ 0 set CONFLICT=1

set REVERSE_PROXY_MODE=0

if "!CONFLICT!"=="1" (
    echo.
    echo [!] Reverse Proxy Detected
    echo We detected that another web service is already using ports 80/443 on this server.
    echo.
    echo Do you want to install Saints Gaming in "Behind a Reverse Proxy" mode?
    echo ^(This will only expose the Next.js app on a custom internal port^)
    choice /c YN /m "Enable Reverse Proxy Mode (Y/N):"
    if errorlevel 2 (
        echo.
        echo Would you like to automatically scan for and use free alternative ports instead?
        choice /c YN /m "Select Y/N:"
        if errorlevel 2 (
            echo [!] Please free up the required ports and try again.
            pause
            exit /b
        ) else (
            for /f %%i in ('powershell -Command "$p=80; while((Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue)){$p++}; $p"') do set HTTP_PORT=%%i
            for /f %%i in ('powershell -Command "$p=443; while((Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue)){$p++}; $p"') do set HTTPS_PORT=%%i
            for /f %%i in ('powershell -Command "$p=3000; while((Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue)){$p++}; $p"') do set WEB_PORT=%%i
            
            echo [*] Selected new available ports:
            echo     HTTP:  !HTTP_PORT!
            echo     HTTPS: !HTTPS_PORT!
            echo     Web:   !WEB_PORT!
        )
    ) else (
        set REVERSE_PROXY_MODE=1
        for /f %%i in ('powershell -Command "$p=3000; while((Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue)){$p++}; $p"') do set WEB_PORT=%%i
        echo.
        echo [*] Reverse Proxy Mode Enabled.
        echo [*] Internal Web App Port: !WEB_PORT!
        echo [!] You MUST configure your Reverse Proxy to point your domain to http://127.0.0.1:!WEB_PORT!
    )
)


:: Check Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Docker is not installed or not running. Please install Docker Desktop.
    pause
    exit /b
)

:: Smart State Detection
if exist .env (
    echo Existing Installation Detected!
    echo 1. Safe Update ^(Preserve Data ^& SSL^)
    echo 2. Clean Reinstall ^(Preserve DB ^& SSL^)
    echo 3. Nuclear Wipe ^(Destructive^)
    echo 4. Exit
    choice /c 1234 /m "Choose an option:"
    
    if errorlevel 4 exit /b
    if errorlevel 3 goto WIPE
    if errorlevel 2 goto CLEAN
    if errorlevel 1 goto UPDATE
)

goto FRESH_INSTALL

:UPDATE
echo Performing safe update...
call :RESTORE_DB_BLOCK
docker compose up -d --build
echo Safe Update Complete!
exit /b

:CLEAN
echo Performing clean reinstall...
docker compose down
call :RESTORE_DB_BLOCK
docker compose up -d --build
echo Clean Reinstall Complete!
exit /b

:RESTORE_DB_BLOCK
findstr /R "DATABASE_URL=.*@db:3306" .env >nul
if !errorlevel! equ 0 (
    echo Restoring Integrated Database Configuration...
    for /f "tokens=2 delims==" %%A in ('findstr "^MARIADB_PASSWORD=" .env') do set "DB_PASS=%%A"
    for /f "tokens=2 delims==" %%A in ('findstr "^MARIADB_ROOT_PASSWORD=" .env') do set "DB_ROOT_PASS=%%A"
    
    findstr /c:"container_name: saints-gaming-db" docker-compose.yml >nul
    if !errorlevel! neq 0 (
        echo. >> docker-compose.yml
        echo   db: >> docker-compose.yml
        echo     image: mariadb:10.11 >> docker-compose.yml
        echo     container_name: saints-gaming-db >> docker-compose.yml
        echo     restart: unless-stopped >> docker-compose.yml
        echo     environment: >> docker-compose.yml
        echo       MARIADB_DATABASE: saints_gaming >> docker-compose.yml
        echo       MARIADB_USER: saints >> docker-compose.yml
        echo       MARIADB_PASSWORD: !DB_PASS! >> docker-compose.yml
        echo       MARIADB_ROOT_PASSWORD: !DB_ROOT_PASS! >> docker-compose.yml
        echo     volumes: >> docker-compose.yml
        echo       - ./mysql_data:/var/lib/mysql >> docker-compose.yml
        echo     healthcheck: >> docker-compose.yml
        echo       test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"] >> docker-compose.yml
        echo       interval: 10s >> docker-compose.yml
        echo       timeout: 5s >> docker-compose.yml
        echo       retries: 5 >> docker-compose.yml
        powershell -NoProfile -Command "$p='docker-compose.yml'; $c=[System.IO.File]::ReadAllText($p); $marker='    container_name: saints-gaming-web'; $insert='    depends_on:\r\n      db:\r\n        condition: service_healthy'; if ($c -notmatch [regex]::Escape($insert)) { $c=$c -replace [regex]::Escape($marker), ($marker + [Environment]::NewLine + $insert) }; [System.IO.File]::WriteAllText($p, $c)"
    )
)
exit /b


:WIPE
echo.
echo WARNING: This deletes everything!
echo If you delete caddy_data, you consume a Let's Encrypt limit.
choice /c YN /m "Are you absolutely sure?"
if errorlevel 2 exit /b
docker compose down -v
if exist caddy_data rmdir /s /q caddy_data
if exist mysql_data rmdir /s /q mysql_data
if exist uploads rmdir /s /q uploads
if exist .env del /q .env
if exist Caddyfile del /q Caddyfile
copy docker-compose.base.yml docker-compose.yml >nul
echo Environment wiped.
goto FRESH_INSTALL

:FRESH_INSTALL
echo.
echo --- Initial Setup ---
if not exist data mkdir data
if not exist uploads mkdir uploads
copy /y docker-compose.base.yml docker-compose.yml >nul
powershell -NoProfile -Command "$c=[System.IO.File]::ReadAllText('docker-compose.yml'); $c=$c -replace '- \"3000:3000\"', '- \"!WEB_PORT!:3000\"'; [System.IO.File]::WriteAllText('docker-compose.yml', $c)"
if "!REVERSE_PROXY_MODE!"=="1" (
    powershell -NoProfile -Command "$c=[System.IO.File]::ReadAllText('docker-compose.yml'); $c=$c -replace '(?m)^\s*- \"80:80\"\r?\n', ''; $c=$c -replace '(?m)^\s*- \"443:443\"\r?\n', ''; [System.IO.File]::WriteAllText('docker-compose.yml', $c)"
) else (
    powershell -NoProfile -Command "$c=[System.IO.File]::ReadAllText('docker-compose.yml'); $c=$c -replace '- \"80:80\"', '- \"!HTTP_PORT!:80\"'; $c=$c -replace '- \"443:443\"', '- \"!HTTPS_PORT!:443\"'; [System.IO.File]::WriteAllText('docker-compose.yml', $c)"
)

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Node.js is not installed. Please install Node.js to continue.
    pause
    exit /b
)

node scripts\setup-env.mjs --generate-secret NEXT_PUBLIC_SITE_URL="http://localhost:!WEB_PORT!" DB_PROVIDER="sqlite" DATABASE_URL="file:./prisma/db/dev.db"

set /p DOMAIN="Enter your Domain Name (e.g. saintsgaming.net): "
if "!DOMAIN!"=="" set DOMAIN=localhost
set "SITE_URL=https://!DOMAIN!"

node scripts\setup-env.mjs NEXT_PUBLIC_SITE_URL="!SITE_URL!"

:: Web Server / Proxy Selection
set PROXY_CHOICE=caddy
where nginx >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo [!] Nginx detected on your system.
    echo Would you like to use your host Nginx instead of the built-in Docker Caddy server?
    choice /c YN /m "Select Y/N:"
    if not errorlevel 2 (
        set PROXY_CHOICE=host
        powershell -NoProfile -Command "$p='docker-compose.yml'; $c=Get-Content $p -Raw; $c = $c -replace '(?ms)^  caddy:.*',''; Set-Content -NoNewline $p -Value $c"
    )
)

if "!PROXY_CHOICE!"=="host" (
    set "SSL_CHOICE=Host Proxy (Manual)"
    echo.
    echo [!] Please configure your Nginx server to proxy traffic to http://localhost:!WEB_PORT!
    goto SKIP_CADDY
)

:: Cloudflare Proxy
echo.
echo Are you proxying traffic through Cloudflare (Orange Cloud)?
choice /c YN /m "Select Y/N:"
if errorlevel 2 (
    echo.
    echo Select SSL Certificate Authority:
    echo 1. Let's Encrypt ^(Default^)
    echo 2. BuyPass Go ^(Bypasses limits^)
    choice /c 12 /m "Select 1 or 2:"
    if errorlevel 2 (
        set SSL_CHOICE=BuyPass Go
        echo !DOMAIN!, www.!DOMAIN! { > Caddyfile
        echo     tls admin@!DOMAIN! { >> Caddyfile
        echo         issuer acme https://api.buypass.com/acme/directory >> Caddyfile
        echo     } >> Caddyfile
        echo     reverse_proxy web:3000 >> Caddyfile
        echo } >> Caddyfile
    ) else (
        set SSL_CHOICE=Let's Encrypt
        echo !DOMAIN!, www.!DOMAIN! { > Caddyfile
        echo     reverse_proxy web:3000 >> Caddyfile
        echo } >> Caddyfile
    )
) else (
    set SSL_CHOICE=Cloudflare ^(tls internal^)
    echo !DOMAIN!, www.!DOMAIN! { > Caddyfile
    echo     tls internal >> Caddyfile
    echo     reverse_proxy web:3000 >> Caddyfile
    echo } >> Caddyfile
)

:SKIP_CADDY

echo.
set /p ADMIN_USER="Enter Admin Username: "
if "!ADMIN_USER!"=="" set ADMIN_USER=Admin

set /p ADMIN_PASS="Enter Admin Password: "
set /p ADMIN_EMAIL="Enter Admin Email: "

:: Database
echo.
echo Select Database Backend:
echo 1. SQLite ^(Default^)
echo 2. MariaDB ^(Docker^)
echo 3. MySQL/MariaDB ^(External / Existing Host^)
choice /c 123 /m "Select 1, 2, or 3:"
if errorlevel 3 (
    set DB_NAME=MySQL ^(External^)
    
    set /p EXT_HOST="Enter Database Host/IP (default: 127.0.0.1): "
    if "!EXT_HOST!"=="" set EXT_HOST=127.0.0.1
    
    set /p EXT_PORT="Enter Database Port (default: 3306): "
    if "!EXT_PORT!"=="" set EXT_PORT=3306
    
    set /p EXT_USER="Enter Database User (default: root): "
    if "!EXT_USER!"=="" set EXT_USER=root
    
    set /p EXT_PASS="Enter Database Password: "
    
    set /p EXT_DB="Enter Database Name (default: saints_gaming): "
    if "!EXT_DB!"=="" set EXT_DB=saints_gaming
    
    node scripts\setup-env.mjs DATABASE_URL="mysql://!EXT_USER!:!EXT_PASS!@!EXT_HOST!:!EXT_PORT!/!EXT_DB!" DB_PROVIDER="mysql"
) else if errorlevel 2 (
    set DB_NAME=MariaDB ^(Docker^)
    
    :: Generate secure random passwords using powershell
    for /f "delims=" %%a in ('powershell -Command "-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 16 | %% {[char]$_})" ') do set "DB_PASS=%%a"
    for /f "delims=" %%a in ('powershell -Command "-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 16 | %% {[char]$_})" ') do set "DB_ROOT_PASS=%%a"
    
    node scripts\setup-env.mjs DATABASE_URL="mysql://saints:!DB_PASS!@db:3306/saints_gaming" DB_PROVIDER="mysql"
    
    echo. >> docker-compose.yml
    echo   db: >> docker-compose.yml
    echo     image: mariadb:10.11 >> docker-compose.yml
    echo     container_name: saints-gaming-db >> docker-compose.yml
    echo     restart: unless-stopped >> docker-compose.yml
    echo     environment: >> docker-compose.yml
    echo       MARIADB_DATABASE: saints_gaming >> docker-compose.yml
    echo       MARIADB_USER: saints >> docker-compose.yml
    echo       MARIADB_PASSWORD: !DB_PASS! >> docker-compose.yml
    echo       MARIADB_ROOT_PASSWORD: !DB_ROOT_PASS! >> docker-compose.yml
    echo     volumes: >> docker-compose.yml
    echo       - ./mysql_data:/var/lib/mysql >> docker-compose.yml
    echo     healthcheck: >> docker-compose.yml
    echo       test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"] >> docker-compose.yml
    echo       interval: 10s >> docker-compose.yml
    echo       timeout: 5s >> docker-compose.yml
    echo       retries: 5 >> docker-compose.yml
    powershell -NoProfile -Command "$p='docker-compose.yml'; $c=[System.IO.File]::ReadAllText($p); $marker='    container_name: saints-gaming-web'; $insert='    depends_on:\r\n      db:\r\n        condition: service_healthy'; if ($c -notmatch [regex]::Escape($insert)) { $c=$c -replace [regex]::Escape($marker), ($marker + [Environment]::NewLine + $insert) }; [System.IO.File]::WriteAllText($p, $c)"
) else (
    set DB_NAME=SQLite
)

echo.
echo ======================================
echo   Deployment Summary
echo ======================================
echo Database    : !DB_NAME!
echo Domain      : !DOMAIN!
echo SSL Option  : !SSL_CHOICE!
echo Admin User  : !ADMIN_USER!
echo ======================================
pause

echo.
echo Starting Cluster Build...
docker rm -f saints-gaming-web saints-gaming-db >nul 2>&1
docker compose up -d --build



echo.
echo [*] Waiting for the web server to become healthy...
set MAX_RETRIES=40
set RETRY_COUNT=0
set SERVER_READY=0

:: Read AUTH_SECRET from .env
for /f "tokens=2 delims==" %%A in ('findstr "^AUTH_SECRET=" .env') do set "SECRET_VAL=%%A"
:: Remove quotes
set SECRET_VAL=!SECRET_VAL:"=!

:SERVER_WAIT_LOOP
if !RETRY_COUNT! geq !MAX_RETRIES! goto SERVER_WAIT_END

:: Use powershell to check endpoint status
powershell -NoProfile -Command "$ErrorActionPreference='SilentlyContinue'; try { $r=Invoke-WebRequest -Uri 'http://localhost:!WEB_PORT!/api/dev/setup-admin' -Method Post -Headers @{Authorization='Bearer !SECRET_VAL!'; 'Content-Type'='application/json'} -Body '{}' -UseBasicParsing; if ($r.StatusCode -eq 200 -or $r.StatusCode -eq 400) { exit 0 } else { exit 1 } } catch { if ($_.Exception.Response.StatusCode.value__ -eq 400) { exit 0 } else { exit 1 } }"
if !errorlevel! equ 0 (
    set SERVER_READY=1
    goto SERVER_WAIT_END
)

<nul set /p="."
timeout /t 2 /nobreak >nul
set /a RETRY_COUNT+=1
goto SERVER_WAIT_LOOP

:SERVER_WAIT_END
echo.

if "!SERVER_READY!"=="1" (
    powershell -NoProfile -Command "$ErrorActionPreference='SilentlyContinue'; $body = @{ username='!ADMIN_USER!'; password='!ADMIN_PASS!'; email='!ADMIN_EMAIL!' } | ConvertTo-Json; Invoke-RestMethod -Uri 'http://localhost:!WEB_PORT!/api/dev/setup-admin' -Method Post -Headers @{Authorization='Bearer !SECRET_VAL!'; 'Content-Type'='application/json'} -Body $body | Out-Null"
    echo [✓] Initial Admin User configured.
) else (
    echo [!] Server took too long to start. It might still be initializing database migrations.
    echo     You can check the logs with: docker logs saints-gaming-web
)

:: Permission Check End
echo.
echo [*] Verifying permissions for data directories...
icacls data /grant "*S-1-5-32-545:(OI)(CI)M" >nul 2>&1
icacls uploads /grant "*S-1-5-32-545:(OI)(CI)M" >nul 2>&1

echo.
echo ============================================================
echo Setup Complete!
echo URL:            https://!DOMAIN!
echo Admin User:     !ADMIN_USER!
echo ============================================================
echo Useful Commands:
echo   View Logs:      docker logs saints-gaming-web -f
echo   Stop Cluster:   docker compose down
echo ============================================================
echo Launching Browser...
start https://!DOMAIN!

pause
