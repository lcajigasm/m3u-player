const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const net = require('net');
const crypto = require('crypto');
const { URL } = require('url');
const Store = require('electron-store');

// Main window configuration
let mainWindow;

// Proxy server for IPTV streams
let proxyServer = null;
let proxyToken = null;
const approvedWritePaths = new Set();

// Create configuration directory if it doesn't exist
const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'config.json');
const runtimeDebugMode = process.argv.includes('--dev') || process.argv.includes('--verbose') || process.env.NODE_ENV === 'development';
const appLog = (...args) => {
  if (runtimeDebugMode) {
    console.log(...args);
  }
};

// Default configuration
const defaultConfig = {
  windowSize: { width: 1200, height: 800, x: undefined, y: undefined },
  playerSettings: {
    volume: 0.8,
    autoplay: true,
    userAgent: 'M3U Player/1.0.0',
    referer: '',
    origin: ''
  },
  recentFiles: []
};

// Library store (playlists, favorites, recents)
const libraryStore = new Store({
  name: 'library',
  fileExtension: 'json',
});

function getLibraryState() {
  const state = libraryStore.get('state');
  if (!state || typeof state !== 'object') {
    const initial = { version: 1, playlists: [], favorites: { folders: [], items: [] }, recents: [] };
    libraryStore.set('state', initial);
    return initial;
  }
  const withDefaults = {
    version: typeof state.version === 'number' ? state.version : 1,
    playlists: Array.isArray(state.playlists) ? state.playlists : [],
    favorites: {
      folders: Array.isArray(state?.favorites?.folders) ? state.favorites.folders : [],
      items: Array.isArray(state?.favorites?.items) ? state.favorites.items : [],
    },
    recents: Array.isArray(state.recents) ? state.recents.slice(0, 20) : [],
  };
  if ((state.recents?.length || 0) !== withDefaults.recents.length) {
    libraryStore.set('state', withDefaults);
  }
  return withDefaults;
}

function setLibraryState(nextState) {
  if (!nextState || typeof nextState !== 'object') return false;
  if (Array.isArray(nextState.recents)) {
    nextState.recents = nextState.recents
      .slice()
      .sort((a, b) => (b.playedAt || 0) - (a.playedAt || 0))
      .slice(0, 20);
  }
  libraryStore.set('state', nextState);
  return true;
}

// Load configuration
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return { ...defaultConfig, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Error loading configuration:', error);
  }
  return defaultConfig;
}

// Save configuration
function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving configuration:', error);
  }
}

function resolveWithin(baseDir, candidatePath) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(candidatePath);
  const isInside = resolvedTarget === resolvedBase || resolvedTarget.startsWith(`${resolvedBase}${path.sep}`);
  return { resolvedBase, resolvedTarget, isInside };
}

function isInternalAppUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'about:') return parsed.href === 'about:blank';
    if (parsed.protocol !== 'file:') return false;

    const filePath = decodeURIComponent(parsed.pathname);
    const { isInside } = resolveWithin(__dirname, filePath);
    return isInside;
  } catch {
    return false;
  }
}

function isExternalHttpUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getSenderUrl(event) {
  const senderFrameUrl = event?.senderFrame?.url;
  if (typeof senderFrameUrl === 'string' && senderFrameUrl) {
    return senderFrameUrl;
  }
  const senderUrl = event?.sender?.getURL?.();
  if (typeof senderUrl === 'string' && senderUrl) {
    return senderUrl;
  }
  return '';
}

function assertTrustedIpcSender(event, channel) {
  const senderUrl = getSenderUrl(event);
  if (senderUrl && isInternalAppUrl(senderUrl)) {
    return true;
  }
  console.warn(`Blocked IPC "${channel}" from untrusted sender: ${senderUrl || 'unknown'}`);
  return false;
}

function isDisallowedProxyTarget(hostname) {
  const host = String(hostname || '').toLowerCase();
  if (!host) return true;
  if (host === 'localhost') return true;
  if (host.endsWith('.localhost')) return true;

  const ipVersion = net.isIP(host);
  if (ipVersion === 4) {
    if (host.startsWith('127.')) return true;
    if (host === '0.0.0.0') return true;
  }

  if (ipVersion === 6) {
    if (host === '::1' || host === '::') return true;
  }

  return false;
}

