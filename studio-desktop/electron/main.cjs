const { app, BrowserWindow, ipcMain, shell, net } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

// Deep link protocol: saints-gaming://
const PROTOCOL_PREFIX = 'saints-gaming';

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL_PREFIX, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL_PREFIX);
}

// Single instance lock for deep links
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      // Find deep link argument on Windows
      const deepLink = commandLine.find((arg) => arg && arg.startsWith(`${PROTOCOL_PREFIX}://`));
      if (deepLink) {
        mainWindow.webContents.send('deep-link', deepLink);
      }
    }
  });

  app.whenReady().then(createWindow);
}

async function checkUrlReachable(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    try {
      const request = net.request({ method: 'HEAD', url });
      let hasResponded = false;

      const timer = setTimeout(() => {
        if (!hasResponded) {
          hasResponded = true;
          request.abort();
          resolve({ ok: false, status: 0 });
        }
      }, timeoutMs);

      request.on('response', (response) => {
        if (!hasResponded) {
          hasResponded = true;
          clearTimeout(timer);
          resolve({ ok: response.statusCode >= 200 && response.statusCode < 400, status: response.statusCode });
        }
      });

      request.on('error', () => {
        if (!hasResponded) {
          hasResponded = true;
          clearTimeout(timer);
          resolve({ ok: false, status: 0 });
        }
      });

      request.end();
    } catch (e) {
      resolve({ ok: false, status: 0 });
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    frame: false, // Frameless for custom native-styled titlebar
    backgroundColor: '#050b14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  mainWindow.on('maximize', () => mainWindow?.webContents?.send('window-maximize-changed', true));
  mainWindow.on('unmaximize', () => mainWindow?.webContents?.send('window-maximize-changed', false));

  function showConnectionError(failedUrl, errorMsg) {
    const errorHtml = `
      <!DOCTYPE html>
      <html class="dark">
        <head>
          <meta charset="utf-8">
          <title>Saints Gaming</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              background-color: #050b14;
              color: #f1f5f9;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              user-select: none;
            }
            .card {
              background: rgba(11, 16, 27, 0.85);
              border: 1px solid rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(20px);
              border-radius: 16px;
              padding: 36px;
              max-width: 460px;
              width: 90%;
              text-align: center;
              box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7);
            }
            .badge {
              display: inline-block;
              font-family: monospace;
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
              color: #f59e0b;
              background: rgba(245, 158, 11, 0.15);
              border: 1px solid rgba(245, 158, 11, 0.3);
              padding: 4px 10px;
              border-radius: 9999px;
              margin-bottom: 16px;
            }
            h1 { font-size: 20px; font-weight: 800; margin: 0 0 10px; color: #fff; letter-spacing: -0.02em; }
            p { font-size: 13px; color: #94a3b8; margin: 0 0 20px; line-height: 1.5; }
            input {
              width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 10px 14px; border-radius: 8px; font-size: 12px; font-family: monospace; margin-bottom: 14px; outline: none;
            }
            input:focus { border-color: #f59e0b; }
            .btn-group { display: flex; gap: 10px; justify-content: center; }
            button {
              background: #f59e0b; color: #050b14; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 12px; cursor: pointer; transition: all 0.2s;
            }
            button:hover { opacity: 0.9; transform: translateY(-1px); }
            button.secondary { background: rgba(255,255,255,0.1); color: #fff; }
            button.secondary:hover { background: rgba(255,255,255,0.15); }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">Connection Alert</div>
            <h1>Saints Gaming Offline</h1>
            <p>Could not connect to the Saints Gaming server. Verify your internet connection or configure your server address below:</p>
            <input id="serverInput" type="text" value="${failedUrl}" placeholder="https://saintsgaming.net/studio" />
            <div class="btn-group">
              <button onclick="window.location.href = document.getElementById('serverInput').value">Retry Connection</button>
              <button class="secondary" onclick="window.location.href = 'https://saintsgaming.net/studio'">Reset Default</button>
            </div>
          </div>
        </body>
      </html>
    `;
    mainWindow?.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
  }

  async function resolveAndLoad() {
    const serverArg = process.argv.find((arg) => arg && arg.startsWith('--server='));
    const serverUrlFromArg = serverArg ? serverArg.split('=')[1] : null;

    if (serverUrlFromArg) {
      console.log('[Electron] Loading custom server from CLI:', serverUrlFromArg);
      mainWindow.loadURL(serverUrlFromArg);
      return;
    }

    // 1. Check if local Next.js dev server is running on http://localhost:3000/studio
    const localCheck = await checkUrlReachable('http://localhost:3000', 800);
    if (localCheck.ok) {
      console.log('[Electron] Connected to local Next.js server: http://localhost:3000');
      // Load the bundled Vite UI, API calls route to local server via fetch interceptor
      const localIndexPath = path.join(app.getAppPath(), 'dist/index.html');
      if (fs.existsSync(localIndexPath)) {
        mainWindow.loadFile(localIndexPath);
        return;
      }
    }

    // 2. Check if remote production server returns 200 OK for /studio
    const prodUrl = 'https://saintsgaming.net';
    const prodCheck = await checkUrlReachable(prodUrl, 2000);
    if (prodCheck.ok) {
      console.log('[Electron] Production Saints Gaming reachable, loading bundled UI with remote API');
      const localIndexPath = path.join(app.getAppPath(), 'dist/index.html');
      if (fs.existsSync(localIndexPath)) {
        mainWindow.loadFile(localIndexPath);
        return;
      }
      // No bundled UI, fall through
    }
    console.log(`[Electron] Production ${prodUrl} returned status ${prodCheck.status}. Falling back to bundled client.`);

    // 3. Fallback to bundled local client so user NEVER gets a 404 "Page Not Found"!
    const localIndexPath = path.join(app.getAppPath(), 'dist/index.html');
    if (fs.existsSync(localIndexPath)) {
      console.log('[Electron] Loading bundled World Studio client:', localIndexPath);
      mainWindow.loadFile(localIndexPath);
      return;
    }

    // 4. Fallback if dist/index.html is missing
    showConnectionError(prodUrl, 'No local bundle or live server reachable.');
  }

  resolveAndLoad();

  // Developer shortcuts: F12 or Ctrl+Shift+I toggles DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12') {
      mainWindow?.webContents?.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3 || (validatedURL && validatedURL.startsWith('data:'))) return;
    console.error(`[Electron] Failed to load ${validatedURL}: ${errorCode} (${errorDescription})`);
    const localIndexPath = path.join(app.getAppPath(), 'dist/index.html');
    if (fs.existsSync(localIndexPath)) {
      mainWindow?.loadFile(localIndexPath);
    } else {
      showConnectionError(validatedURL, errorDescription);
    }
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[Renderer] [Level ${level}] ${message} (${sourceId}:${line})`);
  });

  if (process.argv.includes('--dev-tools') || process.argv.includes('--debug')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.once('did-finish-load', () => {
    console.log('[Electron] Saints Gaming app loaded successfully!');
    const initialDeepLink = process.argv.find((arg) => arg && arg.startsWith(`${PROTOCOL_PREFIX}://`));
    if (initialDeepLink) {
      mainWindow?.webContents?.send('deep-link', initialDeepLink);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-toggle-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());
ipcMain.on('open-external', (_event, url) => {
  if (url) shell.openExternal(url);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
