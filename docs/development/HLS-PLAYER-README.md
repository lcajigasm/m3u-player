### HLS Player Integration

- Entry points: `src/player/hls.ts`, `src/player/Player.ts`
- Configurable ABR: `maxBufferLength`, `maxMaxBufferLength`, `liveSyncDuration`
- Retry/backoff: `maxRetries`, `retryDelayMs`, `backoffMultiplier`
- Events on `<video>`:
  - `player:error` with `detail` from error catalog
  - `player:stats` emitted when `Player.startStats()` is called
- Track selection:
  - `getAudioTracks()` / `setAudioTrack(id)`
  - `getSubtitleTracks()` / `setSubtitleTrack(id | -1)`
- LL-HLS: auto-enabled heuristically when URL hints LL (e.g., contains `ll-hls`)
