# M3U Player

A modern, professional IPTV player built with Electron that bypasses CORS limitations found in web browsers.

![M3U Player](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)

## ✨ Features

- 🚀 **No CORS limitations** - Play streams that fail in web browsers
- 📁 **Complete M3U parser** - Support for metadata, groups, logos, and TVG attributes
- 🎥 **Multiple formats** - MP4, WebM, HLS (.m3u8) and more
- 🔧 **Integrated diagnostics** - Test streams before playing
- ⚙️ **Advanced configuration** - Custom headers, User-Agent, Referer
- 📱 **Modern interface** - Responsive design with dark theme
- 💾 **Export playlists** - Save modified lists
- 🔍 **Advanced search** - Filter by name, group, or type with instant results
- 📺 **Picture-in-Picture** - Floating window playback
- ⛶ **Fullscreen mode** - Immersive experience
- ☀️ **Video controls** - Real-time brightness and contrast adjustment

## 🚀 Quick Start

### Option 1: Automatic Setup (Recommended)
```bash
# Clone the repository
git clone https://github.com/yourusername/m3u-player.git
cd m3u-player

# Run automatic setup script
./scripts/start.sh
```

### Option 2: Manual Setup
```bash
# Install dependencies
npm install

# Start the application
npm start
```

### Option 3: Development Mode
```bash
# Development mode with DevTools
npm run dev
```

## 📖 How to Use

1. **Open M3U file**:
   - Use "📁 Open Local File" button
   - Or drag & drop an .m3u/.m3u8 file into the window

2. **Load from URL**:
   - Click "🌐 Load from URL"
   - Paste your M3U playlist URL

3. **Test functionality**:
   - Click "🧪 Test File" to load sample content

4. **Playback**:
   - Click any channel from the list
   - Channel logos are displayed automatically when available
   - Use playback controls
   - Click "🔧" button to test stream connectivity

## 🖼️ Channel Logo Support

The application automatically supports channel logos defined in M3U files:

```m3u
#EXTINF:-1 tvg-logo="https://example.com/logo.png" group-title="News",News Channel
https://example.com/stream.m3u8
```

**Logo features:**
- ✅ Automatic loading from URLs
- ✅ Placeholder with icon if no logo
- ✅ Error handling (fallback to icon)
- ✅ Smart preloading for better performance
- ✅ Responsive design

## 🎮 Advanced Controls

### Playback Controls:
- **⏮️ ⏯️ ⏭️** - Basic navigation
- **📺 PiP** - Picture-in-Picture (floating window)
- **⛶ Fullscreen** - Fullscreen mode
- **☀️ Brightness** - Adjust video brightness
- **🔆 Contrast** - Improve image definition

### Keyboard Shortcuts:
- **Space** - Play/Pause
- **P** - Toggle Picture-in-Picture
- **F** - Toggle fullscreen
- **+/-** - Adjust brightness
- **↑/↓** - Volume control
- **M** - Mute

### Search & Filtering:
- **Instant search** - Search by name, group, or type
- **Group filtering** - Filter by channel groups
- **Type filtering** - Filter by stream type (HLS, Direct, Stream)
- **Sorting** - Alphabetical sorting (A-Z, Z-A)
- **Channel counter** - Shows filtered/total channels

## 🏗️ Project Structure

```
m3u-player/
├── src/                    # Source code
│   ├── index.html         # Main HTML file
│   ├── js/                # JavaScript files
│   │   └── main.js        # Main application logic
│   └── styles/            # CSS files
│       └── main.css       # Main stylesheet
├── examples/              # Sample M3U files
│   ├── basic-test.m3u     # Basic test videos
│   ├── test-streams.m3u   # HLS test streams
│   └── sample.m3u         # Additional samples
├── docs/                  # Documentation
│   ├── README.md          # User guide
│   ├── DEBUG.md           # Debugging guide
│   └── TROUBLESHOOTING.md # Technical troubleshooting
├── scripts/               # Build and utility scripts
├── build/                 # Build configuration
├── assets/                # Static assets
├── main.js                # Electron main process
├── preload.js             # Electron preload script
└── package.json           # Project configuration
```

## 🔧 Building for Distribution

### Create executables:
```bash
# For all platforms
npm run build

# Package only (no installer)
npm run pack

# Specific distribution
npm run dist
```

### Supported platforms:
- 🍎 **macOS** - .dmg and .app
- 🪟 **Windows** - .exe and NSIS installer
- 🐧 **Linux** - AppImage and .deb

## 🛠️ Development

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Development workflow:
```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Run without cache (for development)
npm run dev-nocache

# Clear cache and run
npm run clear-cache
```

### Code structure:
- **Modern ES6+** JavaScript
- **Modular CSS** with dark theme
- **Electron** for desktop integration
- **HLS.js** for HLS stream support

## 📋 Supported Formats

### Video formats:
- **Direct streams**: MP4, WebM, OGG
- **HLS streams**: .m3u8 with automatic HLS.js integration
- **Live streams**: IPTV and other streaming protocols

### M3U features:
- Complete M3U/M3U8 parsing
- TVG attributes (tvg-logo, tvg-id, tvg-name)
- Group organization
- Duration information
- Custom metadata

## 🐛 Troubleshooting

### Common issues:

1. **Stream not playing**:
   - Use the "🔧 Test Stream" button for diagnostics
   - Check console (F12) for detailed error information
   - Verify the stream is publicly accessible

2. **No channels showing**:
   - Ensure the M3U file format is correct
   - Check that URLs in the playlist are valid
   - Try with the included test files

3. **Performance issues**:
   - Use Ctrl+Shift+R for hard refresh
   - Clear application cache
   - Check available system memory

For detailed troubleshooting, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [HLS.js](https://github.com/video-dev/hls.js/) for HLS stream support
- [Electron](https://www.electronjs.org/) for desktop application framework
- Sample videos from [Google Cloud Storage](https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/)

## 📞 Support

- 📖 **Documentation**: Check the [docs/](docs/) folder
- 🐛 **Issues**: Report bugs via GitHub Issues
- 💬 **Discussions**: Use GitHub Discussions for questions

---

**Note**: This player is designed for legitimate IPTV content and personal use. Ensure you have proper rights to access any streams you play.