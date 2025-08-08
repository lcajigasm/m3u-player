### HLS Error Codes and UI Mapping

- **NETWORK_ERROR**: Network error — Show: "Network error. Check your connection and try again." with a "Retry" button.
- **MEDIA_ERROR**: Playback error — Show: "Playback error. Attempting recovery..." with a "Retry" button if it persists.
- **MANIFEST_ERROR**: Manifest error — Show: "Cannot load/parse manifest. Try again later." with "Retry".
- **UNSUPPORTED**: HLS not supported — Show: "HLS is not supported in this environment." without retry.
- **TIMEOUT**: Load timeout — Show: "The stream took too long to load." with "Retry".
- **UNKNOWN**: Unknown error — Show: "An unknown error occurred." with "Retry".

These codes are emitted as `CustomEvent('player:error', { detail })` on the video element via the `Player` wrapper in `src/player/Player.ts`.