function getProxyToken() {
  if (!proxyToken) {
    proxyToken = crypto.randomBytes(24).toString('hex');
  }
  return proxyToken;
}

function createWindow() {
  if (!app.isReady()) {
    // Previene creación prematura
    app.once('ready', createWindow);
    return;
  }
  const config = loadConfig();
  
  // Create the browser window
  const iconPath = path.join(__dirname, 'assets', process.platform === 'darwin' ? 'icon.icns' : process.platform === 'win32' ? 'icon.ico' : 'icon.png');
  appLog('Using icon path:', iconPath);
  
  const windowOptions = {
    width: config.windowSize.width,
    height: config.windowSize.height,
    minWidth: 900,
    minHeight: 650,
    maxWidth: process.platform === 'darwin' ? undefined : 2560,
    maxHeight: process.platform === 'darwin' ? undefined : 1440,
    icon: iconPath,
    title: 'M3U Player',
    resizable: true,
    movable: true,
    minimizable: true,
    maximizable: true,
    closable: true,
    focusable: true,
    alwaysOnTop: false,
    fullscreenable: true,
    kiosk: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      cache: false,
      enableWebSQL: false,
      allowRunningInsecureContent: false
    },
    titleBarStyle: 'default',
    show: false,
    center: config.windowSize.x === undefined || config.windowSize.y === undefined,
    skipTaskbar: false
  };

  // Set position if saved
  if (config.windowSize.x !== undefined && config.windowSize.y !== undefined) {
    windowOptions.x = config.windowSize.x;
    windowOptions.y = config.windowSize.y;
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Load the application
  mainWindow.loadFile('src/index.html');

  // Relax CSP only at runtime if needed by allowing http(s) connect for m3u/m3u8 fetches
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = details.responseHeaders || {};
    const cspHeaderKey = Object.keys(responseHeaders).find(k => k.toLowerCase() === 'content-security-policy');
    if (cspHeaderKey) {
      const current = Array.isArray(responseHeaders[cspHeaderKey]) ? responseHeaders[cspHeaderKey][0] : responseHeaders[cspHeaderKey];
      // Ensure connect-src allows http/https/ws/wss and media-src allows http/https
      const patched = current
        .replace(/connect-src[^;]*/i, (m) => {
          return m.includes('http:') ? m : `${m} http: https: ws: wss: blob: data:`;
        })
        .replace(/media-src[^;]*/i, (m) => {
          return m.includes('http:') ? m : `${m} http: https:`;
        })
        .replace(/img-src[^;]*/i, (m) => {
          return m.includes('http:') ? m : `${m} http:`;
        });
      responseHeaders[cspHeaderKey] = [patched];
    }
    callback({ responseHeaders });
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window resize
  mainWindow.on('resize', () => {
    const bounds = mainWindow.getBounds();
    appLog(`Window resized to: ${bounds.width}x${bounds.height}`);
  });

  // Handle window move
  mainWindow.on('move', () => {
    const bounds = mainWindow.getBounds();
    appLog(`Window moved to: ${bounds.x}, ${bounds.y}`);
  });

  // Save window size and position on close
  mainWindow.on('close', () => {
    const bounds = mainWindow.getBounds();
    const config = loadConfig();
    config.windowSize = { 
      width: bounds.width, 
      height: bounds.height,
      x: bounds.x,
      y: bounds.y
    };
    saveConfig(config);
  });

  // Bloquear navegación fuera de la app
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isInternalAppUrl(url)) return;

    event.preventDefault();
    if (isExternalHttpUrl(url)) {
      shell.openExternal(url).catch((error) => {
        console.error('Failed to open external URL:', error);
      });
    }
    console.warn('Bloqueo de navegación interna a URL no permitida:', url);
  });

  // Bloquear apertura de nuevas ventanas dentro del renderer
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalHttpUrl(url)) {
      shell.openExternal(url).catch((error) => {
        console.error('Failed to open external URL:', error);
      });
    }
    return { action: 'deny' };
  });

  // webRequest: sólo si hay headers por canal y sólo para dominios de la playlist activa
  const { session } = mainWindow.webContents;
  session.webRequest.onBeforeSendHeaders((details, callback) => {
    // Implementar lógica para permitir headers sólo si son del dominio de la playlist activa
    // Ejemplo: if (isPlaylistDomain(details.url)) { /* set headers */ }
    callback({ cancel: false });
  });

  // ...existing code...
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open M3U File...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            openFileDialog();
          }
        },
        {
          label: 'Open URL...',
          accelerator: 'CmdOrCtrl+U',
          click: () => {
            mainWindow.webContents.send('show-url-dialog');
          }
        },
        { type: 'separator' },
        {
          label: 'Settings...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('show-settings');
          }
        },
        { type: 'separator' },
        {
          label: process.platform === 'darwin' ? 'Quit' : 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo'
        },
        {
          label: 'Redo',
          accelerator: 'Shift+CmdOrCtrl+Z',
          role: 'redo'
        },
        { type: 'separator' },
        {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectall'
        }
      ]
    },
    {
      label: 'Playback',
      submenu: [
        {
          label: 'Play/Pause',
          accelerator: 'Space',
          click: () => {
            mainWindow.webContents.send('toggle-playback');
          }
        },
        {
          label: 'Stop',
          accelerator: 'Escape',
          click: () => {
            mainWindow.webContents.send('stop-playback');
          }
        },
        { type: 'separator' },
        {
          label: 'Volume Up',
          accelerator: 'Up',
          click: () => {
            mainWindow.webContents.send('volume-up');
          }
        },
        {
          label: 'Volume Down',
          accelerator: 'Down',
          click: () => {
            mainWindow.webContents.send('volume-down');
          }
        },
        {
          label: 'Mute',
          accelerator: 'M',
          click: () => {
            mainWindow.webContents.send('toggle-mute');
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Fullscreen',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11',
          click: () => {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
          }
        },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.reload();
          }
        },
        {
          label: 'Force Reload (no cache)',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            mainWindow.webContents.reloadIgnoringCache();
          }
        },
        {
          label: 'Clear Cache',
          click: async () => {
            const session = mainWindow.webContents.session;
            await session.clearCache();
            mainWindow.reload();
          }
        },
        { type: 'separator' },
        {
          label: 'Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            mainWindow.minimize();
          }
        },
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            mainWindow.close();
          }
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            const currentZoom = mainWindow.webContents.getZoomFactor();
            mainWindow.webContents.setZoomFactor(Math.min(currentZoom + 0.1, 2.0));
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            const currentZoom = mainWindow.webContents.getZoomFactor();
            mainWindow.webContents.setZoomFactor(Math.max(currentZoom - 0.1, 0.5));
          }
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow.webContents.setZoomFactor(1.0);
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            mainWindow.webContents.send('show-about');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function openFileDialog() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select M3U File',
    filters: [
      { name: 'M3U Files', extensions: ['m3u', 'm3u8'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Add to recent files
      const config = loadConfig();
      const recentFile = {
        path: filePath,
        name: path.basename(filePath),
        timestamp: Date.now()
      };
      
      config.recentFiles = config.recentFiles.filter(f => f.path !== filePath);
      config.recentFiles.unshift(recentFile);
      config.recentFiles = config.recentFiles.slice(0, 10); // Keep only the last 10
      
      saveConfig(config);
      
      mainWindow.webContents.send('file-loaded', {
        content,
        filename: path.basename(filePath),
        fullPath: filePath
      });
    } catch (error) {
      console.error('Error reading file:', error);
      dialog.showErrorBox('Error', `Could not read file: ${error.message}`);
    }
  }
}

function isAllowedHttpUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function resolveRedirectUrl(baseUrl, locationHeader) {
  return new URL(locationHeader, baseUrl).toString();
}

function getConfigValue(config, dottedKey) {
  if (typeof dottedKey !== 'string' || !dottedKey) return undefined;
  return dottedKey.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), config);
}

function setConfigValue(config, dottedKey, value) {
  if (typeof dottedKey !== 'string' || !dottedKey) return false;
  const parts = dottedKey.split('.');
  let current = config;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
  return true;
}

// Function to make HTTP/HTTPS requests with custom headers
function fetchUrl(url, options = {}, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (!isAllowedHttpUrl(url)) {
      reject(new Error('Only HTTP/HTTPS URLs are allowed'));
      return;
    }

    const maxRedirects = typeof options.maxRedirects === 'number' ? options.maxRedirects : 5;
    if (redirectCount > maxRedirects) {
      reject(new Error(`Too many redirects (>${maxRedirects})`));
      return;
    }

    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': options.userAgent || 'M3U Player/1.0.0',
        ...options.headers
      },
      timeout: options.timeout || 30000
    };

    if (options.referer) {
      requestOptions.headers['Referer'] = options.referer;
    }

    if (options.origin) {
      requestOptions.headers['Origin'] = options.origin;
    }

    const req = client.request(requestOptions, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectedUrl;
        try {
          redirectedUrl = resolveRedirectUrl(url, res.headers.location);
        } catch {
          reject(new Error(`Invalid redirect location: ${res.headers.location}`));
          return;
        }

        if (!isAllowedHttpUrl(redirectedUrl)) {
          reject(new Error(`Disallowed redirect target protocol: ${redirectedUrl}`));
          return;
        }

        appLog(`Following redirect from ${url} to ${redirectedUrl}`);
        fetchUrl(redirectedUrl, options, redirectCount + 1).then(result => {
          // Pass the final URL up the chain
          resolve({
            ...result,
            finalUrl: result.finalUrl || redirectedUrl
          });
        }).catch(reject);
        return;
      }
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          finalUrl: url // This is the final URL (no more redirects)
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// IPC Handlers
ipcMain.handle('load-config', () => {
  return loadConfig();
});

