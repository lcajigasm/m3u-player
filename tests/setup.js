/**
 * Jest Setup File
 * Configure testing environment and global mocks
 * 
 * @version 2.0.0
 * @author M3U Player Team
 */

// Import required polyfills for jsdom
import 'whatwg-fetch';
import { TextEncoder, TextDecoder } from 'util';

// Global polyfills
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock performance API
if (!global.performance) {
  global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn()
  };
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock MediaSource for HLS testing
global.MediaSource = class MediaSource extends EventTarget {
  constructor() {
    super();
    this.sourceBuffers = [];
    this.readyState = 'closed';
  }
  
  addSourceBuffer() {
    const sourceBuffer = new MockSourceBuffer();
    this.sourceBuffers.push(sourceBuffer);
    return sourceBuffer;
  }
  
  removeSourceBuffer() {}
  endOfStream() {}
};

class MockSourceBuffer extends EventTarget {
  constructor() {
    super();
    this.buffered = { length: 0 };
    this.updating = false;
  }
  
  appendBuffer() {
    this.updating = true;
    setTimeout(() => {
      this.updating = false;
      this.dispatchEvent(new Event('updateend'));
    }, 0);
  }
  
  remove() {}
  abort() {}
}

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Blob
global.Blob = class Blob {
  constructor(content, options) {
    this.content = content;
    this.options = options;
    this.size = content ? content.reduce((size, chunk) => size + chunk.length, 0) : 0;
  }
  
  text() {
    return Promise.resolve(this.content ? this.content.join('') : '');
  }
  
  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(this.size));
  }
};

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Map(),
    text: () => Promise.resolve(''),
    json: () => Promise.resolve({}),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob([])),
    body: null
  })
);

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0
};
global.localStorage = localStorageMock;

// Mock sessionStorage
global.sessionStorage = { ...localStorageMock };

// Mock navigator
Object.defineProperty(global.navigator, 'onLine', {
  writable: true,
  value: true
});

Object.defineProperty(global.navigator, 'userAgent', {
  value: 'M3U Player Test/2.0.0'
});

// Mock console methods for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock Electron APIs
global.electronAPI = {
  loadConfig: jest.fn(() => Promise.resolve({})),
  saveConfig: jest.fn(() => Promise.resolve()),
  fetchUrl: jest.fn(() => Promise.resolve({
    success: true,
    data: '',
    statusCode: 200,
    headers: {}
  })),
  openFileDialog: jest.fn(() => Promise.resolve()),
  showSaveDialog: jest.fn(() => Promise.resolve({ canceled: false, filePath: '/test/path' })),
  writeFile: jest.fn(() => Promise.resolve()),
  readFile: jest.fn(() => Promise.resolve({ success: true, content: '' })),
  getAppVersion: jest.fn(() => Promise.resolve('2.0.0')),
  onFileLoaded: jest.fn(),
  onShowUrlDialog: jest.fn(),
  onShowSettings: jest.fn(),
  onShowAbout: jest.fn(),
  onTogglePlayback: jest.fn(),
  onStopPlayback: jest.fn(),
  onVolumeUp: jest.fn(),
  onVolumeDown: jest.fn(),
  onToggleMute: jest.fn(),
  removeAllListeners: jest.fn()
};

global.appInfo = {
  platform: 'test',
  isElectron: true,
  versions: {
    electron: '27.0.0',
    chrome: '118.0.0.0',
    node: '18.17.1'
  }
};

// Mock HLS.js
global.Hls = class Hls extends EventTarget {
  static isSupported() {
    return true;
  }
  
  static Events = {
    MANIFEST_PARSED: 'hlsManifestParsed',
    ERROR: 'hlsError',
    LEVEL_SWITCHED: 'hlsLevelSwitched'
  };
  
  static ErrorTypes = {
    NETWORK_ERROR: 'networkError',
    MEDIA_ERROR: 'mediaError'
  };
  
  constructor(config) {
    super();
    this.config = config;
    this.levels = [];
    this.currentLevel = -1;
    this.autoLevelEnabled = true;
  }
  
  loadSource(url) {
    this.url = url;
    setTimeout(() => {
      this.dispatchEvent(new CustomEvent(Hls.Events.MANIFEST_PARSED));
    }, 0);
  }
  
  attachMedia(video) {
    this.video = video;
  }
  
  destroy() {
    this.url = null;
    this.video = null;
  }
  
  recoverMediaError() {}
  
  on(event, handler) {
    this.addEventListener(event, handler);
  }
  
  off(event, handler) {
    this.removeEventListener(event, handler);
  }
};

