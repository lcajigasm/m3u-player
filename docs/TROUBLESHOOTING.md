# Technical Troubleshooting - M3U Player

## Problems identified and solutions implemented

### 1. **CORS (Cross-Origin Resource Sharing) Problem**

**Cause**: External IPTV streams block direct access from browsers due to security policies.

**Solutions implemented**:

- ✅ Electron bypasses CORS limitations
- ✅ HLS.js library loading for .m3u8 streams
- ✅ Multiple loading strategies with fallback
- ✅ Automatic stream type detection (HLS vs direct)
- ✅ Robust error handling with detailed information

### 2. **HLS streams (.m3u8) not natively compatible**

**Cause**: Browsers don't always support HLS streams natively.

**Solution**:

```javascript
// Auto-load HLS.js when necessary
async loadHLSLibraryIfNeeded() {
    if (!this.hlsSupported) {
        await this.loadScript('https://cdn.jsdelivr.net/npm/hls.js@latest');
    }
}
```

### 3. **Special headers required by some streams**

**Cause**: Many IPTV streams require specific headers like User-Agent or Referer.

**Solution implemented**:

```javascript
// Enhanced parser that extracts headers from #EXTVLCOPT
else if (line.startsWith('#EXTVLCOPT:')) {
    const headerMatch = line.match(/#EXTVLCOPT:([^=]+)=(.+)/);
    if (headerMatch) {
        currentHeaders[headerMatch[1].trim()] = headerMatch[2].trim();
    }
}
```

### 4. **Stream diagnosis and testing**

**Implemented**:

- 🔧 "Test Stream" button to diagnose connectivity
- ⏱️ Configurable timeouts to avoid blocking
- 📊 Detailed error information
- 🔄 Auto-advance when a stream fails

## Enhanced functionalities

### Advanced M3U parser

- Metadata extraction: `tvg-logo`, `group-title`, `tvg-id`
- Support for special headers with `#EXTVLCOPT`
- Differentiation between live streams and videos

### Enhanced interface

- Visual indicators: 🔴 LIVE vs 📹 VIDEO
- Category grouping
- Clear loading and error states
- Auto-scroll to active element

### Multiple loading strategies

1. **Native HTML5 loading** - For MP4 videos and compatible streams
2. **HLS.js loading** - For .m3u8 and HLS streams
3. **Error handling** - With auto-advance and detailed information

## Known limitations

### 🚫 Problems that CANNOT be solved in the browser:

1. **Strict CORS**: Some servers completely block cross-origin access
2. **Required authentication**: Streams requiring login or tokens
3. **Geo-blocking**: Content blocked by region
4. **Special protocols**: Some streams use non-web protocols (RTSP, etc.)

### ⚠️ Alternative solutions:

1. **Use a proxy/intermediate server** to avoid CORS
2. **Native applications** like VLC that handle these protocols better
3. **Browser extensions** that can modify headers
4. **Local servers** that act as proxy

## Usage recommendations

### For better compatibility:

1. **Use browser-compatible streams**: MP4, WebM, public HLS streams
2. **Test with the "🔧 Test Stream" button** before attempting to play
3. **Check browser console** for detailed error information
4. **Use the included test-streams.m3u file** to verify the application works

### Recommended streams for testing:

- ✅ Direct MP4 videos (like Google Cloud Storage ones)
- ✅ Public HLS streams without restrictions
- ✅ Test channels like Apple Developer ones

## Example code for testing

```javascript
// Test a specific stream
const player = new M3UPlayer();
await player.testStreamConnectivity("https://example.com/stream.m3u8");

// Load with multiple strategies
await player.loadVideoWithFallback({
  url: "https://example.com/video.mp4",
  title: "Test Video",
  isHLS: false,
});
```

## Debugging logs

The application includes detailed logging:

- ✅ HLS.js loading status
- ✅ Success/failure of each strategy
- ✅ HLS error details
- ✅ Connectivity information

Check the browser console (F12) for detailed technical information.

## Performance optimizations

### Implemented optimizations:

- **Batch rendering** - Renders playlist in chunks to avoid UI blocking
- **Smart preloading** - Preloads logos in background
- **Debounced search** - Prevents excessive search operations
- **Memory filtering** - Filters data in memory instead of DOM manipulation
- **RequestAnimationFrame** - Uses browser optimization for smooth updates

### Search optimization:

```javascript
// Optimized search with debouncing
debouncedSearch() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
        this.handleSearch();
    }, 150);
}
```

## Cache troubleshooting

### If changes don't appear:

1. **Use Ctrl+Shift+R** for hard refresh
2. **Clear browser cache** in settings
3. **Use development mode** with `npm run dev-nocache`
4. **Check file timestamps** to ensure changes are saved

### Electron-specific:

- Use "View → Hard Reload (ignore cache)" from menu
- Clear cache from "View → Clear Cache"
- Restart application completely

## Error codes and meanings

### Common error messages:

- **"CORS error"** - Server blocks cross-origin access
- **"Network error"** - Connection problem or invalid URL
- **"Format not supported"** - Video codec not compatible
- **"Timeout"** - Stream took too long to respond
- **"Authentication required"** - Stream needs login/token

### HLS-specific errors:

- **"Manifest not found"** - .m3u8 file not accessible
- **"Segments not available"** - Video chunks missing
- **"Decoder error"** - Video format problem

Remember: Many limitations are due to web security policies, not application bugs. For professional IPTV use, consider native desktop applications.
