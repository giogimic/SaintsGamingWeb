const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

let mainWindow = null;

// Deep link protocol: saints-studio://
const PROTOCOL_PREFIX = 'saints-studio';

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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    frame: false, // Frameless for custom titlebar
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

  const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:1420');
  } else {
    const indexPath = path.join(app.getAppPath(), 'dist/index.html');
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('[Electron] Failed to loadFile:', err);
    });
  }

  // Developer shortcuts: F12 or Ctrl+Shift+I toggles DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12') {
      mainWindow?.webContents?.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Electron] Failed to load ${validatedURL}: ${errorCode} (${errorDescription})`);
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[Renderer] [Level ${level}] ${message} (${sourceId}:${line})`);
  });

  if (process.argv.includes('--dev-tools') || process.argv.includes('--debug')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.once('did-finish-load', async () => {
    try {
      const rootHtml = await mainWindow.webContents.executeJavaScript("document.getElementById('root')?.innerHTML");
      console.log('[Electron] React Root mounted successfully! Length:', rootHtml?.length);
    } catch (e) {
      console.error('[Electron] Error querying root:', e);
    }

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
