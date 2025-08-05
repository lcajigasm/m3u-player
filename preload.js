const { contextBridge, ipcRenderer } = require('electron');

// Safe API for the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  // Files
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  saveFile: (relativePath, content) => ipcRenderer.invoke('save-file', relativePath, content),
  
  // Network (without CORS restrictions)
  fetchUrl: (url, options) => ipcRenderer.invoke('fetch-url', url, options),
  getProxyUrl: (url) => ipcRenderer.invoke('get-proxy-url', url),
  
  // App information
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Eventos del main process
  onFileLoaded: (callback) => {
    ipcRenderer.on('file-loaded', (event, data) => callback(data));
  },
  
  onShowUrlDialog: (callback) => {
    ipcRenderer.on('show-url-dialog', () => callback());
  },
  
  onShowSettings: (callback) => {
    ipcRenderer.on('show-settings', () => callback());
  },
  
  onShowAbout: (callback) => {
    ipcRenderer.on('show-about', () => callback());
  },
  
  onTogglePlayback: (callback) => {
    ipcRenderer.on('toggle-playback', () => callback());
  },
  
  onStopPlayback: (callback) => {
    ipcRenderer.on('stop-playback', () => callback());
  },
  
  onVolumeUp: (callback) => {
    ipcRenderer.on('volume-up', () => callback());
  },
  
  onVolumeDown: (callback) => {
    ipcRenderer.on('volume-down', () => callback());
  },
  
  onToggleMute: (callback) => {
    ipcRenderer.on('toggle-mute', () => callback());
  },
  
  // Limpiar listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Información del entorno
contextBridge.exposeInMainWorld('appInfo', {
  platform: process.platform,
  isElectron: true,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }
});
