# 🛠️ M3U Player - Troubleshooting Guide

## Common Issues and Solutions

### 🎥 Video Playback Issues

#### Stream Not Playing

1. **Test the stream first**:

   - Use the "🔧 Test Stream" button for diagnostics
   - Check console (F12) for detailed error information
   - Verify the stream is publicly accessible
   - IPTV-ORG button downloads real channels from official repository
   - Internet connection required for initial download

2. **Check stream format**:

   - HLS streams (.m3u8) require internet connection
   - Direct video files (MP4, WebM) should work offline
   - Some streams may require specific headers

3. **Network issues**:
   - Verify internet connection for online streams
   - Check if the stream URL is still valid
   - Some streams may be geo-blocked
   - IPTV-ORG button works offline after initial download

#### Video Quality Issues

1. **Adjust video filters**:

   - Use brightness/contrast controls
   - Click "🔄 Reset" to restore defaults
   - Check if the original stream has quality issues

2. **Performance optimization**:
   - Close other applications to free memory
   - Use hardware acceleration if available
   - Lower video quality if stream supports it

### 📋 Playlist Issues

#### No Channels Showing

1. **Verify M3U format**:

   - Ensure the file starts with `#EXTM3U`
   - Check that each entry has `#EXTINF:` line
   - Verify URLs are properly formatted

2. **File encoding**:

   - Ensure the file is UTF-8 encoded
   - Check for special characters that might break parsing
   - Try with the included test files first

3. **URL accessibility**:
   - Test if URLs in the playlist are accessible
   - Check for authentication requirements
   - Verify the playlist URL is still active

#### IPTV-ORG Button Issues

1. **Download IPTV-ORG button**:

   - Downloads latest playlist from iptv-org.github.io
   - Requires internet connection for download
   - Button changes to "Play IPTV-ORG" after successful download

2. **Play IPTV-ORG button**:

   - Loads previously downloaded IPTV-ORG playlist
   - Works offline once playlist is downloaded
   - Shows channel count in button text

3. **Expected behavior**:
   - First time: Shows "Download IPTV-ORG"
   - After download: Shows "Play IPTV-ORG (X channels)"
   - Button is disabled during download process

#### Logos Not Displaying

1. **Check logo URLs**:

   - Verify logo URLs are accessible
   - Ensure URLs use HTTPS when possible
   - Check if logos are in supported formats (PNG, JPG, SVG)

2. **Network restrictions**:
   - Some logo servers may block requests
   - CORS policies might prevent loading
   - Try with different logo sources

### ⚙️ Application Issues

#### Interface Not Responding

1. **Force refresh**:

   - Use Ctrl+Shift+R (Cmd+Shift+R on Mac)
   - Click the "🔄 Refresh" button
   - Restart the application

2. **Clear cache**:
   - See [Cache Troubleshooting Guide](CACHE-TROUBLESHOOTING.md)
   - Use development mode: `npm run dev`
   - Clear browser data if using web version

#### Control Elements Not Working

1. **Time display issues**:

   - Check if video is properly loaded
   - Verify console (F12) for JavaScript errors
   - Ensure video has valid duration metadata
   - Time display should show "00:00 / 00:00" format in rounded container

2. **Button controls not responding**:

   - Check if video player is initialized
   - Verify event listeners are attached
   - Try reloading the video
   - Buttons should have dark gray gradients with subtle hover effects

3. **Professional dark interface features**:

   - Controls use consistent dark theme with gray gradients
   - Two-row layout: main controls (play/pause/etc) and secondary (sliders/time)
   - Minimal rounded corners (8-10px) for professional appearance
   - Subtle hover effects without excessive animations
   - PiP button shows red accent when active with subtle pulse
   - Professional terminology (Play/Pause, minimal emojis)

4. **Slider controls (volume/brightness)**:
   - Ensure video element is accessible
   - Check for CSS conflicts
   - Verify JavaScript is not blocked

#### Configuration Problems

1. **Reset settings**:

   - Use "⚙️ Settings" → "🔄 Reset"
   - Delete configuration files manually
   - Restart with default settings

2. **Check file permissions**:
   - Ensure the application can write to config directory
   - Check if antivirus is blocking file access
   - Run with appropriate permissions

### 🔧 Development Issues

#### Build Problems

1. **Dependencies**:

   - Run `npm install` to ensure all packages are installed
   - Check Node.js version compatibility
   - Clear node_modules and reinstall if needed

2. **Platform-specific issues**:
   - Check platform-specific build requirements
   - Verify Electron version compatibility
   - Review build logs for specific errors

#### Performance Issues

1. **Memory usage**:

   - Monitor memory consumption in Task Manager
   - Close unused applications
   - Restart the application periodically

2. **CPU usage**:
   - Check for infinite loops in console
   - Disable hardware acceleration if causing issues
   - Update graphics drivers

### � Auttomatic Updates

#### IPTV-ORG Playlist Updates

1. **Automatic updates on startup**:

   - App automatically downloads latest IPTV-ORG playlist
   - Updates saved locally for offline use
   - Fallback to local file if update fails

2. **Update issues**:
   - Check internet connection for automatic updates
   - Console shows update status messages
   - Local backup ensures functionality even offline

### 📞 Getting Help

#### Before Reporting Issues

1. **Check console logs**:

   - Open DevTools (F12)
   - Look for error messages in Console tab
   - Check Network tab for failed requests
   - Look for IPTV-ORG update messages

2. **Gather information**:
   - Operating system and version
   - Application version
   - Steps to reproduce the issue
   - Error messages or screenshots

#### Where to Get Help

1. **GitHub Issues**: Report bugs and feature requests
2. **Documentation**: Check other guides in the docs/ folder
3. **Community**: Use GitHub Discussions for questions

### 🔍 Diagnostic Tools

#### Built-in Diagnostics

- **Stream Test**: Use "🔧" button on any channel
- **Console Logs**: F12 → Console for detailed information
- **Network Monitor**: F12 → Network to check requests

#### External Tools

- **VLC Media Player**: Test streams independently
- **Browser Developer Tools**: For web-based testing
- **Network analyzers**: For connection issues

### 📋 Quick Fixes Checklist

- [ ] Restart the application
- [ ] Clear cache (Ctrl+Shift+R)
- [ ] Test with included sample files
- [ ] Check internet connection
- [ ] Verify file permissions
- [ ] Update to latest version
- [ ] Check console for errors
- [ ] Try different stream sources

---

**Note**: If you continue experiencing issues, please create a GitHub issue with detailed information about your problem, including console logs and steps to reproduce.
