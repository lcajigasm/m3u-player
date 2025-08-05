/**
 * PlayerController Tests
 * Test suite for the advanced media player controller
 * 
 * @version 2.0.0
 * @author M3U Player Team
 */

import PlayerController from '../../src/js/modules/PlayerController.js';
import { createEventBus } from '../../src/js/core/EventBus.js';

describe('PlayerController', () => {
  let playerController;
  let eventBus;
  let mockVideoElement;

  beforeEach(() => {
    eventBus = createEventBus();
    playerController = new PlayerController();
    
    // Create mock video element
    mockVideoElement = {
      play: jest.fn(() => Promise.resolve()),
      pause: jest.fn(),
      load: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      src: '',
      currentTime: 0,
      duration: 100,
      volume: 0.8,
      muted: false,
      paused: true,
      readyState: 4,
      style: {}
    };
  });

  afterEach(() => {
    playerController.destroy();
    eventBus.destroy();
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      const state = playerController.getState();
      
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(0);
      expect(state.volume).toBe(0.8);
      expect(state.playing).toBe(false);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    test('should initialize with custom options', () => {
      const customController = new PlayerController({
        autoplay: true,
        volume: 0.5
      });

      expect(customController.config.autoplay).toBe(true);
      
      customController.destroy();
    });

    test('should emit initialization event', () => {
      const eventSpy = jest.spyOn(eventBus, 'emit');
      new PlayerController().destroy();

      expect(eventSpy).toHaveBeenCalledWith('player:initialized', 
        expect.objectContaining({
          controller: expect.any(PlayerController)
        })
      );
    });
  });

  describe('Video Element Management', () => {
    test('should set video element', () => {
      playerController.setVideoElement(mockVideoElement);

      expect(playerController.videoElement).toBe(mockVideoElement);
      expect(mockVideoElement.addEventListener).toHaveBeenCalled();
    });

    test('should remove previous video element listeners', () => {
      const firstElement = { ...mockVideoElement };
      const secondElement = { ...mockVideoElement };

      playerController.setVideoElement(firstElement);
      playerController.setVideoElement(secondElement);

      expect(firstElement.removeEventListener).toHaveBeenCalled();
    });

    test('should apply initial configuration to video element', () => {
      playerController.setVideoElement(mockVideoElement);

      expect(mockVideoElement.volume).toBe(0.8);
      expect(mockVideoElement.preload).toBe('metadata');
    });
  });

  describe('Stream Loading', () => {
    beforeEach(() => {
      playerController.setVideoElement(mockVideoElement);
    });

    test('should load HLS stream successfully', async () => {
      const streamInfo = {
        url: 'https://example.com/stream.m3u8',
        type: 'hls',
        metadata: { title: 'Test Stream' }
      };

      // Mock HLS.js
      global.Hls = jest.fn(() => ({
        loadSource: jest.fn(),
        attachMedia: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'hlsManifestParsed') {
            setTimeout(callback, 0);
          }
        }),
        destroy: jest.fn()
      }));
      global.Hls.isSupported = jest.fn(() => true);

      await playerController.loadStream(streamInfo);

      const state = playerController.getState();
      expect(state.currentStream).toBe(streamInfo);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    test('should load direct stream successfully', async () => {
      const streamInfo = {
        url: 'https://example.com/video.mp4',
        type: 'direct',
        metadata: { title: 'Test Video' }
      };

      // Mock successful loading
      mockVideoElement.addEventListener.mockImplementation((event, callback) => {
        if (event === 'canplay') {
          setTimeout(callback, 0);
        }
      });

      await playerController.loadStream(streamInfo);

      const state = playerController.getState();
      expect(state.currentStream).toBe(streamInfo);
      expect(mockVideoElement.src).toBe(streamInfo.url);
    });

    test('should handle stream loading errors', async () => {
      const streamInfo = {
        url: 'https://example.com/invalid.m3u8',
        type: 'hls'
      };

      mockVideoElement.addEventListener.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback({ target: { error: { code: 4 } } }), 0);
        }
      });

      await expect(playerController.loadStream(streamInfo)).rejects.toThrow();
    });

    test('should emit loading events', async () => {
      const eventSpy = jest.spyOn(eventBus, 'emit');
      const streamInfo = {
        url: 'https://example.com/test.mp4',
        type: 'direct'
      };

      mockVideoElement.addEventListener.mockImplementation((event, callback) => {
        if (event === 'canplay') setTimeout(callback, 0);
      });

      await playerController.loadStream(streamInfo);

      expect(eventSpy).toHaveBeenCalledWith('player:load-start', 
        expect.objectContaining({ stream: streamInfo })
      );
      expect(eventSpy).toHaveBeenCalledWith('player:load-success', 
        expect.any(Object)
      );
    });

    test('should throw error without video element', async () => {
      playerController.videoElement = null;
      
      await expect(playerController.loadStream({ url: 'test.mp4' }))
        .rejects.toThrow('Video element not set');
    });
  });

  describe('Playback Controls', () => {
    beforeEach(() => {
      playerController.setVideoElement(mockVideoElement);
    });

    test('should play video', async () => {
      await playerController.play();

      expect(mockVideoElement.play).toHaveBeenCalled();
      expect(playerController.getState().playing).toBe(true);
    });

    test('should pause video', () => {
      playerController.pause();

      expect(mockVideoElement.pause).toHaveBeenCalled();
      expect(playerController.getState().playing).toBe(false);
    });

    test('should stop video', () => {
      playerController.stop();

      expect(mockVideoElement.pause).toHaveBeenCalled();
      expect(mockVideoElement.currentTime).toBe(0);
      expect(playerController.getState().playing).toBe(false);
      expect(playerController.getState().currentStream).toBeNull();
    });

    test('should handle play errors', async () => {
      mockVideoElement.play.mockRejectedValue(new Error('Play failed'));

      await expect(playerController.play()).rejects.toThrow('Play failed');
    });
  });

  describe('Volume Control', () => {
    beforeEach(() => {
      playerController.setVideoElement(mockVideoElement);
    });

    test('should set volume', () => {
      playerController.setVolume(0.5);

      expect(mockVideoElement.volume).toBe(0.5);
      expect(playerController.getState().volume).toBe(0.5);
    });

    test('should clamp volume values', () => {
      playerController.setVolume(1.5);
      expect(mockVideoElement.volume).toBe(1);

      playerController.setVolume(-0.5);
      expect(mockVideoElement.volume).toBe(0);
    });

    test('should toggle mute', () => {
      playerController.toggleMute();

      expect(mockVideoElement.muted).toBe(true);
      expect(playerController.getState().muted).toBe(true);
    });

    test('should emit volume change events', () => {
      const eventSpy = jest.spyOn(eventBus, 'emit');
      
      playerController.setVolume(0.3);

      expect(eventSpy).toHaveBeenCalledWith('player:volume-change', 
        expect.objectContaining({ volume: 0.3 })
      );
    });
  });

  describe('Seeking', () => {
    beforeEach(() => {
      playerController.setVideoElement(mockVideoElement);
      mockVideoElement.duration = 120;
    });

    test('should seek to specific time', () => {
      playerController.seek(60);

      expect(mockVideoElement.currentTime).toBe(60);
      expect(playerController.getState().currentTime).toBe(60);
    });

    test('should clamp seek values', () => {
      playerController.seek(200);
      expect(mockVideoElement.currentTime).toBe(120);

      playerController.seek(-10);
      expect(mockVideoElement.currentTime).toBe(0);
    });

    test('should emit seek events', () => {
      const eventSpy = jest.spyOn(eventBus, 'emit');
      
      playerController.seek(30);

      expect(eventSpy).toHaveBeenCalledWith('player:seek', 
        expect.objectContaining({ time: 30 })
      );
    });
  });

  describe('Quality Management', () => {
    beforeEach(() => {
      playerController.setVideoElement(mockVideoElement);
      
      // Mock HLS instance
      playerController.hls = {
        levels: [
          { height: 360, bitrate: 1000000 },
          { height: 720, bitrate: 2000000 },
          { height: 1080, bitrate: 4000000 }
        ],
        currentLevel: -1,
        autoLevelEnabled: true
      };
    });

    test('should get quality info', () => {
      const qualityInfo = playerController.getQualityInfo();

      expect(qualityInfo).toMatchObject({
        levels: expect.any(Array),
        currentLevel: -1,
        autoLevelEnabled: true
      });
    });

    test('should set quality level', () => {
      playerController.setQuality(1);

      expect(playerController.hls.currentLevel).toBe(1);
    });

    test('should return null quality info without HLS', () => {
      playerController.hls = null;
      
      const qualityInfo = playerController.getQualityInfo();
      expect(qualityInfo).toBeNull();
    });
  });

  describe('Metrics and Performance', () => {
    test('should track performance metrics', async () => {
      playerController.setVideoElement(mockVideoElement);
      
      mockVideoElement.addEventListener.mockImplementation((event, callback) => {
        if (event === 'canplay') setTimeout(callback, 10);
      });

      await playerController.loadStream({
        url: 'https://example.com/test.mp4',
        type: 'direct'
      });

      const metrics = playerController.getMetrics();
      expect(metrics.loadTime).toBeGreaterThan(0);
      expect(metrics.startTime).toBeGreaterThan(0);
    });
  });

  describe('Event Bus Integration', () => {
    test('should respond to event bus commands', async () => {
      playerController.setVideoElement(mockVideoElement);

      await eventBus.emit('player:play-command');
      expect(mockVideoElement.play).toHaveBeenCalled();

      await eventBus.emit('player:pause-command');
      expect(mockVideoElement.pause).toHaveBeenCalled();

      await eventBus.emit('player:stop-command');
      expect(mockVideoElement.pause).toHaveBeenCalled();
      expect(mockVideoElement.currentTime).toBe(0);
    });

    test('should emit state change events', () => {
      const eventSpy = jest.spyOn(eventBus, 'emit');
      
      playerController.setState({ playing: true });

      expect(eventSpy).toHaveBeenCalledWith('player:state-change', 
        expect.objectContaining({
          state: expect.objectContaining({ playing: true })
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      playerController.setVideoElement(mockVideoElement);
    });

    test('should handle video errors gracefully', () => {
      const mockError = { code: 3, message: 'Decode error' };
      const eventSpy = jest.spyOn(eventBus, 'emit');

      playerController.handleVideoError({ target: { error: mockError } });

      expect(eventSpy).toHaveBeenCalledWith('player:error', 
        expect.objectContaining({
          error: expect.stringContaining('decoding')
        })
      );
    });

    test('should attempt retry on errors', async () => {
      const streamInfo = { url: 'test.m3u8', type: 'direct' };
      const eventSpy = jest.spyOn(eventBus, 'emit');

      playerController.handleError(new Error('Network error'), streamInfo);

      expect(eventSpy).toHaveBeenCalledWith('player:error', expect.any(Object));
      expect(eventSpy).toHaveBeenCalledWith('player:retry-attempt', expect.any(Object));
    });
  });

  describe('Cleanup and Destruction', () => {
    test('should clean up resources on destroy', () => {
      playerController.setVideoElement(mockVideoElement);
      playerController.hls = { destroy: jest.fn() };

      playerController.destroy();

      expect(playerController.hls.destroy).toHaveBeenCalled();
      expect(mockVideoElement.removeEventListener).toHaveBeenCalled();
      expect(playerController.videoElement).toBeNull();
    });

    test('should clear timeouts on cleanup', () => {
      jest.spyOn(global, 'clearTimeout');
      
      playerController.loadTimeout = setTimeout(() => {}, 1000);
      playerController.cleanup();

      expect(clearTimeout).toHaveBeenCalled();
    });
  });
});