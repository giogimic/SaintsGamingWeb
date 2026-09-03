const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  toggleMaximize: () => ipcRenderer.send('window-toggle-maximize'),
  close: () => ipcRenderer.send('window-close'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  onMaximizeChange: (callback) => ipcRenderer.on('window-maximize-changed', (_event, value) => callback(value)),
  onDeepLink: (callback) => ipcRenderer.on('deep-link', (_event, url) => callback(url)),
});
