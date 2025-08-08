/*
 * HLS Integration Layer for M3U Player
 * - Configurable ABR (maxBufferLength, liveSyncDuration)
 * - Retry/backoff strategy for network/media errors
 * - Audio/subtitle selection helpers
 * - LL-HLS auto-enable when manifest supports it
 */

import Hls, { Events as HLSEvents, ErrorTypes as HLSErrorTypes, ErrorDetails as HLSErrorDetails, HlsConfig, LevelSwitchedData } from 'hls.js';

export type HlsAbrConfig = {
  maxBufferLength?: number; // seconds
  liveSyncDuration?: number; // seconds
  maxMaxBufferLength?: number; // seconds
};

export type RetryConfig = {
  maxRetries: number;
  retryDelayMs: number;
  backoffMultiplier: number;
};

export type HlsInitOptions = {
  video: HTMLVideoElement;
  src: string;
  abr?: HlsAbrConfig;
  retry?: RetryConfig;
  debug?: boolean;
};

export type PlayerStats = {
  bandwidthKbps: number;
  bitrateKbps: number;
  droppedFrames: number;
  currentLevel: number;
};

export type UserFacingError = {
  code: string;
  title: string;
  message: string;
  canRetry: boolean;
};

export const ErrorCatalog: Record<string, UserFacingError> = {
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    title: 'Network error',
    message: 'There was a problem fetching the stream. Check your connection and try again.',
    canRetry: true,
  },
  MEDIA_ERROR: {
    code: 'MEDIA_ERROR',
    title: 'Playback error',
    message: 'The media could not be decoded. We will try to recover automatically.',
    canRetry: true,
  },
  MANIFEST_ERROR: {
    code: 'MANIFEST_ERROR',
    title: 'Manifest error',
    message: 'We could not parse the HLS manifest. The stream might be unavailable.',
    canRetry: true,
  },
  UNSUPPORTED: {
    code: 'UNSUPPORTED',
    title: 'HLS not supported',
    message: 'This environment does not support HLS playback.',
    canRetry: false,
  },
  TIMEOUT: {
    code: 'TIMEOUT',
    title: 'Load timeout',
    message: 'The stream took too long to load. You can try again.',
    canRetry: true,
  },
  UNKNOWN: {
    code: 'UNKNOWN',
    title: 'Unknown error',
    message: 'An unknown error occurred while playing this stream.',
    canRetry: true,
  },
};

export class HlsPlayer {
  private hls: Hls | null = null;
  private readonly video: HTMLVideoElement;
  private readonly src: string;
  private readonly retry: RetryConfig;
  private disposed = false;
  private retryCount = 0;

  constructor(opts: HlsInitOptions) {
    this.video = opts.video;
    this.src = opts.src;
    this.retry = {
      maxRetries: opts.retry?.maxRetries ?? 3,
      retryDelayMs: opts.retry?.retryDelayMs ?? 1000,
      backoffMultiplier: opts.retry?.backoffMultiplier ?? 2,
    };

    const lowLatencyCandidate = this.detectLlHlsFromUrl(this.src);

    const config: Partial<HlsConfig> = {
      enableWorker: true,
      lowLatencyMode: lowLatencyCandidate,
      backBufferLength: 90,
      maxBufferLength: opts.abr?.maxBufferLength ?? 30,
      maxMaxBufferLength: opts.abr?.maxMaxBufferLength ?? 600,
      liveSyncDuration: opts.abr?.liveSyncDuration,
      capLevelToPlayerSize: true,
      testBandwidth: true,
      progressive: true,
      fragLoadingRetryDelay: this.retry.retryDelayMs,
      fragLoadingMaxRetry: this.retry.maxRetries,
      manifestLoadingRetryDelay: this.retry.retryDelayMs,
      manifestLoadingMaxRetry: this.retry.maxRetries,
      levelLoadingRetryDelay: this.retry.retryDelayMs,
      levelLoadingMaxRetry: this.retry.maxRetries,
      xhrSetup: (xhr) => {
        xhr.withCredentials = false;
      },
      debug: opts.debug ?? false,
    };

    if (!Hls.isSupported()) {
      throw this.asError('UNSUPPORTED');
    }

    this.hls = new Hls(config);
    this.attachEvents();
    this.hls.loadSource(this.src);
    this.hls.attachMedia(this.video);
  }

  private detectLlHlsFromUrl(url: string): boolean {
    // Heuristics: LL-HLS often provides part/ delta updates and holds EXT-X-PART in manifest.
    // We cannot fetch here synchronously, so rely on URL hints.
    return url.includes('_ll.m3u8') || url.includes('ll-hls');
  }

