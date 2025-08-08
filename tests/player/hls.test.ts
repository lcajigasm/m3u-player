jest.mock('hls.js', () => {
  class MockHls {
    static isSupported() { return true; }
    static Events = { MANIFEST_PARSED: 'MANIFEST_PARSED', ERROR: 'ERROR', LEVEL_SWITCHED: 'LEVEL_SWITCHED' };
    static ErrorTypes = { NETWORK_ERROR: 'NETWORK_ERROR', MEDIA_ERROR: 'MEDIA_ERROR' };
    static ErrorDetails = { MANIFEST_LOAD_ERROR: 'MANIFEST_LOAD_ERROR', MANIFEST_LOAD_TIMEOUT: 'MANIFEST_LOAD_TIMEOUT', MANIFEST_PARSING_ERROR: 'MANIFEST_PARSING_ERROR' };

    constructor() {
      this.audioTracks = [];
      this.subtitleTracks = [];
      this.currentLevel = -1;
      this.levels = [];
    }
  }
  // Define instance methods on the prototype so tests that inspect prototype pass
  (MockHls.prototype as any).on = jest.fn();
  (MockHls.prototype as any).loadSource = jest.fn();
  (MockHls.prototype as any).attachMedia = jest.fn();
  (MockHls.prototype as any).destroy = jest.fn();
  (MockHls.prototype as any).recoverMediaError = jest.fn();

  return { __esModule: true, default: MockHls, Events: MockHls.Events, ErrorTypes: MockHls.ErrorTypes, ErrorDetails: MockHls.ErrorDetails };
});

import Hls from 'hls.js';
import { HlsPlayer } from '../../src/player/hls';

describe('HlsPlayer', () => {
  let video: HTMLVideoElement;

  beforeEach(() => {
    document.body.innerHTML = '<video></video>';
    video = document.querySelector('video')!;
    (Hls as any).isSupported = jest.fn(() => true);
  });

  afterEach(() => {
    (Hls as any).isSupported = jest.fn(() => true);
  });

  it('throws when unsupported', () => {
    (Hls as any).isSupported = jest.fn(() => false);
    expect(() => new HlsPlayer({ video, src: 'https://example.com/stream.m3u8' })).toThrow(
      expect.objectContaining({ code: 'UNSUPPORTED' })
    );
  });

  it('initializes and attaches media', () => {
    new HlsPlayer({ video, src: 'https://example.com/stream.m3u8' });
    expect((Hls as any).prototype.loadSource).toBeDefined();
    expect((Hls as any).prototype.attachMedia).toBeDefined();
  });
});
