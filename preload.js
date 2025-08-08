
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

contextBridge.exposeInMainWorld('api', {
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
  /** @type {PlaylistsAPI} */
  playlists: {
    /** @param {File} file */
    importFromFile: (file) => {
      if (!file || typeof file !== 'object') throw new TypeError('playlists.importFromFile: file must be File');
      return ipcRenderer.invoke('playlists-import-file', file);
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
});