// Mock HTMLVideoElement
const createMockVideo = () => ({
  play: jest.fn(() => Promise.resolve()),
  pause: jest.fn(),
  load: jest.fn(),
  canPlayType: jest.fn(() => 'probably'),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  
  // Properties
  src: '',
  currentTime: 0,
  duration: 0,
  volume: 1,
  muted: false,
  paused: true,
  ended: false,
  readyState: 4,
  buffered: { length: 0 },
  
  // Video specific
  videoWidth: 1920,
  videoHeight: 1080,
  
  // Request APIs
  requestFullscreen: jest.fn(() => Promise.resolve()),
  requestPictureInPicture: jest.fn(() => Promise.resolve()),
  
  style: {}
});

// Mock document methods
const originalCreateElement = document.createElement;
document.createElement = jest.fn((tagName) => {
  if (tagName === 'video') {
    return createMockVideo();
  }
  return originalCreateElement.call(document, tagName);
});

// Mock document.pictureInPictureEnabled
Object.defineProperty(document, 'pictureInPictureEnabled', {
  value: true,
  writable: true
});

// Mock document.fullscreenElement
Object.defineProperty(document, 'fullscreenElement', {
  value: null,
  writable: true
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Mock Worker
global.Worker = class Worker extends EventTarget {
  constructor(url) {
    super();
    this.url = url;
  }
  
  postMessage(data) {
    // Mock worker response
    setTimeout(() => {
      this.dispatchEvent(new MessageEvent('message', { data: { result: 'mock' } }));
    }, 0);
  }
  
  terminate() {}
};

// Mock CSS methods
if (!global.CSS) {
  global.CSS = {
    supports: jest.fn(() => true),
    escape: jest.fn(str => str)
  };
}

// Custom matchers
expect.extend({
  toBeInRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toBeValidUrl(received) {
    try {
      new URL(received);
      return {
        message: () => `expected ${received} not to be a valid URL`,
        pass: true,
      };
    } catch {
      return {
        message: () => `expected ${received} to be a valid URL`,
        pass: false,
      };
    }
  }
});

// Global test utilities
global.testUtils = {
  // Create mock M3U content
  createMockM3U: (itemCount = 3) => {
    let content = '#EXTM3U\n';
    for (let i = 1; i <= itemCount; i++) {
      content += `#EXTINF:-1 tvg-id="channel${i}" tvg-name="Channel ${i}" tvg-logo="https://example.com/logo${i}.png" group-title="Test Group",Channel ${i}\n`;
      content += `https://example.com/stream${i}.m3u8\n`;
    }
    return content;
  },
  
  // Create mock playlist item
  createMockPlaylistItem: (index = 0) => ({
    id: `item_${index}`,
    title: `Test Channel ${index + 1}`,
    url: `https://example.com/stream${index + 1}.m3u8`,
    type: 'HLS',
    group: 'Test Group',
    logo: `https://example.com/logo${index + 1}.png`,
    tvgId: `channel${index + 1}`,
    tvgName: `Channel ${index + 1}`,
    duration: -1,
    index
  }),
  
  // Wait for async operations
  waitFor: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Wait for next tick
  nextTick: () => new Promise(resolve => process.nextTick(resolve)),
  
  // Create mock event
  createMockEvent: (type, data = {}) => ({
    type,
    data,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    target: null,
    currentTarget: null,
    timestamp: Date.now()
  })
};

// Setup cleanup
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset fetch mock
  global.fetch.mockReset();
  global.fetch.mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Map(),
    text: () => Promise.resolve(''),
    json: () => Promise.resolve({}),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob([])),
    body: null
  });
  
  // Clear localStorage
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  
  // Reset document properties
  document.fullscreenElement = null;
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('🧪 Jest test environment setup completed');