  private attachEvents() {
    if (!this.hls) return;

    this.hls.on(HLSEvents.MANIFEST_PARSED, () => {
      // Autoplay left to caller
    });

    this.hls.on(HLSEvents.ERROR, (_evt, data) => {
      if (!this.hls) return;

      if (data.fatal) {
        switch (data.type) {
          case HLSErrorTypes.NETWORK_ERROR:
            this.handleFatal('NETWORK_ERROR', data);
            break;
          case HLSErrorTypes.MEDIA_ERROR:
            // Attempt recovery first
            this.hls.recoverMediaError();
            // If recovery fails, will emit error again; allow retry path
            this.handleFatal('MEDIA_ERROR', data);
            break;
          default:
            this.handleFatal(this.mapDetailToCode(data.details), data);
            break;
        }
      } else {
        // Non-fatal: surface telemetry hooks if needed
      }
    });
  }

  private mapDetailToCode(detail?: HLSErrorDetails): keyof typeof ErrorCatalog {
    switch (detail) {
      case HLSErrorDetails.MANIFEST_LOAD_ERROR:
      case HLSErrorDetails.MANIFEST_LOAD_TIMEOUT:
      case HLSErrorDetails.MANIFEST_PARSING_ERROR:
        return 'MANIFEST_ERROR';
      default:
        return 'UNKNOWN';
    }
  }

  private handleFatal(code: keyof typeof ErrorCatalog, _data?: any) {
    const err = this.asError(code);
    if (ErrorCatalog[code].canRetry) {
      this.tryRetry(err);
    } else {
      this.emitError(err);
    }
  }

  private tryRetry(reason: UserFacingError) {
    if (this.retryCount >= this.retry.maxRetries || this.disposed) {
      this.emitError(reason);
      return;
    }

    const delay = this.retry.retryDelayMs * Math.pow(this.retry.backoffMultiplier, this.retryCount);
    this.retryCount += 1;

    window.setTimeout(() => {
      if (this.disposed) return;
      try {
        this.destroyCore();
        this.hls = new Hls();
        this.attachEvents();
        this.hls?.loadSource(this.src);
        this.hls?.attachMedia(this.video);
      } catch (e) {
        this.emitError(this.asError('UNKNOWN'));
      }
    }, delay);
  }

  private emitError(err: UserFacingError) {
    const event = new CustomEvent('hls:error', { detail: err });
    this.video.dispatchEvent(event);
  }

  private asError(code: keyof typeof ErrorCatalog): UserFacingError {
    return { ...ErrorCatalog[code] };
  }

  getAudioTracks(): Array<{ id: number; name: string; lang?: string; active: boolean }> {
    if (!this.hls) return [];
    return (this.hls.audioTracks || []).map((t, idx) => ({
      id: idx,
      name: t.name || `Track ${idx + 1}`,
      lang: t.lang || undefined,
      active: idx === this.hls!.audioTrack,
    }));
  }

  setAudioTrack(id: number) {
    if (!this.hls) return;
    if (id >= 0 && id < (this.hls.audioTracks?.length ?? 0)) {
      this.hls.audioTrack = id;
    }
  }

  getSubtitleTracks(): Array<{ id: number; name: string; lang?: string; active: boolean }> {
    if (!this.hls) return [];
    const tracks = this.hls.subtitleTracks || [];
    // active subtitle index is this.hls.subtitleTrack, -1 disabled
    return tracks.map((t, idx) => ({
      id: idx,
      name: t.name || `Sub ${idx + 1}`,
      lang: t.lang || undefined,
      active: idx === this.hls!.subtitleTrack,
    }));
  }

  setSubtitleTrack(id: number | -1) {
    if (!this.hls) return;
    this.hls.subtitleTrack = id;
  }

  getStats(): PlayerStats {
    const nav = (this.video as any).getVideoPlaybackQuality?.();
    const dropped = nav?.droppedVideoFrames ?? 0;

    let bitrate = 0;
    let currentLevel = -1;
    if (this.hls) {
      const level = this.hls.levels?.[this.hls.currentLevel];
      currentLevel = this.hls.currentLevel;
      if (level?.bitrate) bitrate = Math.round(level.bitrate / 1000);
    }

    return {
      bandwidthKbps: (this.hls as any)?._bandwidthEstimate ? Math.round(((this.hls as any)._bandwidthEstimate) / 1000) : 0,
      bitrateKbps: bitrate,
      droppedFrames: dropped,
      currentLevel,
    };
  }

  onLevelSwitched(handler: (data: LevelSwitchedData) => void) {
    this.hls?.on(HLSEvents.LEVEL_SWITCHED, (_e, data) => handler(data));
  }

  destroy() {
    this.disposed = true;
    this.destroyCore();
  }

  private destroyCore() {
    try { this.hls?.destroy(); } catch { /* noop */ }
    this.hls = null;
  }
}
