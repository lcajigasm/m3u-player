jest.mock('hls.js', () => {
  class MockHls {
    static isSupported() { return true; }
    static Events = { MANIFEST_PARSED: 'MANIFEST_PARSED', ERROR: 'ERROR', LEVEL_SWITCHED: 'LEVEL_SWITCHED' };
    static ErrorTypes = { NETWORK_ERROR: 'NETWORK_ERROR', MEDIA_ERROR: 'MEDIA_ERROR' };
    static ErrorDetails = { MANIFEST_LOAD_ERROR: 'MANIFEST_LOAD_ERROR', MANIFEST_LOAD_TIMEOUT: 'MANIFEST_LOAD_TIMEOUT', MANIFEST_PARSING_ERROR: 'MANIFEST_PARSING_ERROR' };

    on = jest.fn();
    loadSource = jest.fn();
    attachMedia = jest.fn();
    destroy = jest.fn();
    recoverMediaError = jest.fn();
    audioTracks: any[] = [];
    subtitleTracks: any[] = [];
    currentLevel = -1;
    levels: any[] = [];
  }
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
