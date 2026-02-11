const { contextBridge, ipcRenderer } = require('electron');

/**
 * @typedef {Object} SettingsAPI
 * @property {(key: string) => Promise<any>} get
 * @property {(key: string, value: any) => Promise<void>} put
 */
/**
 * @typedef {Object} PlaylistsAPI
 * @property {(file: File) => Promise<any>} importFromFile
 * @property {(url: string) => Promise<any>} importFromUrl
 */
/**
 * @typedef {Object} StreamsAPI
 * @property {(url: string, headers?: object) => Promise<boolean>} test
 */

function subscribe(channel, listener) {
  if (typeof listener !== 'function') {
    throw new TypeError(`${channel}: listener must be a function`);
  }
  const wrapped = (_event, payload) => listener(payload);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
}

const api = {
  /** @type {SettingsAPI} */
  settings: {
    /** @param {string} key */
    get: (key) => {
      if (typeof key !== 'string') throw new TypeError('settings.get: key must be string');
      return ipcRenderer.invoke('settings-get', key);
    },
    /** @param {string} key @param {any} value */
    put: (key, value) => {
      if (typeof key !== 'string') throw new TypeError('settings.put: key must be string');
      return ipcRenderer.invoke('settings-put', key, value);
    }
  },
  library: {
    get: () => ipcRenderer.invoke('library:get'),
    set: (state) => ipcRenderer.invoke('library:set', state),
    importJSON: (state) => ipcRenderer.invoke('library:import-json', state),
    exportJSON: () => ipcRenderer.invoke('library:export-json'),
    exportM3U: () => ipcRenderer.invoke('library:export-m3u'),
    mergeRecents: (selector) => ipcRenderer.invoke('library:merge-recents', selector),
  },
  dialog: {
    showSave: (options) => ipcRenderer.invoke('show-save-dialog', options),
  },
  fs: {
    writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  },
  /** @type {PlaylistsAPI} */
  playlists: {
    /** @param {File} file */
    importFromFile: (file) => {
      if (!file || typeof file !== 'object') throw new TypeError('playlists.importFromFile: file must be File');
      if (typeof file.path === 'string' && file.path) {
        return ipcRenderer.invoke('playlists-import-file', file.path);
      }
      if (typeof file.text === 'function') {
        return file.text().then((data) => ({
          success: true,
          data,
          filename: file.name || 'playlist.m3u'
        }));
      }
      throw new Error('playlists.importFromFile: unsupported File object');
    },
    /** @param {string} url */
    importFromUrl: (url) => {
      if (typeof url !== 'string') throw new TypeError('playlists.importFromUrl: url must be string');
      if (!/^https?:\/\//.test(url)) throw new Error('playlists.importFromUrl: only http/https allowed');
      return ipcRenderer.invoke('playlists-import-url', url);
    }
  },
  /** @type {StreamsAPI} */
  streams: {
    /** @param {string} url @param {object} [headers] */
    test: (url, headers = {}) => {
      if (typeof url !== 'string') throw new TypeError('streams.test: url must be string');
      if (!/^https?:\/\//.test(url)) throw new Error('streams.test: only http/https allowed');
      if (headers && typeof headers !== 'object') throw new TypeError('streams.test: headers must be object');
      return ipcRenderer.invoke('streams-test', url, headers);
    }
  },
  /** @param {string} url @param {object} [options] */
  fetchUrl: (url, options = {}) => {
    if (typeof url !== 'string') throw new TypeError('fetchUrl: url must be string');
    if (!/^https?:\/\//.test(url)) throw new Error('fetchUrl: only http/https allowed');
    if (options && typeof options !== 'object') throw new TypeError('fetchUrl: options must be object');
    return ipcRenderer.invoke('fetch-url', url, options);
  }
};

const electronAPI = {
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  fetchUrl: (url, options = {}) => api.fetchUrl(url, options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  readFile: async (filePath) => {
    const result = await ipcRenderer.invoke('read-file', filePath);
    return {
      success: !!result?.success,
      data: result?.content,
      error: result?.error
    };
  },
  saveFile: (relativePath, content) => ipcRenderer.invoke('save-file', relativePath, content),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getProxyUrl: (originalUrl) => ipcRenderer.invoke('get-proxy-url', originalUrl),

  onFileLoaded: (listener) => subscribe('file-loaded', listener),
  onShowUrlDialog: (listener) => subscribe('show-url-dialog', listener),
  onShowSettings: (listener) => subscribe('show-settings', listener),
  onShowAbout: (listener) => subscribe('show-about', listener),
  onTogglePlayback: (listener) => subscribe('toggle-playback', listener),
  onStopPlayback: (listener) => subscribe('stop-playback', listener),
  onVolumeUp: (listener) => subscribe('volume-up', listener),
  onVolumeDown: (listener) => subscribe('volume-down', listener),
  onToggleMute: (listener) => subscribe('toggle-mute', listener),
};

const appInfo = {
  isElectron: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
  }
};

contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
contextBridge.exposeInMainWorld('appInfo', appInfo);
