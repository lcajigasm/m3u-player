const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Main window configuration
let mainWindow;

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
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // Required for loading IPTV streams
      cache: false, // Disable cache for development
      enableWebSQL: false,
      allowRunningInsecureContent: true
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
    
    // Open DevTools in development mode
    if (process.argv.includes('--dev')) {
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

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Create application menu
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
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
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
      headers: response.headers
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

// Command line arguments handling
process.argv.forEach((arg, index) => {
  if (arg.endsWith('.m3u') || arg.endsWith('.m3u8')) {
    app.on('ready', () => {
      setTimeout(() => {
        try {
          const content = fs.readFileSync(arg, 'utf8');
          mainWindow.webContents.send('file-loaded', {
            content,
            filename: path.basename(arg),
            fullPath: arg
          });
        } catch (error) {
          console.error('Error reading file from arguments:', error);
        }
      }, 1000);
    });
  }
});