ipcMain.handle('save-config', (event, config) => {
  if (!assertTrustedIpcSender(event, 'save-config')) return false;
  saveConfig(config);
  return true;
});

ipcMain.handle('settings-get', (event, key) => {
  if (!assertTrustedIpcSender(event, 'settings-get')) return undefined;
  const config = loadConfig();
  return getConfigValue(config, key);
});

ipcMain.handle('settings-put', (event, key, value) => {
  if (!assertTrustedIpcSender(event, 'settings-put')) return false;
  const config = loadConfig();
  const updated = setConfigValue(config, key, value);
  if (!updated) return false;
  saveConfig(config);
  return true;
});

ipcMain.handle('fetch-url', async (event, url, options = {}) => {
  if (!assertTrustedIpcSender(event, 'fetch-url')) {
    return { success: false, error: 'Untrusted IPC sender' };
  }
  try {
    if (!isAllowedHttpUrl(url)) {
      throw new Error('Only HTTP/HTTPS URLs are allowed');
    }
    const response = await fetchUrl(url, options);
    return {
      success: true,
      data: response.data,
      statusCode: response.statusCode,
      headers: response.headers,
      finalUrl: response.finalUrl || url
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('open-file-dialog', async (event) => {
  if (!assertTrustedIpcSender(event, 'open-file-dialog')) return;
  await openFileDialog();
});

ipcMain.handle('playlists-import-url', async (event, playlistUrl) => {
  if (!assertTrustedIpcSender(event, 'playlists-import-url')) {
    return { success: false, error: 'Untrusted IPC sender' };
  }
  try {
    if (!isAllowedHttpUrl(playlistUrl)) {
      return { success: false, error: 'Only HTTP/HTTPS URLs are allowed' };
    }

    const response = await fetchUrl(playlistUrl, { timeout: 30000 });
    return {
      success: true,
      data: response.data,
      statusCode: response.statusCode,
      finalUrl: response.finalUrl || playlistUrl
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('playlists-import-file', async (event, file) => {
  if (!assertTrustedIpcSender(event, 'playlists-import-file')) {
    return { success: false, error: 'Untrusted IPC sender' };
  }
  try {
    const candidatePath = typeof file === 'string' ? file : file?.path;
    if (!candidatePath) {
      return { success: false, error: 'File path is required' };
    }

    if (!path.isAbsolute(candidatePath)) {
      return { success: false, error: 'playlists-import-file requires an absolute path' };
    }
    const ext = path.extname(candidatePath).toLowerCase();
    if (ext !== '.m3u' && ext !== '.m3u8') {
      return { success: false, error: 'Unsupported file extension' };
    }
    const stats = fs.statSync(candidatePath);
    if (stats.size > 20 * 1024 * 1024) {
      return { success: false, error: 'File too large (max 20MB)' };
    }

    const content = fs.readFileSync(candidatePath, 'utf8');
    return {
      success: true,
      data: content,
      filename: path.basename(candidatePath),
      fullPath: candidatePath
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('streams-test', async (event, streamUrl, headers = {}) => {
  if (!assertTrustedIpcSender(event, 'streams-test')) return false;
  try {
    if (!isAllowedHttpUrl(streamUrl)) return false;

    const head = await fetchUrl(streamUrl, { method: 'HEAD', headers, timeout: 10000 });
    if (head.statusCode >= 200 && head.statusCode < 400) return true;

    const get = await fetchUrl(streamUrl, { method: 'GET', headers, timeout: 10000 });
    return get.statusCode >= 200 && get.statusCode < 400;
  } catch {
    return false;
  }
});

// Library IPC
ipcMain.handle('library:get', () => {
  return getLibraryState();
});

ipcMain.handle('library:set', (event, nextState) => {
  if (!assertTrustedIpcSender(event, 'library:set')) {
    return { success: false, error: 'Untrusted IPC sender' };
  }
  try {
    const ok = setLibraryState(nextState);
    return { success: ok };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('library:import-json', (event, importedState) => {
  if (!assertTrustedIpcSender(event, 'library:import-json')) {
    return { success: false, error: 'Untrusted IPC sender' };
  }
  try {
    if (!importedState || typeof importedState !== 'object') throw new Error('Invalid import data');
    const current = getLibraryState();
    const next = {
      version: typeof importedState.version === 'number' ? importedState.version : 1,
      playlists: Array.isArray(importedState.playlists) ? importedState.playlists : current.playlists,
      favorites: {
        folders: Array.isArray(importedState?.favorites?.folders) ? importedState.favorites.folders : current.favorites.folders,
        items: Array.isArray(importedState?.favorites?.items) ? importedState.favorites.items : current.favorites.items,
      },
      recents: Array.isArray(importedState.recents) ? importedState.recents : current.recents,
    };
    setLibraryState(next);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('library:export-json', () => {
  try {
    const state = getLibraryState();
    return { success: true, state };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('library:merge-recents', (event, selector) => {
  if (!assertTrustedIpcSender(event, 'library:merge-recents')) {
    return { success: false, error: 'Untrusted IPC sender' };
  }
  try {
    const state = getLibraryState();
    if (!selector || typeof selector !== 'object') return { success: false, error: 'Invalid selector' };
    const normalized = { ...selector };
    const isSame = (a, b) => {
      if (a?.tvgId && b?.tvgId) return a.tvgId === b.tvgId;
      if (a?.url && b?.url) return a.url === b.url;
      if (a?.name && b?.name) return String(a.name).toLowerCase() === String(b.name).toLowerCase();
      return false;
    };
    const filtered = Array.isArray(state.recents) ? state.recents.filter((r) => !isSame(r.selector, normalized)) : [];
    filtered.unshift({ id: `rec_${Date.now()}`, selector: normalized, playedAt: Date.now() });
    state.recents = filtered.slice(0, 20);
    setLibraryState(state);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('library:export-m3u', () => {
  try {
    const state = getLibraryState();
    const enabled = (state.playlists || []).filter((p) => p.enabled !== false && typeof p.content === 'string');
    if (enabled.length === 0) {
      return { success: true, m3u: '#EXTM3U\n' };
    }
    let output = '#EXTM3U\n';
    for (const pl of enabled) {
      const lines = String(pl.content).split(/\r?\n/);
      for (const line of lines) {
        if (!line) continue;
        if (line.startsWith('#EXTM3U')) continue;
        output += `${line}\n`;
      }
    }
    return { success: true, m3u: output };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
// Start proxy server for IPTV streams
function startProxyServer() {
  if (proxyServer) {
    return proxyServer.address().port;
  }

  const token = getProxyToken();

  proxyServer = http.createServer((req, res) => {
    const requestUrl = new URL(req.url || '/', 'http://localhost');
    const urlPath = requestUrl.pathname;
    const requestToken = requestUrl.searchParams.get('token');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.writeHead(200);
      res.end();
      return;
    }

    if (requestToken !== token) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      res.end('Method not allowed');
      return;
    }

    // Parse proxy URL: /proxy/originalUrl or /hls/originalUrl
    if (urlPath.startsWith('/hls/')) {
      // Generate HLS manifest for IPTV stream
      const originalUrl = decodeURIComponent(urlPath.replace('/hls/', ''));
      if (!isExternalHttpUrl(originalUrl)) {
        res.writeHead(400);
        res.end('Invalid URL');
        return;
      }
      appLog(`🎬 Generating HLS manifest for: ${originalUrl}`);
      
      const manifest = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:EVENT
#EXTINF:10.0,
/proxy/${encodeURIComponent(originalUrl)}?token=${encodeURIComponent(token)}
#EXT-X-ENDLIST`;

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.writeHead(200);
      res.end(manifest);
      return;
    }
    
    if (!urlPath.startsWith('/proxy/')) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const originalUrl = decodeURIComponent(urlPath.replace('/proxy/', ''));
    appLog(`🔄 Proxying request to: ${originalUrl}`);

    try {
      const targetUrl = new URL(originalUrl);
      if (!isExternalHttpUrl(originalUrl)) {
        res.writeHead(400);
        res.end('Invalid URL');
        return;
      }
      if (isDisallowedProxyTarget(targetUrl.hostname)) {
        res.writeHead(403);
        res.end('Blocked target');
        return;
      }
      const isHttps = targetUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const upstreamHeaders = {
        'User-Agent': 'VLC/3.0.8 LibVLC/3.0.8',
        'Referer': `${targetUrl.protocol}//${targetUrl.hostname}/`,
        'Accept': '*/*',
        'Connection': 'keep-alive',
      };
      if (req.headers.range) {
        upstreamHeaders.Range = req.headers.range;
      }

      const proxyReq = client.request({
        hostname: targetUrl.hostname,
        port: targetUrl.port,
        path: targetUrl.pathname + targetUrl.search,
        method: req.method,
        headers: upstreamHeaders
      }, (proxyRes) => {
        // Set CORS headers for browser access
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        const safeHeaders = { ...proxyRes.headers };
        delete safeHeaders['set-cookie'];
        delete safeHeaders['set-cookie2'];

        res.writeHead(proxyRes.statusCode, safeHeaders);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (error) => {
        console.error('❌ Proxy error:', error);
        res.writeHead(500);
        res.end('Proxy error');
      });

      proxyReq.end();
      
    } catch (error) {
      console.error('❌ Invalid URL:', error);
      res.writeHead(400);
      res.end('Invalid URL');
    }
  });

  proxyServer.listen(13337, 'localhost', () => {
    appLog('🌐 IPTV Proxy server started on port 13337');
  });

  return 13337;
}

// Stop proxy server
function stopProxyServer() {
  if (proxyServer) {
    proxyServer.close();
    proxyServer = null;
    appLog('🔌 IPTV Proxy server stopped');
  }
}

// IPC handler for proxy URLs
ipcMain.handle('get-proxy-url', async (event, originalUrl) => {
  if (!assertTrustedIpcSender(event, 'get-proxy-url')) {
    return { success: false, error: 'Untrusted IPC sender' };
  }
  try {
    if (!isExternalHttpUrl(originalUrl)) {
      throw new Error('Only HTTP/HTTPS URLs are allowed');
    }
    const port = startProxyServer();
    const token = getProxyToken();
    const hlsUrl = `http://localhost:${port}/hls/${encodeURIComponent(originalUrl)}?token=${encodeURIComponent(token)}`;
    
    return {
      success: true,
      proxyUrl: hlsUrl, // Now returns HLS manifest URL
      originalUrl: originalUrl
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  if (!assertTrustedIpcSender(event, 'show-save-dialog')) {
    return { canceled: true, filePath: undefined };
  }
  const result = await dialog.showSaveDialog(mainWindow, options);
  if (!result.canceled && result.filePath) {
    approvedWritePaths.add(path.resolve(result.filePath));
  }
  return result;
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  if (!assertTrustedIpcSender(event, 'write-file')) {
    return { success: false, error: 'Untrusted IPC sender' };
  }
  try {
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) {
      return { success: false, error: 'write-file only accepts absolute paths' };
    }
    const resolvedPath = path.resolve(filePath);
    if (!approvedWritePaths.has(resolvedPath)) {
      return { success: false, error: 'Path not approved by save dialog' };
    }
    approvedWritePaths.delete(resolvedPath);
    fs.writeFileSync(resolvedPath, String(content), 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  if (!assertTrustedIpcSender(event, 'read-file')) {
    return { success: false, error: 'Untrusted IPC sender' };
  }
  try {
    if (typeof filePath !== 'string' || !filePath.trim()) {
      return { success: false, error: 'Invalid file path' };
    }
    const targetPath = path.resolve(__dirname, filePath);
    const allowedBase = path.resolve(__dirname, 'examples');
    const { isInside } = resolveWithin(allowedBase, targetPath);
    if (!isInside) {
      return { success: false, error: 'read-file only allows examples directory' };
    }
    const content = fs.readFileSync(targetPath, 'utf8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('save-file', async (event, relativePath, content) => {
  if (!assertTrustedIpcSender(event, 'save-file')) {
    return { success: false, error: 'Untrusted IPC sender' };
  }
  try {
    if (typeof relativePath !== 'string' || !relativePath.trim()) {
      throw new Error('Invalid relative path');
    }
    if (path.isAbsolute(relativePath)) {
      throw new Error('Absolute paths are not allowed for save-file');
    }
    const allowedBase = path.resolve(__dirname, 'examples');
    const fullPath = path.resolve(__dirname, relativePath);
    const { isInside } = resolveWithin(allowedBase, fullPath);
    if (!isInside) {
      throw new Error('save-file only allows examples directory');
    }
    const dir = path.dirname(fullPath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content, 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Error saving file:', error);
    return { success: false, error: error.message };
  }
});

const isDevMode = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

// Suppress various Electron warnings and improve compatibility
if (isDevMode) {
  app.commandLine.appendSwitch('ignore-certificate-errors');
  app.commandLine.appendSwitch('ignore-ssl-errors');
  app.commandLine.appendSwitch('ignore-certificate-errors-spki-list');
  app.commandLine.appendSwitch('ignore-urlfetcher-cert-requests');
  app.commandLine.appendSwitch('disable-web-security');
  app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor,OutOfBlinkCors,CertVerifierBuiltin');
  app.commandLine.appendSwitch('disable-site-isolation-trials');
  app.commandLine.appendSwitch('allow-running-insecure-content');
  app.commandLine.appendSwitch('disable-extensions-except');
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}
app.commandLine.appendSwitch('log-level', '3'); // Only show fatal errors

// Performance optimizations
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('max-old-space-size', '4096');

// Suppress macOS specific warnings
if (process.platform === 'darwin') {
  if (isDevMode) {
    app.commandLine.appendSwitch('disable-gpu-sandbox');
    app.commandLine.appendSwitch('disable-software-rasterizer');
  }
  // Reduce font-related warnings
  process.env.ELECTRON_DISABLE_RENDERER_BACKGROUNDING = 'true';
  // Suppress CoreText warnings
  process.env.CT_DISABLE_FONT_WARNINGS = 'true';
}

// Application event handlers

app.whenReady().then(() => {
  // Set dock icon on macOS
  if (process.platform === 'darwin') {
    const iconPath = path.join(__dirname, 'assets', 'icon.png');
    app.dock.setIcon(iconPath);
  }
  createWindow();

  // Manejo de argumentos de línea de comandos para archivos .m3u/.m3u8
  const argFile = process.argv.find(arg => arg.endsWith('.m3u') || arg.endsWith('.m3u8'));
  if (argFile && mainWindow) {
    mainWindow.webContents.once('did-finish-load', () => {
      try {
        const content = fs.readFileSync(argFile, 'utf8');
        mainWindow.webContents.send('file-loaded', {
          content,
          filename: path.basename(argFile),
          fullPath: argFile
        });
      } catch (error) {
        console.error('Error reading file from arguments:', error);
      }
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle custom protocol for M3U files
app.setAsDefaultProtocolClient('m3u');

app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow) {
    // Window is already open, load the file
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      mainWindow.webContents.send('file-loaded', {
        content,
        filename: path.basename(filePath),
        fullPath: filePath
      });
    } catch (error) {
      console.error('Error reading file:', error);
    }
  } else {
    // Save the file to load when window is ready
    app.commandLine.appendArgument(filePath);
  }
});

// ...eliminado: ahora se maneja en app.whenReady...

// Cleanup on app quit
app.on('before-quit', () => {
  appLog('🔌 Application shutting down...');
  stopProxyServer();
});
