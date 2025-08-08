const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const Store = require('electron-store');

// Main window configuration
let mainWindow;

// Proxy server for IPTV streams
let proxyServer = null;

// Create configuration directory if it doesn't exist
const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'config.json');

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

function createWindow() {
  if (!app.isReady()) {
    // Previene creación prematura
    app.once('ready', createWindow);
    return;
  }
  const config = loadConfig();
  
  // Create the browser window
  const iconPath = path.join(__dirname, 'assets', process.platform === 'darwin' ? 'icon.icns' : process.platform === 'win32' ? 'icon.ico' : 'icon.png');
  console.log('Using icon path:', iconPath);
  
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
    console.log(`Window resized to: ${bounds.width}x${bounds.height}`);
  });

  // Handle window move
  mainWindow.on('move', () => {
    const bounds = mainWindow.getBounds();
    console.log(`Window moved to: ${bounds.x}, ${bounds.y}`);
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
    if (!isSafeAppUrl(url)) {
      event.preventDefault();
      console.warn('Bloqueo de navegación a origen externo:', url);
    }
  });

  // Bloquear apertura de nuevas ventanas a orígenes externos
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isSafeAppUrl(url)) {
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Filtrar URLs aceptadas (http/https) para listas/streams
  function isSafeAppUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

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

// Function to make HTTP/HTTPS requests with custom headers
function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
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
        console.log(`Following redirect from ${url} to ${res.headers.location}`);
        fetchUrl(res.headers.location, options).then(result => {
          // Pass the final URL up the chain
          resolve({
            ...result,
            finalUrl: result.finalUrl || res.headers.location
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
  saveConfig(config);
  return true;
});

ipcMain.handle('fetch-url', async (event, url, options = {}) => {
  try {
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

ipcMain.handle('open-file-dialog', async () => {
  await openFileDialog();
});

// Library IPC
ipcMain.handle('library:get', () => {
  return getLibraryState();
});

ipcMain.handle('library:set', (event, nextState) => {
  try {
    const ok = setLibraryState(nextState);
    return { success: ok };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('library:import-json', (event, importedState) => {
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

  proxyServer = http.createServer((req, res) => {
    const urlPath = req.url;
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.writeHead(200);
      res.end();
      return;
    }
    
    // Parse proxy URL: /proxy/originalUrl or /hls/originalUrl
    if (urlPath.startsWith('/hls/')) {
      // Generate HLS manifest for IPTV stream
      const originalUrl = decodeURIComponent(urlPath.replace('/hls/', ''));
      console.log(`🎬 Generating HLS manifest for: ${originalUrl}`);
      
      const manifest = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:EVENT
#EXTINF:10.0,
/proxy/${encodeURIComponent(originalUrl)}
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
    console.log(`🔄 Proxying request to: ${originalUrl}`);

    try {
      const targetUrl = new URL(originalUrl);
      const isHttps = targetUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const proxyReq = client.request({
        hostname: targetUrl.hostname,
        port: targetUrl.port,
        path: targetUrl.pathname + targetUrl.search,
        method: req.method,
        headers: {
          'User-Agent': 'VLC/3.0.8 LibVLC/3.0.8',
          'Referer': `${targetUrl.protocol}//${targetUrl.hostname}/`,
          'Accept': '*/*',
          'Connection': 'keep-alive',
          ...req.headers
        }
      }, (proxyRes) => {
        // Set CORS headers for browser access
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'video/mp2t');
        
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (error) => {
        console.error('❌ Proxy error:', error);
        res.writeHead(500);
        res.end('Proxy error');
      });

      req.pipe(proxyReq);
      
    } catch (error) {
      console.error('❌ Invalid URL:', error);
      res.writeHead(400);
      res.end('Invalid URL');
    }
  });

  proxyServer.listen(13337, 'localhost', () => {
    console.log('🌐 IPTV Proxy server started on port 13337');
  });

  return 13337;
}

// Stop proxy server
function stopProxyServer() {
  if (proxyServer) {
    proxyServer.close();
    proxyServer = null;
    console.log('🔌 IPTV Proxy server stopped');
  }
}

// IPC handler for proxy URLs
ipcMain.handle('get-proxy-url', async (event, originalUrl) => {
  try {
    const port = startProxyServer();
    const hlsUrl = `http://localhost:${port}/hls/${encodeURIComponent(originalUrl)}`;
    
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
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('save-file', async (event, relativePath, content) => {
  try {
    const fullPath = path.join(__dirname, relativePath);
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

// Suppress various Electron warnings and improve compatibility
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('ignore-ssl-errors');
app.commandLine.appendSwitch('ignore-certificate-errors-spki-list');
app.commandLine.appendSwitch('ignore-urlfetcher-cert-requests');
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor,OutOfBlinkCors,CertVerifierBuiltin');
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('allow-running-insecure-content');
app.commandLine.appendSwitch('disable-extensions-except');
app.commandLine.appendSwitch('log-level', '3'); // Only show fatal errors

// Performance optimizations
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('max-old-space-size', '4096');

// Suppress macOS specific warnings
if (process.platform === 'darwin') {
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  app.commandLine.appendSwitch('disable-software-rasterizer');
  // Reduce font-related warnings
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
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
  console.log('🔌 Application shutting down...');
  stopProxyServer();
});
