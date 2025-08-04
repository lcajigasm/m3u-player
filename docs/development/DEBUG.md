# 🔧 Debugging Guide - M3U Player

## 🎯 Common Issues and Solutions

### ❌ "Player doesn't play any channel"

**Most common causes:**

1. **CORS (Cross-Origin Resource Sharing)**
   - Most IPTV streams block access from browsers
   - **Solution**: This is why we use Electron - it bypasses CORS
   - **Alternative**: Use native applications like VLC for web-restricted content

2. **Streams requiring authentication**
   - Many IPTV channels require tokens or login
   - **Solution**: Only public streams work without authentication

3. **Geo-blocking**
   - Content blocked by geographic region
   - **Solution**: Not resolvable from the application

### ✅ What DOES work

**Compatible streams:**
- ✅ Direct MP4 videos (like Google Cloud Storage test videos)
- ✅ Public HLS streams without restrictions
- ✅ Content without CORS protection

**Included test files:**
- `examples/basic-test.m3u` - Guaranteed working videos
- `examples/test-streams.m3u` - HLS test streams

## 🛠️ Step-by-step diagnosis

### 1. Verify the application works
```
1. Open the application
2. Load examples/basic-test.m3u
3. Should show 3 videos and play correctly
```

### 2. If test videos DON'T work
- Problem with browser or JavaScript
- Check browser console (F12)
- Verify HLS.js loads correctly

### 3. If test videos DO work but your M3U doesn't
- The problem is with specific streams in your file
- Use the "🔧 Test Stream" button for diagnosis
- Messages will tell you if it's CORS, timeout, etc.

## 📊 Technical debugging information

**Console logs (F12):**
```
✅ HLS.js loaded              - Library working
🎬 Starting M3U player       - App started  
📋 X elements in playlist    - File parsed
🎬 Loading: [name]           - Attempting to load stream
✅ Stream loaded correctly   - Success
❌ HLS Error: [details]      - Specific problem
```

## 🚀 Improvements implemented vs original problems

### Before (problems):
- ❌ Complex code with multiple failed strategies
- ❌ Unnecessary blob URL handling
- ❌ Problematic crossorigin configurations
- ❌ Very long timeouts
- ❌ Confusing error handling

### Now (solutions):
- ✅ Simplified and clear code
- ✅ HLS.js only when necessary
- ✅ Native fallback for HLS when possible
- ✅ Reasonable timeouts (10s direct, 15s HLS)
- ✅ Clear error messages with emojis
- ✅ Detailed logging for debugging
- ✅ Auto-advance when a stream fails

## 📋 Troubleshooting checklist

**Before reporting issues:**

1. ✅ Does it work with `examples/basic-test.m3u`?
2. ✅ Do logs appear in the console?
3. ✅ What does the "🔧 Test Stream" button say?
4. ✅ Is it a public stream without authentication?
5. ✅ Have you tried in another browser?

## 🎯 Realistic expectations

**What you CAN expect:**
- ✅ Play direct MP4/WebM videos
- ✅ Public HLS streams without restrictions  
- ✅ Complete parsing of M3U files
- ✅ Modern and easy-to-use interface
- ✅ Clear diagnosis of problems

**What you CANNOT expect:**
- ❌ Play any commercial IPTV stream
- ❌ Bypass strict CORS server protections
- ❌ Streams requiring specific applications
- ❌ Content with geo-blocking or authentication

## 🔍 Advanced debugging

**For developers:**

```javascript
// In browser console
const player = window.player; // If exposed globally

// View parsed playlist
console.log(player.playlistData);

// Test stream manually
await player.loadHLSStream('https://m3u-player.eu/stream.m3u8');

// View HLS state
console.log(player.hls);
```

## 📞 Support

If after following this guide you still have problems:

1. **Check console logs** (F12)
2. **Specify which streams you're trying to play**
3. **Confirm you tested with included test files**
4. **Indicate which browser and version you use**

**Remember**: The main limitation is not technical but web security policies. For professional IPTV use, consider native applications like VLC, Kodi, or desktop IPTVnator.