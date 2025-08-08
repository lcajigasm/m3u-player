Privacy & Telemetry
===================

This app respects your privacy. Diagnostics are local-only and telemetry is disabled by default.

- Diagnostics panel: shows recent requests (URL, method, HTTP status, latency), HLS.js version, effective User-Agent, and applied headers. Sensitive headers (Authorization, Cookie, etc.) are masked.
- Telemetry (opt-in): when enabled, the app may periodically send minimal, anonymous metrics: app version, OS user agent string, playlist size (count), and basic performance stats. No personal data, content titles, or stream URLs are sent.
- Endpoint: configurable under Diagnostics. You can set it to a local or placeholder endpoint. Disable telemetry any time by toggling it off.

To disable telemetry entirely, leave the endpoint blank and toggle off telemetry. Diagnostics remain local and are never sent unless telemetry is enabled.

