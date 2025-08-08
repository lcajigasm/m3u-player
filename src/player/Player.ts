/*
 * Unified Player wrapper
 * Exposes a simple API for the UI to control playback.
 */

import { HlsPlayer, HlsAbrConfig, RetryConfig, ErrorCatalog, UserFacingError } from './hls';

export type Source = {
  url: string;
  type?: 'hls' | 'direct';
};

export type PlayerOptions = {
  autoplay?: boolean;
  abr?: HlsAbrConfig;
  retry?: RetryConfig;
  debug?: boolean;
};

export type PlayerState = {
  playing: boolean;
  error: UserFacingError | null;
};

export class Player {
  private readonly video: HTMLVideoElement;
  private instance: HlsPlayer | null = null;
  private opts: PlayerOptions;
  private state: PlayerState = { playing: false, error: null };
  private statsTimer: number | null = null;

  constructor(video: HTMLVideoElement, opts?: PlayerOptions) {
    this.video = video;
    this.opts = opts ?? {};

    this.video.addEventListener('play', () => (this.state.playing = true));
    this.video.addEventListener('pause', () => (this.state.playing = false));
    this.video.addEventListener('hls:error', (e: Event) => {
      const detail = (e as CustomEvent).detail as UserFacingError;
      this.state.error = detail;
      // Bubble to UI layer for Retry button integration
      this.video.dispatchEvent(new CustomEvent('player:error', { detail }));
    });
  }

  async load(source: Source) {
    await this.stop();

    if (source.type === 'direct' || (!source.type && !source.url.endsWith('.m3u8'))) {
      this.video.src = source.url;
      await this.video.load();
      if (this.opts.autoplay) await this.play();
      return;
    }

    this.instance = new HlsPlayer({
      video: this.video,
      src: source.url,
      abr: this.opts.abr,
      retry: this.opts.retry,
      debug: this.opts.debug,
    });

    if (this.opts.autoplay) await this.play();
  }

  async play() {
    await this.video.play();
    this.state.playing = true;
  }

  pause() {
    this.video.pause();
    this.state.playing = false;
  }

  async stop() {
    if (this.instance) {
      this.instance.destroy();
      this.instance = null;
    }
    this.stopStats();
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
    this.state.playing = false;
    this.state.error = null;
  }

  startStats(intervalMs: number = 1000) {
    this.stopStats();
    this.statsTimer = window.setInterval(() => {
      const stats = this.getStats();
      this.video.dispatchEvent(new CustomEvent('player:stats', { detail: stats }));
    }, intervalMs) as unknown as number;
  }

  stopStats() {
    if (this.statsTimer != null) {
      window.clearInterval(this.statsTimer);
      this.statsTimer = null;
    }
  }

  getAudioTracks() { return this.instance?.getAudioTracks() ?? []; }
  setAudioTrack(id: number) { this.instance?.setAudioTrack(id); }
  getSubtitleTracks() { return this.instance?.getSubtitleTracks() ?? []; }
  setSubtitleTrack(id: number | -1) { this.instance?.setSubtitleTrack(id); }

  getStats() { return this.instance?.getStats() ?? { bandwidthKbps: 0, bitrateKbps: 0, droppedFrames: 0, currentLevel: -1 }; }

  getErrorCatalog() { return ErrorCatalog; }
}
